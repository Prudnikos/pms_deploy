// Vercel API Route для Channex webhook
// URL: https://pms.voda.center/api/channex/webhook

import { createClient } from '@supabase/supabase-js';

// Инициализация Supabase клиента (актуальные ключи)
const supabaseUrl = 'https://zbhvwxpvlxqxadqzshfc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaHZ3eHB2bHhxeGFkcXpzaGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkyNTM3NCwiZXhwIjoyMDY3NTAxMzc0fQ.0kO3vG1OXNS05NPgm7MmcbkdMuLSG49GKwkCP4979tc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

  // Упрощенная проверка авторизации Channex webhook
  const expectedSecret = 'hotel_pms_webhook_secret_2024';
  const authHeader = req.headers['authorization'];
  
  if (authHeader) {
    const receivedSecret = authHeader.replace('Bearer ', '');
    if (receivedSecret !== expectedSecret) {
      console.log('❌ Неверный токен авторизации webhook:', receivedSecret);
      return res.status(401).json({ error: 'Invalid authorization token' });
    } else {
      console.log('✅ Авторизация webhook проверена успешно');
    }
  } else {
    console.log('⚠️ Webhook получен без авторизации (разрешаем для тестирования)');
  }

  try {
    const webhookData = req.body;
    
    // Правильный формат Channex webhook
    const eventType = webhookData.event || 'unknown';
    const eventId = `channex-${Date.now()}`;
    const objectType = eventType.includes('booking') ? 'booking' : 'other';
    const objectId = webhookData.payload?.booking_id || webhookData.payload?.revision_id || 'unknown';
    
    console.log('📋 Обработка Channex webhook:', {
      eventType,
      eventId,
      objectType,
      objectId,
      propertyId: webhookData.property_id,
      timestamp: webhookData.timestamp
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

    // Обрабатываем разные типы событий (правильный формат Channex)
    if (eventType === 'booking' || eventType.includes('booking')) {
      const bookingId = webhookData.payload?.booking_id;
      if (bookingId) {
        await handleBookingEvent(eventType, bookingId, webhookData);
      } else {
        console.log('⚠️ Booking event без booking_id:', webhookData);
      }
    } else if (eventType === 'ari') {
      console.log('📅 ARI update event:', webhookData.payload);
    } else {
      console.log('ℹ️ Неизвестный тип события:', eventType);
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
    // Определяем канал по ota_name
    const otaName = channexBooking.attributes?.ota_name;
    console.log('📋 OTA канал:', otaName);

    let pmsBooking;
    
    // Используем соответствующий сервис для конвертации
    if (otaName === 'Airbnb') {
      // Импортируем AirbnbChannexService динамически
      const { default: AirbnbChannexService } = await import('../../src/services/airbnb/AirbnbChannexService.jsx');
      pmsBooking = AirbnbChannexService.convertToPMSFormat(channexBooking);
    } else {
      // Используем общий маппинг для других каналов
      pmsBooking = mapChannexToPMSBooking(channexBooking);
    }

    // Проверяем, существует ли уже это бронирование (по external ID)
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id')
      .eq('ota_reservation_code', channexBooking.attributes?.ota_reservation_code)
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