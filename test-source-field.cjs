const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://otlvihqfngfcsjwqfnty.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90bHZpaHFmbmdmY3Nqd3FmbnR5Iiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3MjA0MjY1MDgsImV4cCI6MjAzNjAwMjUwOH0.cLGC6bG5lpz3-DkQ0Tw8QEQ_KHXy3cLhKBMIQzlDidk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSourceField() {
  console.log('🔍 Тестируем поля source и channel в таблице bookings...\n');
  
  try {
    // Получаем последние бронирования
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, guest_first_name, source, channel, check_in, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Ошибка запроса:', error);
      return;
    }
    
    console.log('📋 Последние 5 бронирований:');
    console.log('================================');
    
    if (bookings && bookings.length > 0) {
      bookings.forEach((booking, index) => {
        console.log(`\n${index + 1}. Бронирование ID: ${booking.id}`);
        console.log(`   Гость: ${booking.guest_first_name || 'N/A'}`);
        console.log(`   Дата заезда: ${booking.check_in}`);
        console.log(`   Source: ${booking.source || '❌ ПУСТО'}`);
        console.log(`   Channel: ${booking.channel || '❌ ПУСТО'}`);
        console.log(`   Создано: ${new Date(booking.created_at).toLocaleString('ru-RU')}`);
      });
      
      // Статистика
      const withSource = bookings.filter(b => b.source).length;
      const withChannel = bookings.filter(b => b.channel).length;
      
      console.log('\n📊 Статистика:');
      console.log(`   Бронирований с source: ${withSource}/${bookings.length}`);
      console.log(`   Бронирований с channel: ${withChannel}/${bookings.length}`);
      
    } else {
      console.log('⚠️ Нет бронирований в базе данных');
    }
    
    // Пробуем обновить одно бронирование для теста
    if (bookings && bookings.length > 0 && !bookings[0].source) {
      console.log('\n🧪 Пробуем обновить первое бронирование...');
      
      const { data: updated, error: updateError } = await supabase
        .from('bookings')
        .update({ 
          source: 'Test', 
          channel: 'test-channel' 
        })
        .eq('id', bookings[0].id)
        .select();
      
      if (updateError) {
        console.error('❌ Ошибка обновления:', updateError);
        console.log('\n💡 Вероятно, поля source/channel отсутствуют в таблице bookings');
        console.log('   Необходимо добавить эти поля в Supabase Dashboard');
      } else {
        console.log('✅ Успешно обновлено!');
        console.log('   Source:', updated[0].source);
        console.log('   Channel:', updated[0].channel);
        
        // Возвращаем обратно
        await supabase
          .from('bookings')
          .update({ source: null, channel: null })
          .eq('id', bookings[0].id);
        
        console.log('🔄 Значения возвращены обратно');
      }
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

testSourceField();