// Простой тест подключения к Supabase и проверка схемы
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbhvwxpvlxqxadqzshfc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaHZ3eHB2bHhxeGFkcXpzaGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTMwOTQyMCwiZXhwIjoyMDUwODg1NDIwfQ.R_vS_6SfOp46jSL3nL8ZgxAqPWjLYrmA8uPu1E-c8CM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔄 Тестирование подключения к Supabase...');
    
    // Попытка получить одну запись
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Ошибка подключения:', error.message);
      
      // Попробуем создать простую запись для теста
      console.log('🔧 Попробуем создать тестовую запись...');
      
      const testBooking = {
        id: 'test-' + Date.now(),
        check_in: '2025-08-30',
        check_out: '2025-08-31',
        guest_name: 'Test User',
        room: 'Test Room',
        adults: 2,
        children: 0,
        channel: 'direct',
        status: 'test'
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('bookings')
        .insert(testBooking)
        .select();
      
      if (insertError) {
        console.error('❌ Ошибка вставки:', insertError.message);
        console.log('💡 Необходимые колонки отсутствуют в таблице');
        return false;
      } else {
        console.log('✅ Тестовая запись создана:', insertData);
        
        // Удалим тестовую запись
        await supabase.from('bookings').delete().eq('id', testBooking.id);
        console.log('🗑️ Тестовая запись удалена');
        return true;
      }
      
    } else {
      console.log('✅ Подключение успешно');
      console.log('📋 Существующие колонки:', data.length > 0 ? Object.keys(data[0]) : 'Таблица пуста');
      return true;
    }
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error.message);
    return false;
  }
}

testConnection().then(success => {
  if (success) {
    console.log('🎉 Тест прошел успешно!');
  } else {
    console.log('❌ Тест не прошел - необходимо обновить схему БД');
  }
}).catch(console.error);