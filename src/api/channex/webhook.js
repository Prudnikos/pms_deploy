import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  console.log('🔔 Получен webhook от Channex:', req.body);
  
  try {
    const webhookData = req.body;
    const { event, payload, property_id, timestamp } = webhookData;
    
    // Сохраняем webhook в БД для отладки
    await supabase
      .from('channex_webhooks')
      .insert({
        event_type: event,
        payload: payload,
        property_id: property_id,
        received_at: timestamp,
        processed: false
      });
    
    // Обрабатываем разные типы событий
    switch (event) {
      case 'booking':
        await handleBookingWebhook(payload);
        break;
        
      case 'booking_new':
        await handleNewBooking(payload);
        break;
        
      case 'booking_modification':
        await handleBookingModification(payload);
        break;
        
      case 'booking_cancellation':
        await handleBookingCancellation(payload);
        break;
        
      case 'ari':
        await handleARIUpdate(payload);
        break;
        
      default:
        console.log('Неизвестный тип webhook:', event);
    }
    
    // Отмечаем webhook как обработанный
    await supabase
      .from('channex_webhooks')
      .update({ processed: true })
      .eq('property_id', property_id)
      .eq('received_at', timestamp);
    
    res.status(200).json({ success: true, message: 'Webhook processed' });
    
  } catch (error) {
    console.error('Ошибка обработки webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Обработчики для разных типов событий
async function handleBookingWebhook(payload) {
  console.log('📋 Обрабатываем booking webhook:', payload);
  
  try {
    // Получаем полные данные бронирования от Channex
    const response = await fetch(`https://staging.channex.io/api/v1/booking_revisions/${payload.revision_id}`, {
      headers: {
        'user-api-key': process.env.VITE_CHANNEX_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const bookingData = await response.json();
      await syncBookingToPMS(bookingData.data);
    }
    
  } catch (error) {
    console.error('Ошибка обработки booking webhook:', error);
  }
}

async function handleNewBooking(payload) {
  console.log('➕ Новое бронирование:', payload);
  // Аналогично handleBookingWebhook
}

async function handleBookingModification(payload) {
  console.log('✏️ Изменение бронирования:', payload);
  // Обновляем существующее бронирование
}

async function handleBookingCancellation(payload) {
  console.log('❌ Отмена бронирования:', payload);
  
  // Обновляем статус в БД
  await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('external_booking_id', payload.booking_id);
}

async function handleARIUpdate(payload) {
  console.log('📅 Обновление ARI (цены/доступность):', payload);
  // Здесь можно синхронизировать изменения цен и доступности
}

async function syncBookingToPMS(channexBooking) {
  // Маппим данные из Channex в формат вашей БД
  const pmsBooking = {
    external_booking_id: channexBooking.id,
    source: getBookingSource(channexBooking.attributes.ota_name),
    check_in: channexBooking.attributes.arrival_date,
    check_out: channexBooking.attributes.departure_date,
    guest_name: channexBooking.attributes.customer?.name,
    guest_email: channexBooking.attributes.customer?.email,
    guest_phone: channexBooking.attributes.customer?.phone,
    total_amount: channexBooking.attributes.total_price,
    status: mapBookingStatus(channexBooking.attributes.status),
    channex_data: channexBooking
  };
  
  // Проверяем, существует ли уже это бронирование
  const { data: existingBooking } = await supabase
    .from('bookings')
    .select('id')
    .eq('external_booking_id', channexBooking.id)
    .single();
  
  if (existingBooking) {
    // Обновляем существующее
    await supabase
      .from('bookings')
      .update(pmsBooking)
      .eq('id', existingBooking.id);
  } else {
    // Создаем новое
    await supabase
      .from('bookings')
      .insert(pmsBooking);
  }
}

function getBookingSource(otaName) {
  const mapping = {
    'Booking.com': 'booking',
    'Airbnb': 'airbnb',
    'Expedia': 'expedia',
    'Direct': 'direct'
  };
  return mapping[otaName] || 'other';
}

function mapBookingStatus(channexStatus) {
  const mapping = {
    'new': 'pending',
    'confirmed': 'confirmed',
    'cancelled': 'cancelled',
    'modified': 'confirmed'
  };
  return mapping[channexStatus] || 'pending';
}