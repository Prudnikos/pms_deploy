/**
 * Тестирование синхронизации существующего бронирования из Channex в PMS
 */

const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Загружаем переменные окружения
config({ path: '.env.local' });

// Настройка Supabase (используем те же credentials, что и в основном приложении)
const supabaseUrl = 'https://zbhvwxpvlxqxadqzshfc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaHZ3eHB2bHhxeGFkcXpzaGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkyNTM3NCwiZXhwIjoyMDY3NTAxMzc0fQ.0kO3vG1OXNS05NPgm7MmcbkdMuLSG49GKwkCP4979tc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Настройка Channex API
const CHANNEX_API_URL = 'https://staging.channex.io/api/v1';
const CHANNEX_API_KEY = process.env.VITE_CHANNEX_API_KEY;
const CHANNEX_PROPERTY_ID = process.env.VITE_CHANNEX_PROPERTY_ID;

// ID бронирования, которое мы создали через Airbnb симулятор
const BOOKING_ID = '00be50a6-ef60-4d18-bcf5-9cf046603141';

/**
 * API запрос к Channex
 */
async function channexApiRequest(endpoint, method = 'GET') {
  const url = `${CHANNEX_API_URL}${endpoint}`;
  console.log(`🌐 Channex API запрос: ${method} ${url}`);

  try {
    const options = {
      method,
      headers: {
        'user-api-key': CHANNEX_API_KEY,
        'Content-Type': 'application/json',
      },
    };

    const response = await fetch(url, options);
    const responseText = await response.text();

    if (!response.ok) {
      console.error('❌ Channex API ошибка:', responseText);
      throw new Error(`API Error: ${response.status}`);
    }

    return responseText ? JSON.parse(responseText) : { success: true };
  } catch (error) {
    console.error('💥 Channex API Request Error:', error);
    throw error;
  }
}

/**
 * Получить бронирование из Channex
 */
async function getChannexBooking(bookingId) {
  console.log('📥 Получение бронирования из Channex:', bookingId);
  const response = await channexApiRequest(`/bookings/${bookingId}`);
  return response.data;
}

/**
 * Получить room_id по номеру комнаты из PMS
 */
async function getRoomIdByNumber(roomNumber) {
  console.log('🏠 Ищем room_id для номера:', roomNumber);
  
  try {
    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('id, room_number')
      .eq('room_number', roomNumber)
      .single();

    if (error || !rooms) {
      console.log('❌ Комната не найдена, используем первую доступную');
      // Если не нашли точно по номеру, возьмем первую доступную
      const { data: firstRoom } = await supabase
        .from('rooms')
        .select('id, room_number')
        .limit(1)
        .single();
      
      return firstRoom?.id || null;
    }

    console.log('✅ Найдена комната:', rooms.room_number, 'ID:', rooms.id);
    return rooms.id;
  } catch (error) {
    console.error('❌ Ошибка поиска комнаты:', error);
    return null;
  }
}

/**
 * Преобразовать Channex бронирование в формат PMS
 */
async function convertToPMSFormat(channexBooking) {
  console.log('🔄 Конвертация Channex → PMS');
  console.log('📋 Channex данные:', JSON.stringify(channexBooking, null, 2));
  
  const attrs = channexBooking.attributes;
  const room = attrs.rooms?.[0];
  
  console.log('📅 Даты:', { arrival: attrs.arrival_date, departure: attrs.departure_date });
  console.log('🏠 Комната:', room);
  
  // Определяем номер комнаты из meta данных или используем дефолтный
  const roomNumber = attrs.meta?.pms_room_number || 'A1';
  const roomId = await getRoomIdByNumber(roomNumber);
  
  // Базовые данные
  const pmsBooking = {
    id: channexBooking.id,
    channel: 'airbnb',
    source: 'airbnb', 
    ota_reservation_code: attrs.ota_reservation_code,
    
    check_in: attrs.arrival_date || attrs.checkin_date || null,
    check_out: attrs.departure_date || attrs.checkout_date || null,
    
    guest_first_name: attrs.customer?.name || 'Guest',
    guest_last_name: attrs.customer?.surname || 'User', 
    guest_email: attrs.customer?.mail || '',
    guest_phone: attrs.customer?.phone || '',
    
    status: 'confirmed',
    
    room_id: roomId, // ✨ Добавляем правильный room_id
    room_number: roomNumber,
    room_type: 'Standard Room',
    
    adults: room?.occupancy?.adults || 2,
    children: room?.occupancy?.children || 0,
    
    total_amount: room?.total_price || attrs.total_price || 300,
    currency: attrs.currency || 'USD',
    
    external_booking_id: channexBooking.id,
    ota_reservation_code: attrs.ota_reservation_code
  };

  console.log('✅ PMS формат:', JSON.stringify(pmsBooking, null, 2));
  return pmsBooking;
}

/**
 * Сохранить в PMS БД
 */
async function saveToPMS(pmsBooking) {
  console.log('💾 Сохранение в PMS БД...');
  
  try {
    const { data, error } = await supabase
      .from('bookings')
      .upsert(pmsBooking, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error('❌ Ошибка сохранения в PMS БД:', error);
      throw error;
    }

    console.log('✅ Сохранено в PMS БД:', pmsBooking.id);
    return data;
  } catch (error) {
    console.error('💥 Критическая ошибка сохранения:', error);
    throw error;
  }
}

/**
 * Основная функция тестирования
 */
async function testChannexToPMSSync() {
  console.log('🧪 Тестирование синхронизации Channex → PMS');
  console.log('📋 Booking ID:', BOOKING_ID);
  
  try {
    // 1. Получаем бронирование из Channex
    const channexBooking = await getChannexBooking(BOOKING_ID);
    console.log('📥 Получено из Channex:', channexBooking?.id);
    
    // 2. Конвертируем в формат PMS
    const pmsBooking = convertToPMSFormat(channexBooking);
    
    // 3. Сохраняем в PMS БД
    const result = await saveToPMS(pmsBooking);
    
    console.log('🎉 Успешно! Бронирование синхронизировано в PMS:');
    console.log('- ID:', result[0]?.id);
    console.log('- Гость:', `${result[0]?.guest_first_name} ${result[0]?.guest_last_name}`);
    console.log('- Даты:', `${result[0]?.check_in} - ${result[0]?.check_out}`);
    console.log('- Стоимость:', `${result[0]?.total_amount} ${result[0]?.currency}`);
    
  } catch (error) {
    console.error('💥 Ошибка тестирования:', error.message);
  }
}

// Запускаем тест
testChannexToPMSSync();