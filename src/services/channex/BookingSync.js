// Синхронизация бронирований С вашей платформы В Channex
import { channexApiRequest } from './ChannexService.js';
import { supabase } from '@/lib/supabase';

/**
 * Отправка нового бронирования в Channex
 */
export async function createBookingInChannex(booking) {
  console.log('📤 Отправляем бронирование в Channex:', booking.id);
  
  try {
    // Маппим данные из PMS в формат Channex
    const channexBooking = mapPMSToChannexBooking(booking);
    
    // Отправляем в Channex API
    const response = await channexApiRequest('POST', '/booking_revisions', {
      booking_revision: channexBooking
    });
    
    if (response && response.data) {
      console.log('✅ Бронирование отправлено в Channex:', response.data.id);
      
      // Сохраняем ID из Channex в нашу БД
      await supabase
        .from('bookings')
        .update({ 
          external_booking_id: response.data.id,
          channex_data: response.data
        })
        .eq('id', booking.id);
        
      return response.data;
    }
    
    throw new Error('Нет данных в ответе от Channex');
    
  } catch (error) {
    console.error('❌ Ошибка отправки бронирования в Channex:', error);
    throw error;
  }
}

/**
 * Обновление бронирования в Channex
 */
export async function updateBookingInChannex(booking) {
  if (!booking.external_booking_id) {
    throw new Error('Нет external_booking_id для обновления в Channex');
  }
  
  console.log('📝 Обновляем бронирование в Channex:', booking.external_booking_id);
  
  try {
    const channexBooking = mapPMSToChannexBooking(booking);
    
    const response = await channexApiRequest('PUT', `/booking_revisions/${booking.external_booking_id}`, {
      booking_revision: channexBooking
    });
    
    if (response && response.data) {
      console.log('✅ Бронирование обновлено в Channex');
      
      // Обновляем данные в БД
      await supabase
        .from('bookings')
        .update({ 
          channex_data: response.data
        })
        .eq('id', booking.id);
        
      return response.data;
    }
    
    throw new Error('Нет данных в ответе от Channex');
    
  } catch (error) {
    console.error('❌ Ошибка обновления бронирования в Channex:', error);
    throw error;
  }
}

/**
 * Отмена бронирования в Channex
 */
export async function cancelBookingInChannex(booking) {
  if (!booking.external_booking_id) {
    throw new Error('Нет external_booking_id для отмены в Channex');
  }
  
  console.log('❌ Отменяем бронирование в Channex:', booking.external_booking_id);
  
  try {
    const response = await channexApiRequest('PUT', `/booking_revisions/${booking.external_booking_id}`, {
      booking_revision: {
        status: 'cancelled'
      }
    });
    
    if (response) {
      console.log('✅ Бронирование отменено в Channex');
      
      // Обновляем статус в БД
      await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          channex_data: response.data
        })
        .eq('id', booking.id);
        
      return response.data;
    }
    
  } catch (error) {
    console.error('❌ Ошибка отмены бронирования в Channex:', error);
    throw error;
  }
}

/**
 * Маппинг данных из PMS в формат Channex
 */
function mapPMSToChannexBooking(booking) {
  return {
    // Основная информация
    arrival_date: booking.check_in,
    departure_date: booking.check_out,
    status: mapPMSStatusToChannex(booking.status),
    
    // Информация о госте
    customer: {
      name: booking.guest_name || booking.guest?.full_name,
      email: booking.guest_email || booking.guest?.email,
      phone: booking.guest_phone || booking.guest?.phone
    },
    
    // Финансы
    total_price: booking.total_amount || 0,
    currency: 'RUB',
    
    // Размещение
    occupancy: {
      adults: booking.guests_count || 1,
      children: 0
    },
    
    // Дополнительно
    notes: booking.notes,
    
    // Комната (если есть маппинг)
    room_type_id: booking.room?.channex_room_id || null,
    
    // Источник
    ota_name: 'Direct'
  };
}

/**
 * Маппинг статусов из PMS в Channex
 */
function mapPMSStatusToChannex(pmsStatus) {
  const mapping = {
    'pending': 'new',
    'confirmed': 'confirmed', 
    'checked_in': 'confirmed',
    'checked_out': 'confirmed',
    'cancelled': 'cancelled'
  };
  
  return mapping[pmsStatus] || 'new';
}

/**
 * Получение маппинга комнат из Channex
 */
export async function getRoomMapping() {
  try {
    const { data, error } = await supabase
      .from('channex_room_mapping')
      .select('room_id, channex_room_id');
      
    if (error) throw error;
    
    // Преобразуем в объект для быстрого поиска
    const mapping = {};
    data.forEach(item => {
      mapping[item.room_id] = item.channex_room_id;
    });
    
    return mapping;
  } catch (error) {
    console.error('❌ Ошибка загрузки маппинга комнат:', error);
    return {};
  }
}