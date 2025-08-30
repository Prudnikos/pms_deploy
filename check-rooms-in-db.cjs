const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zbhvwxpvlxqxadqzshfc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaHZ3eHB2bHhxeGFkcXpzaGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MjUzNzQsImV4cCI6MjA2NzUwMTM3NH0.TfyuqzBbK-8CIQ-8sTKrH4nMHW7w28nPIhtTLi9Olsc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRooms() {
  console.log('🔍 ПРОВЕРКА КОМНАТ В БАЗЕ ДАННЫХ\n');
  console.log('='.repeat(50));
  
  try {
    // Получаем все комнаты
    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('*')
      .order('room_number');
    
    if (error) {
      console.error('❌ Ошибка получения комнат:', error);
      return;
    }
    
    console.log(`\n📋 Найдено комнат: ${rooms?.length || 0}\n`);
    
    if (rooms && rooms.length > 0) {
      rooms.forEach((room, index) => {
        console.log(`${index + 1}. Комната ${room.room_number}:`);
        console.log(`   ID: ${room.id}`);
        console.log(`   Тип: ${room.room_type}`);
        console.log(`   Цена: $${room.price_per_night}`);
        console.log(`   Статус: ${room.status}`);
        console.log('');
      });
      
      // Проверяем наличие нужных типов
      console.log('='.repeat(50));
      console.log('\n📊 ПРОВЕРКА ТИПОВ КОМНАТ:\n');
      
      const hasStandard = rooms.some(r => r.room_type === 'Standard');
      const hasDeluxe = rooms.some(r => r.room_type === 'Deluxe');
      const hasSuite = rooms.some(r => r.room_type === 'Suite');
      const hasVilla = rooms.some(r => r.room_type === 'Villa');
      
      console.log(`Standard: ${hasStandard ? '✅ Есть' : '❌ НЕТ'}`);
      console.log(`Deluxe: ${hasDeluxe ? '✅ Есть' : '❌ НЕТ'}`);
      console.log(`Suite: ${hasSuite ? '✅ Есть' : '❌ НЕТ'}`);
      console.log(`Villa: ${hasVilla ? '✅ Есть' : '❌ НЕТ'}`);
      
      // Проверяем конкретные номера
      console.log('\n📋 ПОИСК КОНКРЕТНЫХ НОМЕРОВ:\n');
      
      const testSearches = [
        'Standard Room',
        'Deluxe Room',
        'Suite',
        'Deluxe Suite Apartment',
        'Villa First Floor'
      ];
      
      for (const searchName of testSearches) {
        const exactMatch = rooms.find(r => r.room_number === searchName);
        if (exactMatch) {
          console.log(`✅ "${searchName}" найден как номер ${exactMatch.room_number}`);
        } else {
          console.log(`❌ "${searchName}" НЕ найден по точному совпадению`);
        }
      }
      
    } else {
      console.log('❌ В базе нет комнат!');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

checkRooms();