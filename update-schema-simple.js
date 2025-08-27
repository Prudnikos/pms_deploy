// Простой способ обновления схемы через существующее подключение
import { supabase } from './src/lib/supabase.js';

async function updateBookingsSchema() {
  console.log('🔄 Обновление схемы таблицы bookings...');
  
  try {
    // Тестовое бронирование с новыми полями
    const testBooking = {
      id: `schema-test-${Date.now()}`,
      check_in: '2025-08-30',
      check_out: '2025-08-31',
      guest_name: 'Schema Test',
      room: 'Test Room',
      
      // Новые поля которых может не быть:
      adults: 2,
      children: 0,
      channel: 'test',
      source: 'test',
      ota_reservation_code: 'TEST-123',
      room_type: 'standard_apartment',
      room_number: 'A1',
      room_title: 'Test Room',
      total_amount: 100,
      currency: 'USD',
      guest_first_name: 'Test',
      guest_last_name: 'User',
      guest_email: 'test@test.com',
      guest_phone: '+1234567890',
      notes: 'Test booking for schema validation',
      status: 'confirmed'
    };
    
    console.log('📝 Попытка создать тестовое бронирование...');
    
    const { data, error } = await supabase
      .from('bookings')
      .insert(testBooking)
      .select();
    
    if (error) {
      console.error('❌ Ошибка создания тестового бронирования:', error.message);
      
      // Если поля отсутствуют, покажем подробности
      if (error.message.includes("could not find") || error.message.includes("column")) {
        console.log('💡 Необходимо добавить отсутствующие колонки в таблицу bookings');
        console.log('📋 SQL команды для выполнения в Supabase Dashboard → SQL Editor:');
        console.log('');
        console.log(`-- Добавление колонок для гостей
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS adults INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS children INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS infants INTEGER DEFAULT 0;

-- Добавление колонок для каналов/OTA  
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS channel VARCHAR(50),
ADD COLUMN IF NOT EXISTS source VARCHAR(50),
ADD COLUMN IF NOT EXISTS ota_reservation_code VARCHAR(255);

-- Добавление колонок для номеров и типов
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS room_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS room_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS room_title VARCHAR(255);

-- Добавление финансовых колонок
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Добавление колонок для контактов гостей
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS guest_first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS guest_last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(50);

-- Добавление колонки для заметок
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Добавление метаданных для интеграций
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS airbnb_meta JSONB,
ADD COLUMN IF NOT EXISTS agoda_meta JSONB;`);
        
        return false;
      }
    } else {
      console.log('✅ Тестовое бронирование создано успешно!');
      console.log('📊 Данные:', data[0]);
      
      // Удаляем тестовое бронирование
      await supabase.from('bookings').delete().eq('id', testBooking.id);
      console.log('🗑️ Тестовое бронирование удалено');
      
      console.log('🎉 Схема таблицы актуальна!');
      return true;
    }
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error.message);
    return false;
  }
}

// Также создать таблицу sync_status если ее нет
async function createSyncStatusTable() {
  console.log('🔄 Проверка таблицы sync_status...');
  
  try {
    const { data, error } = await supabase
      .from('sync_status')
      .select('*')
      .limit(1);
    
    if (error && error.message.includes('relation "sync_status" does not exist')) {
      console.log('📋 SQL для создания таблицы sync_status:');
      console.log('');
      console.log(`-- Создание таблицы для статуса синхронизации
CREATE TABLE IF NOT EXISTS sync_status (
    id SERIAL PRIMARY KEY,
    channel VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'idle',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    total_synced INTEGER DEFAULT 0,
    errors JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание уникального индекса для каналов
CREATE UNIQUE INDEX IF NOT EXISTS sync_status_channel_idx ON sync_status(channel);`);
      
      return false;
    } else if (error) {
      console.error('❌ Ошибка проверки sync_status:', error.message);
      return false;
    } else {
      console.log('✅ Таблица sync_status существует');
      return true;
    }
    
  } catch (error) {
    console.error('💥 Ошибка проверки sync_status:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Проверка и обновление схемы базы данных...');
  console.log('');
  
  const bookingsOk = await updateBookingsSchema();
  const syncStatusOk = await createSyncStatusTable();
  
  console.log('');
  console.log('📊 Результат проверки:');
  console.log(`📋 Таблица bookings: ${bookingsOk ? '✅ Готова' : '❌ Требует обновления'}`);
  console.log(`📋 Таблица sync_status: ${syncStatusOk ? '✅ Готова' : '❌ Требует создания'}`);
  
  if (!bookingsOk || !syncStatusOk) {
    console.log('');
    console.log('💡 Скопируйте SQL команды выше и выполните их в Supabase Dashboard → SQL Editor');
    console.log('🔗 https://supabase.com/dashboard/project/zbhvwxpvlxqxadqzshfc/sql');
  } else {
    console.log('');
    console.log('🎉 База данных готова к работе!');
  }
}

main().catch(console.error);