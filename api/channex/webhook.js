// Vercel API Route для Channex webhook
// URL: https://pms.voda.center/api/channex/webhook

import { createClient } from '@supabase/supabase-js';

// Инициализация Supabase клиента
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://qflncrldkqhmmrnepdpk.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmbG5jcmxka3FobW1ybmVwZHBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE4NTc2NDMsImV4cCI6MjA0NzQzMzY0M30.8oFOjJQOZT7eFwHPsKV-JdXlC0KfQgUKFw7lIRl3zEc'
);

export default async function handler(req, res) {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Только POST запросы для webhook
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🔔 Получен webhook от Channex:', {
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // Проверяем авторизацию webhook
  const webhookSecret = process.env.VITE_CHANNEX_WEBHOOK_SECRET;
  if (webhookSecret && webhookSecret !== 'your-webhook-secret') {
    const authHeader = req.headers['authorization'] || req.headers['x-webhook-token'] || req.headers['x-channex-token'];
    if (!authHeader) {
      console.log('⚠️  Webhook получен без заголовка авторизации (staging режим - продолжаем)');
    } else if (authHeader !== `Bearer ${webhookSecret}` && authHeader !== webhookSecret) {
      console.log('❌ Неверный токен авторизации webhook');
      return res.status(401).json({ error: 'Invalid authorization token' });
    } else {
      console.log('✅ Авторизация webhook проверена успешно');
    }
  }

  try {
    const webhookData = req.body;
    
    // Извлекаем данные из webhook
    const eventType = webhookData.type || 'unknown';
    const eventId = webhookData.id || '';
    const objectType = webhookData.object_type || '';
    const objectId = webhookData.object_id || '';
    
    console.log('📋 Обработка webhook:', {
      eventType,
      eventId,
      objectType,
      objectId
    });

    // Сохраняем webhook в БД для отладки
    try {
      const { error: logError } = await supabase
        .from('channex_webhooks')
        .insert({
          event_type: eventType,
          event_id: eventId,
          object_type: objectType,
          object_id: objectId,
          payload: webhookData,
          received_at: new Date().toISOString(),
          processed: false
        });

      if (logError) {
        console.error('❌ Ошибка сохранения webhook:', logError);
      } else {
        console.log('✅ Webhook сохранен в БД');
      }
    } catch (dbError) {
      console.error('❌ Ошибка подключения к БД:', dbError);
    }

    // Обрабатываем разные типы событий
    if (objectType === 'booking') {
      await handleBookingEvent(eventType, objectId, webhookData);
    } else if (objectType === 'booking_revision') {
      await handleBookingRevisionEvent(eventType, objectId, webhookData);
    } else {
      console.log('ℹ️ Неизвестный тип объекта:', objectType);
    }

    // Отмечаем webhook как обработанный
    if (eventId) {
      try {
        await supabase
          .from('channex_webhooks')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('event_id', eventId);
      } catch (updateError) {
        console.error('❌ Ошибка обновления статуса webhook:', updateError);
      }
    }

    // Возвращаем успешный ответ Channex (обязательно!)
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully',
      event_id: eventId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Ошибка обработки webhook:', error);
    
    // Логируем ошибку в БД
    try {
      await supabase
        .from('channex_webhook_errors')
        .insert({
          error_message: error.message,
          error_stack: error.stack,
          payload: req.body,
          occurred_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('❌ Ошибка логирования:', logError);
    }

    // Возвращаем ошибку (Channex повторит попытку)
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * Обработка событий бронирований
 */
async function handleBookingEvent(eventType, bookingId, webhookData) {
  console.log(`📋 Обработка booking event: ${eventType} для ID ${bookingId}`);

  try {
    // Получаем полные данные бронирования от Channex API
    const response = await fetchBookingFromChannex(bookingId);
    
    if (response && response.data) {
      const booking = response.data;
      await syncBookingToPMS(booking, eventType);
      console.log(`✅ Бронирование ${bookingId} синхронизировано`);
    } else {
      console.warn(`⚠️ Не удалось получить данные бронирования ${bookingId}`);
    }

  } catch (error) {
    console.error(`❌ Ошибка обработки booking event:`, error);
  }
}

/**
 * Обработка событий ревизий бронирований
 */
async function handleBookingRevisionEvent(eventType, revisionId, webhookData) {
  console.log(`📝 Обработка booking revision: ${eventType} для revision ${revisionId}`);

  try {
    // Для ревизий можем использовать данные из webhook или запросить полную информацию
    if (webhookData.data && webhookData.data.booking) {
      await syncBookingToPMS(webhookData.data.booking, eventType);
    } else {
      // Запрашиваем полные данные ревизии
      const response = await fetchBookingRevisionFromChannex(revisionId);
      if (response && response.data && response.data.booking) {
        await syncBookingToPMS(response.data.booking, eventType);
      }
    }

  } catch (error) {
    console.error(`❌ Ошибка обработки booking revision:`, error);
  }
}

/**
 * Получение данных бронирования из Channex API
 */
async function fetchBookingFromChannex(bookingId) {
  const apiKey = process.env.VITE_CHANNEX_API_KEY;
  const apiUrl = process.env.VITE_CHANNEX_API_URL || 'https://staging.channex.io/api/v1';
  
  if (!apiKey) {
    console.warn('⚠️ CHANNEX_API_KEY не настроен, используем mock данные');
    return null;
  }

  try {
    console.log(`🌐 Запрос данных бронирования ${bookingId} из Channex`);
    
    const response = await fetch(`${apiUrl}/bookings/${bookingId}`, {
      headers: {
        'user-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return await response.json();
    } else {
      console.error(`❌ Ошибка API Channex: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error('❌ Ошибка запроса к Channex API:', error);
    return null;
  }
}

/**
 * Получение данных ревизии бронирования из Channex API
 */
async function fetchBookingRevisionFromChannex(revisionId) {
  const apiKey = process.env.VITE_CHANNEX_API_KEY;
  const apiUrl = process.env.VITE_CHANNEX_API_URL || 'https://staging.channex.io/api/v1';
  
  if (!apiKey) {
    console.warn('⚠️ CHANNEX_API_KEY не настроен');
    return null;
  }

  try {
    console.log(`🌐 Запрос данных ревизии ${revisionId} из Channex`);
    
    const response = await fetch(`${apiUrl}/booking_revisions/${revisionId}`, {
      headers: {
        'user-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return await response.json();
    } else {
      console.error(`❌ Ошибка API Channex: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error('❌ Ошибка запроса к Channex API:', error);
    return null;
  }
}

/**
 * Синхронизация бронирования в PMS
 */
async function syncBookingToPMS(channexBooking, eventType) {
  console.log('📥 Синхронизация бронирования в PMS:', channexBooking.id);

  try {
    // Маппим данные из Channex в формат PMS
    const pmsBooking = mapChannexToPMSBooking(channexBooking);

    // Проверяем, существует ли уже это бронирование
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id')
      .eq('external_booking_id', channexBooking.id)
      .single();

    if (existingBooking) {
      // Обновляем существующее бронирование
      const { error } = await supabase
        .from('bookings')
        .update({
          ...pmsBooking,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingBooking.id);

      if (error) {
        console.error('❌ Ошибка обновления бронирования:', error);
      } else {
        console.log(`✅ Бронирование ${channexBooking.id} обновлено`);
      }

    } else {
      // Создаем новое бронирование
      const { error } = await supabase
        .from('bookings')
        .insert({
          ...pmsBooking,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Ошибка создания бронирования:', error);
      } else {
        console.log(`✅ Бронирование ${channexBooking.id} создано`);
      }
    }

  } catch (error) {
    console.error('❌ Ошибка синхронизации бронирования:', error);
  }
}

/**
 * Маппинг данных бронирования из Channex в формат PMS
 */
function mapChannexToPMSBooking(channexBooking) {
  const attributes = channexBooking.attributes || channexBooking;
  
  return {
    external_booking_id: channexBooking.id,
    source: getBookingSource(attributes.ota_name),
    check_in: attributes.arrival_date,
    check_out: attributes.departure_date,
    guest_details: {
      full_name: attributes.customer?.name || attributes.guest_name || 'Guest',
      email: attributes.customer?.email || attributes.guest_email || '',
      phone: attributes.customer?.phone || attributes.guest_phone || ''
    },
    total_amount: parseFloat(attributes.total_price) || 0,
    status: mapBookingStatus(attributes.status),
    guests_count: (attributes.occupancy?.adults || 0) + (attributes.occupancy?.children || 0),
    notes: attributes.notes || attributes.special_requests || '',
    room_type: attributes.room_type?.title || '',
    channex_data: channexBooking // Сохраняем оригинальные данные
  };
}

/**
 * Маппинг источника бронирования
 */
function getBookingSource(otaName) {
  if (!otaName) return 'other';
  
  const mapping = {
    'Booking.com': 'booking',
    'Airbnb': 'airbnb',
    'Expedia': 'expedia',
    'Agoda': 'agoda',
    'Hotels.com': 'hotels',
    'Direct': 'direct'
  };
  
  return mapping[otaName] || 'other';
}

/**
 * Маппинг статуса бронирования
 */
function mapBookingStatus(channexStatus) {
  if (!channexStatus) return 'pending';
  
  const mapping = {
    'new': 'pending',
    'confirmed': 'confirmed',
    'cancelled': 'cancelled',
    'modified': 'confirmed',
    'pending': 'pending'
  };
  
  return mapping[channexStatus.toLowerCase()] || 'pending';
}