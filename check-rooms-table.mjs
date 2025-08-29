import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbhvwxpvlxqxadqzshfc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaHZ3eHB2bHhxeGFkcXpzaGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkyNTM3NCwiZXhwIjoyMDY3NTAxMzc0fQ.0kO3vG1OXNS05NPgm7MmcbkdMuLSG49GKwkCP4979tc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRooms() {
  console.log('🔍 Проверяем таблицу rooms...\n');
  
  try {
    // Получаем все номера
    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('*')
      .order('id');
    
    if (error) {
      console.error('❌ Ошибка запроса:', error);
      return;
    }
    
    console.log('📋 Все номера в базе данных:');
    console.log('================================');
    
    if (rooms && rooms.length > 0) {
      rooms.forEach((room) => {
        console.log(`\nID: ${room.id}`);
        console.log(`  Номер: ${room.room_number}`);
        console.log(`  Тип: ${room.room_type}`);
        console.log(`  Статус: ${room.status}`);
      });
      
      console.log('\n📊 Статистика:');
      console.log(`  Всего номеров: ${rooms.length}`);
      
      // Группируем по типам
      const types = {};
      rooms.forEach(room => {
        types[room.room_type] = (types[room.room_type] || 0) + 1;
      });
      
      console.log('\n  По типам:');
      Object.entries(types).forEach(([type, count]) => {
        console.log(`    ${type}: ${count}`);
      });
      
    } else {
      console.log('⚠️ Нет номеров в базе данных');
    }
    
    // Проверяем последние бронирования и их room_id
    console.log('\n\n📋 Последние бронирования и их номера:');
    console.log('========================================');
    
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, guest_first_name, room_id, check_in, source, channel')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!bookingsError && bookings) {
      for (const booking of bookings) {
        // Находим номер для этого бронирования
        const room = rooms?.find(r => r.id === booking.room_id);
        console.log(`\nБронирование: ${booking.guest_first_name}`);
        console.log(`  Check-in: ${booking.check_in}`);
        console.log(`  Source: ${booking.source || 'N/A'}`);
        console.log(`  Room ID: ${booking.room_id}`);
        console.log(`  Номер: ${room ? `${room.room_number} (${room.room_type})` : '❌ НЕ НАЙДЕН'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

checkRooms();