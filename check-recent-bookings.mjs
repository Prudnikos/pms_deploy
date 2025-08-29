import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbhvwxpvlxqxadqzshfc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaHZ3eHB2bHhxeGFkcXpzaGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkyNTM3NCwiZXhwIjoyMDY3NTAxMzc0fQ.0kO3vG1OXNS05NPgm7MmcbkdMuLSG49GKwkCP4979tc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentBookings() {
  console.log('🔍 Проверяем последние бронирования и их распределение по номерам...\n');
  
  try {
    // Получаем все номера
    const { data: rooms } = await supabase
      .from('rooms')
      .select('*')
      .in('room_type', ['Standard', 'Deluxe', 'Suite'])
      .order('room_type');
    
    console.log('📋 Доступные номера:');
    console.log('====================');
    rooms?.forEach(room => {
      console.log(`${room.room_type}: ${room.room_number} (ID: ${room.id})`);
    });
    
    // Получаем последние бронирования
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, guest_first_name, room_id, check_in, check_out, source, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Ошибка запроса:', error);
      return;
    }
    
    console.log('\n\n📋 Последние 10 бронирований:');
    console.log('==============================');
    
    if (bookings && bookings.length > 0) {
      bookings.forEach((booking, index) => {
        const room = rooms?.find(r => r.id === booking.room_id);
        const roomInfo = room ? `${room.room_number} (${room.room_type})` : '❌ НЕИЗВЕСТНЫЙ НОМЕР';
        
        console.log(`\n${index + 1}. ${booking.guest_first_name}`);
        console.log(`   Даты: ${booking.check_in} - ${booking.check_out}`);
        console.log(`   Номер: ${roomInfo}`);
        console.log(`   Source: ${booking.source || 'не указан'}`);
        console.log(`   Создано: ${new Date(booking.created_at).toLocaleString('ru-RU')}`);
        
        if (!room) {
          console.log(`   ⚠️ Room ID: ${booking.room_id} не найден в таблице rooms!`);
        }
      });
      
      // Статистика распределения по номерам
      console.log('\n\n📊 Распределение бронирований по номерам:');
      console.log('==========================================');
      
      const roomStats = {};
      bookings.forEach(booking => {
        const room = rooms?.find(r => r.id === booking.room_id);
        const roomName = room ? `${room.room_number} (${room.room_type})` : 'Неизвестный номер';
        roomStats[roomName] = (roomStats[roomName] || 0) + 1;
      });
      
      Object.entries(roomStats).forEach(([roomName, count]) => {
        console.log(`${roomName}: ${count} бронирований`);
      });
      
      // Проверяем проблему с Suite
      const suiteBookings = bookings.filter(b => {
        const room = rooms?.find(r => r.id === b.room_id);
        return room?.room_type === 'Suite';
      });
      
      const deluxeBookings = bookings.filter(b => {
        const room = rooms?.find(r => r.id === b.room_id);
        return room?.room_type === 'Deluxe';
      });
      
      console.log('\n📌 Проблема с распределением:');
      console.log(`   Suite бронирований: ${suiteBookings.length}`);
      console.log(`   Deluxe бронирований: ${deluxeBookings.length}`);
      
      if (suiteBookings.length === 0) {
        console.log('   ⚠️ НИ ОДНО бронирование Suite не попало в правильный номер!');
      }
      
    } else {
      console.log('⚠️ Нет бронирований в базе данных');
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

checkRecentBookings();