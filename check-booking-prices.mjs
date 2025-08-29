import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbhvwxpvlxqxadqzshfc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaHZ3eHB2bHhxeGFkcXpzaGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkyNTM3NCwiZXhwIjoyMDY3NTAxMzc0fQ.0kO3vG1OXNS05NPgm7MmcbkdMuLSG49GKwkCP4979tc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBookingPrices() {
  console.log('🔍 Проверяем цены в бронированиях Suite2...\n');
  
  try {
    // Ищем бронирование Suite2
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .ilike('guest_first_name', '%Suite%')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (error) {
      console.error('❌ Ошибка:', error);
      return;
    }
    
    console.log('📋 Найденные бронирования Suite:');
    console.log('================================');
    
    if (bookings && bookings.length > 0) {
      bookings.forEach((booking, index) => {
        console.log(`\n${index + 1}. ID: ${booking.id}`);
        console.log(`   Гость: ${booking.guest_first_name} ${booking.guest_last_name || ''}`);
        console.log(`   Даты: ${booking.check_in} - ${booking.check_out}`);
        console.log(`   Room ID: ${booking.room_id}`);
        console.log('\n   💰 ФИНАНСОВЫЕ ПОЛЯ:');
        console.log(`   total_amount: ${booking.total_amount}`);
        console.log(`   accommodation_total: ${booking.accommodation_total}`);
        console.log(`   services_total: ${booking.services_total}`);
        console.log(`   amount_paid: ${booking.amount_paid}`);
        console.log(`   balance_due: ${booking.balance_due || (booking.total_amount - (booking.amount_paid || 0))}`);
        
        // Вычисляем количество ночей
        const nights = Math.ceil(
          (new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24)
        );
        console.log(`\n   📊 РАСЧЕТ:`);
        console.log(`   Ночей: ${nights}`);
        console.log(`   Ожидаемая цена Suite: $300/ночь * ${nights} = $${300 * nights}`);
        
        if (booking.total_amount && booking.total_amount !== 300 * nights) {
          console.log(`   ⚠️ НЕСООТВЕТСТВИЕ: total_amount = ${booking.total_amount}, ожидается минимум ${300 * nights}`);
        }
      });
    } else {
      console.log('⚠️ Нет бронирований Suite');
    }
    
    // Проверяем все поля таблицы bookings
    console.log('\n\n📊 СТРУКТУРА ТАБЛИЦЫ BOOKINGS:');
    console.log('================================');
    
    const { data: sample } = await supabase
      .from('bookings')
      .select('*')
      .limit(1);
    
    if (sample && sample.length > 0) {
      const fields = Object.keys(sample[0]);
      const financialFields = fields.filter(f => 
        f.includes('amount') || 
        f.includes('total') || 
        f.includes('price') || 
        f.includes('balance') ||
        f.includes('paid')
      );
      
      console.log('Финансовые поля:');
      financialFields.forEach(field => {
        console.log(`  • ${field}: ${typeof sample[0][field]}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

checkBookingPrices();