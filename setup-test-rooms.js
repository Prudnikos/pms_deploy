// Создание тестовых комнат для номеров 101 и 201
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rkqphmifpbdkllyqkkdg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrcXBobWlmcGJka2xseXFra2RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4MzkxNzYsImV4cCI6MjA1MTQxNTE3Nn0.7h7YV1KNk9mBU6W4K-sPCfPHWJkpUnEUBxW-9L4uVdU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupTestRooms() {
  console.log('🏠 Создаем тестовые комнаты...');
  
  try {
    // Проверяем существующие комнаты
    const { data: existingRooms, error: selectError } = await supabase
      .from('rooms')
      .select('*')
      .in('room_number', ['101', '201']);
    
    if (selectError) {
      console.error('❌ Ошибка проверки существующих комнат:', selectError);
      return;
    }
    
    console.log('📋 Существующие комнаты:', existingRooms);
    
    const testRooms = [
      {
        id: 'room-101',
        room_number: '101',
        name: 'Standard Room 101',
        room_type: 'Standard Room',
        floor: 1,
        capacity: 2,
        description: 'Стандартный номер на первом этаже',
        amenities: ['WiFi', 'TV', 'Air conditioning'],
        status: 'available',
        price_per_night: 100.00,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'room-201',
        room_number: '201',
        name: 'Deluxe Room 201',
        room_type: 'Deluxe Room',
        floor: 2,
        capacity: 2,
        description: 'Делюкс номер на втором этаже',
        amenities: ['WiFi', 'TV', 'Air conditioning', 'Mini bar', 'Balcony'],
        status: 'available',
        price_per_night: 200.00,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    // Создаем или обновляем комнаты
    for (const room of testRooms) {
      const existingRoom = existingRooms.find(r => r.room_number === room.room_number);
      
      if (existingRoom) {
        console.log(`🔄 Обновляем комнату ${room.room_number}...`);
        const { error } = await supabase
          .from('rooms')
          .update(room)
          .eq('id', existingRoom.id);
          
        if (error) {
          console.error(`❌ Ошибка обновления комнаты ${room.room_number}:`, error);
        } else {
          console.log(`✅ Комната ${room.room_number} обновлена`);
        }
      } else {
        console.log(`➕ Создаем новую комнату ${room.room_number}...`);
        const { error } = await supabase
          .from('rooms')
          .insert([room]);
          
        if (error) {
          console.error(`❌ Ошибка создания комнаты ${room.room_number}:`, error);
        } else {
          console.log(`✅ Комната ${room.room_number} создана`);
        }
      }
    }
    
    // Проверяем финальное состояние
    const { data: finalRooms, error: finalError } = await supabase
      .from('rooms')
      .select('*')
      .in('room_number', ['101', '201']);
    
    if (finalError) {
      console.error('❌ Ошибка проверки финальных комнат:', finalError);
      return;
    }
    
    console.log('🏁 Финальное состояние комнат:');
    finalRooms.forEach(room => {
      console.log(`   ${room.room_number}: ${room.name} (${room.room_type}) - ${room.price_per_night}$`);
    });
    
  } catch (error) {
    console.error('💥 Общая ошибка:', error);
  }
}

// Запускаем настройку
setupTestRooms();