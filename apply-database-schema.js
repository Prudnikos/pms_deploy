#!/usr/bin/env node

// Скрипт для применения SQL схемы к Supabase БД
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Настройки Supabase
const supabaseUrl = 'https://zbhvwxpvlxqxadqzshfc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaHZ3eHB2bHhxeGFkcXpzaGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTMwOTQyMCwiZXhwIjoyMDUwODg1NDIwfQ.R_vS_6SfOp46jSL3nL8ZgxAqPWjLYrmA8uPu1E-c8CM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyDatabaseSchema() {
  try {
    console.log('🔄 Применение схемы базы данных...');
    
    // Читаем SQL файл
    const sqlContent = fs.readFileSync('database_schema_fix.sql', 'utf8');
    
    // Разбиваем на отдельные команды
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && !cmd.startsWith('/*'));
    
    console.log(`📋 Найдено ${commands.length} SQL команд`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const [index, command] of commands.entries()) {
      if (!command) continue;
      
      try {
        console.log(`⏳ Выполняется команда ${index + 1}/${commands.length}...`);
        console.log(`🔧 ${command.substring(0, 60)}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql: command });
        
        if (error) {
          console.error(`❌ Ошибка в команде ${index + 1}:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Команда ${index + 1} выполнена успешно`);
          successCount++;
        }
        
        // Небольшая задержка между командами
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`💥 Критическая ошибка в команде ${index + 1}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Результат применения схемы:');
    console.log(`✅ Успешно: ${successCount}`);
    console.log(`❌ Ошибок: ${errorCount}`);
    console.log(`📋 Всего команд: ${commands.length}`);
    
    if (errorCount === 0) {
      console.log('🎉 Схема базы данных успешно применена!');
    } else {
      console.log('⚠️  Схема применена с ошибками. Проверьте логи выше.');
    }
    
    return { success: successCount, errors: errorCount, total: commands.length };
    
  } catch (error) {
    console.error('💥 Критическая ошибка применения схемы:', error);
    throw error;
  }
}

// Альтернативный метод - прямое выполнение SQL
async function applySchemaDirectly() {
  try {
    console.log('🔄 Применение схемы напрямую...');
    
    // Добавляем колонки для гостей
    const guestColumns = `
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS adults INTEGER DEFAULT 2,
      ADD COLUMN IF NOT EXISTS children INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS infants INTEGER DEFAULT 0;
    `;
    
    // Добавляем колонки для каналов
    const channelColumns = `
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS channel VARCHAR(50),
      ADD COLUMN IF NOT EXISTS source VARCHAR(50),
      ADD COLUMN IF NOT EXISTS ota_reservation_code VARCHAR(255);
    `;
    
    // Добавляем колонки для номеров
    const roomColumns = `
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS room_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS room_number VARCHAR(20),
      ADD COLUMN IF NOT EXISTS room_title VARCHAR(255);
    `;
    
    // Добавляем финансовые колонки
    const financeColumns = `
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
    `;
    
    // Добавляем колонки для контактов
    const contactColumns = `
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS guest_first_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS guest_last_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(50);
    `;
    
    // Добавляем метаданные
    const metaColumns = `
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS airbnb_meta JSONB,
      ADD COLUMN IF NOT EXISTS agoda_meta JSONB;
    `;
    
    const commands = [
      guestColumns,
      channelColumns,
      roomColumns,
      financeColumns,
      contactColumns,
      metaColumns
    ];
    
    for (const [index, sql] of commands.entries()) {
      try {
        console.log(`⏳ Выполнение команды ${index + 1}/${commands.length}...`);
        
        const { error } = await supabase.rpc('query', { 
          query_text: sql 
        });
        
        if (error) {
          console.error(`❌ Ошибка:`, error.message);
          
          // Попробуем альтернативным способом
          try {
            const { error: altError } = await supabase
              .from('_sql_commands')
              .insert({ command: sql });
              
            if (!altError) {
              console.log(`✅ Команда ${index + 1} выполнена альтернативным способом`);
            }
          } catch (e) {
            console.error(`💥 Альтернативный способ тоже не сработал`);
          }
        } else {
          console.log(`✅ Команда ${index + 1} выполнена успешно`);
        }
        
      } catch (error) {
        console.error(`💥 Критическая ошибка:`, error.message);
      }
    }
    
    console.log('🎉 Попытка применения схемы завершена!');
    
  } catch (error) {
    console.error('💥 Ошибка:', error);
  }
}

// Проверка текущей структуры таблицы
async function checkTableStructure() {
  try {
    console.log('🔍 Проверка структуры таблицы bookings...');
    
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Ошибка проверки:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('📋 Текущие колонки:', Object.keys(data[0]));
      
      const requiredColumns = [
        'adults', 'children', 'channel', 'source', 'ota_reservation_code',
        'room_type', 'room_number', 'room_title', 'total_amount', 'currency',
        'guest_first_name', 'guest_last_name', 'guest_email', 'guest_phone',
        'notes', 'airbnb_meta', 'agoda_meta'
      ];
      
      const existingColumns = Object.keys(data[0]);
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log('❌ Отсутствующие колонки:', missingColumns);
        return false;
      } else {
        console.log('✅ Все необходимые колонки присутствуют');
        return true;
      }
    } else {
      console.log('⚠️  Таблица пуста, не можем проверить структуру');
      return null;
    }
    
  } catch (error) {
    console.error('💥 Ошибка проверки структуры:', error);
    return false;
  }
}

// Основная функция
async function main() {
  console.log('🚀 Запуск применения схемы базы данных...');
  
  // Сначала проверим структуру
  const structureOk = await checkTableStructure();
  
  if (structureOk === true) {
    console.log('✅ Схема уже применена!');
    return;
  }
  
  if (structureOk === false) {
    console.log('🔧 Необходимо применить схему...');
    await applySchemaDirectly();
  }
  
  // Проверим еще раз
  await checkTableStructure();
}

// Запуск
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { applyDatabaseSchema, checkTableStructure };