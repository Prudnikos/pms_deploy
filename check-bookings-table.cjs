const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://otlvihqfngfcsjwqfnty.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90bHZpaHFmbmdmY3Nqd3FmbnR5Iiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3MjA0MjY1MDgsImV4cCI6MjAzNjAwMjUwOH0.cLGC6bG5lpz3-DkQ0Tw8QEQ_KHXy3cLhKBMIQzlDidk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBookingsTable() {
  console.log('🔍 Проверяем структуру таблицы bookings...\n');
  
  try {
    // Получаем одну запись для проверки структуры
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Ошибка:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('📊 Поля таблицы bookings:');
      console.log('------------------------');
      const fields = Object.keys(data[0]);
      fields.forEach(field => {
        console.log(`  • ${field}: ${typeof data[0][field]}`);
      });
      
      console.log('\n🔎 Проверка полей source и channel:');
      console.log(`  source: ${fields.includes('source') ? '✅ EXISTS' : '❌ NOT FOUND'}`);
      console.log(`  channel: ${fields.includes('channel') ? '✅ EXISTS' : '❌ NOT FOUND'}`);
      
      if (data[0].source !== undefined) {
        console.log(`  Значение source: "${data[0].source}"`);
      }
      if (data[0].channel !== undefined) {
        console.log(`  Значение channel: "${data[0].channel}"`);
      }
    } else {
      console.log('⚠️ Таблица bookings пуста');
      
      // Попробуем вставить тестовую запись для проверки полей
      console.log('\n🧪 Пробуем вставить тестовую запись с полями source и channel...');
      
      const testBooking = {
        check_in: '2025-12-01',
        check_out: '2025-12-02',
        guest_first_name: 'Test',
        guest_last_name: 'User',
        source: 'test',
        channel: 'test',
        status: 'pending',
        room_id: 1,
        total_amount: 100
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('bookings')
        .insert([testBooking])
        .select();
      
      if (insertError) {
        console.error('❌ Ошибка вставки:', insertError);
        console.log('\n💡 Возможно, поля source/channel отсутствуют в таблице');
      } else {
        console.log('✅ Тестовая запись успешно создана');
        console.log('Поля записи:', Object.keys(insertData[0]));
        
        // Удаляем тестовую запись
        await supabase
          .from('bookings')
          .delete()
          .eq('id', insertData[0].id);
        
        console.log('🗑️ Тестовая запись удалена');
      }
    }
    
    // Проверяем последние бронирования
    console.log('\n📋 Последние 3 бронирования:');
    const { data: recent } = await supabase
      .from('bookings')
      .select('id, source, channel, guest_first_name, check_in')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (recent && recent.length > 0) {
      recent.forEach(booking => {
        console.log(`  ID: ${booking.id}`);
        console.log(`    Guest: ${booking.guest_first_name}`);
        console.log(`    Check-in: ${booking.check_in}`);
        console.log(`    Source: ${booking.source || 'NULL'}`);
        console.log(`    Channel: ${booking.channel || 'NULL'}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

checkBookingsTable();