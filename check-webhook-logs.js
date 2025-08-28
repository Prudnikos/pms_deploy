// Проверяем логи webhook'ов в БД
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbhvwxpvlxqxadqzshfc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaHZ3eHB2bHhxeGFkcXpzaGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkyNTM3NCwiZXhwIjoyMDY3NTAxMzc0fQ.0kO3vG1OXNS05NPgm7MmcbkdMuLSG49GKwkCP4979tc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkWebhookLogs() {
  console.log('🔍 Проверяем логи webhook\'ов...');
  
  try {
    // Проверяем последние webhook'и
    const { data: webhooks, error: webhookError } = await supabase
      .from('channex_webhooks')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(5);
    
    if (webhookError) {
      console.error('❌ Ошибка получения webhook логов:', webhookError.message);
      console.log('💡 Возможно таблица channex_webhooks не существует');
    } else {
      console.log('📋 Последние webhook\'ы:', webhooks?.length || 0);
      webhooks?.forEach(webhook => {
        console.log(`  - ${webhook.event_type} | ${webhook.received_at} | Обработан: ${webhook.processed}`);
      });
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }

  try {
    // Проверяем бронирования
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, channel, ota_reservation_code, guest_first_name, guest_last_name, check_in, check_out')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (bookingsError) {
      console.error('❌ Ошибка получения бронирований:', bookingsError.message);
    } else {
      console.log('📋 Последние бронирования:', bookings?.length || 0);
      bookings?.forEach(booking => {
        console.log(`  - ${booking.ota_reservation_code} | ${booking.guest_first_name} ${booking.guest_last_name} | ${booking.channel}`);
      });
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

checkWebhookLogs().catch(console.error);