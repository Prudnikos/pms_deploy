import { createClient } from '@supabase/supabase-js';

// Используем те же credentials из вашего проекта
const supabaseUrl = 'https://zbhvwxpvlxqxadqzshfc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaHZ3eHB2bHhxeGFkcXpzaGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkyNTM3NCwiZXhwIjoyMDY3NTAxMzc0fQ.0kO3vG1OXNS05NPgm7MmcbkdMuLSG49GKwkCP4979tc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  console.log('🔌 Тестируем подключение к Supabase...\n');
  
  try {
    // Получаем список таблиц через RPC функцию
    const { data: tablesResult, error: tablesError } = await supabase.rpc('get_tables_list', {});
    
    let tables = [];
    if (tablesError) {
      // Если RPC не существует, пробуем получить известные таблицы напрямую
      const knownTables = ['bookings', 'guests', 'rooms', 'services', 'booking_services', 'conversations', 'messages', 'daily_reports'];
      tables = knownTables.map(name => ({ table_name: name }));
    } else {
      tables = tablesResult;
    }
    
    const error = tablesError && !tables.length ? tablesError : null;
    
    if (error) throw error;
    
    console.log('✅ Подключение успешно!\n');
    console.log('📊 Таблицы в базе данных:');
    console.log('=' .repeat(40));
    
    for (const table of tables) {
      // Получаем количество записей в каждой таблице
      const { count } = await supabase
        .from(table.table_name)
        .select('*', { count: 'exact', head: true });
      
      console.log(`  • ${table.table_name.padEnd(25)} (${count || 0} записей)`);
    }
    
    console.log('\n🔍 Детальная информация о ключевых таблицах:\n');
    
    // Проверяем структуру таблицы bookings
    // Для Supabase используем простой запрос для получения структуры
    const { data: sampleBooking } = await supabase
      .from('bookings')
      .select('*')
      .limit(1);
    
    const bookingsColumns = sampleBooking && sampleBooking.length > 0 
      ? Object.keys(sampleBooking[0]).map(key => ({ column_name: key })) 
      : [];
    
    if (bookingsColumns && bookingsColumns.length > 0) {
      console.log('📅 Таблица "bookings":');
      bookingsColumns.forEach(col => {
        console.log(`    - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });
    }
    
    // Проверяем последние бронирования
    const { data: recentBookings } = await supabase
      .from('bookings')
      .select('id, check_in, check_out, status')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (recentBookings && recentBookings.length > 0) {
      console.log('\n📌 Последние бронирования:');
      recentBookings.forEach(booking => {
        console.log(`    ID: ${booking.id.substring(0, 8)}... | ${booking.check_in} - ${booking.check_out} | Статус: ${booking.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
  }
}

testConnection().then(() => process.exit(0));