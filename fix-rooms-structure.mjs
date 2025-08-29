import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbhvwxpvlxqxadqzshfc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaHZ3eHB2bHhxeGFkcXpzaGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkyNTM3NCwiZXhwIjoyMDY3NTAxMzc0fQ.0kO3vG1OXNS05NPgm7MmcbkdMuLSG49GKwkCP4979tc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRoomsStructure() {
  console.log('🔧 Исправляем структуру номеров...\n');
  
  try {
    // 1. Добавляем Standard Room если его нет
    console.log('1️⃣ Проверяем наличие Standard Room...');
    
    const { data: standardRoom, error: checkError } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_type', 'Standard')
      .single();
    
    if (!standardRoom) {
      console.log('   ➕ Добавляем Standard Room...');
      const { data: newRoom, error: insertError } = await supabase
        .from('rooms')
        .insert({
          room_number: 'Standard Room',
          room_type: 'Standard',
          floor: 1,
          base_price: 100,
          max_occupancy: 2
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('   ❌ Ошибка добавления:', insertError);
      } else {
        console.log('   ✅ Standard Room добавлен с ID:', newRoom.id);
      }
    } else {
      console.log('   ✅ Standard Room уже существует с ID:', standardRoom.id);
    }
    
    // 2. Переименовываем Deluxe apartment в Deluxe Room
    console.log('\n2️⃣ Переименовываем Deluxe apartment в Deluxe Room...');
    
    const { data: deluxeUpdate, error: deluxeError } = await supabase
      .from('rooms')
      .update({ room_number: 'Deluxe Room' })
      .eq('room_number', 'Deluxe apartment')
      .select();
    
    if (deluxeError) {
      console.error('   ❌ Ошибка обновления:', deluxeError);
    } else if (deluxeUpdate?.length > 0) {
      console.log('   ✅ Переименовано в Deluxe Room');
    } else {
      console.log('   ℹ️ Deluxe apartment не найден или уже переименован');
    }
    
    // 3. Переименовываем Deluxe suite apartment в Suite
    console.log('\n3️⃣ Переименовываем Deluxe suite apartment в Suite...');
    
    const { data: suiteUpdate, error: suiteError } = await supabase
      .from('rooms')
      .update({ room_number: 'Suite' })
      .eq('room_number', 'Deluxe suite apartment')
      .select();
    
    if (suiteError) {
      console.error('   ❌ Ошибка обновления:', suiteError);
    } else if (suiteUpdate?.length > 0) {
      console.log('   ✅ Переименовано в Suite');
    } else {
      console.log('   ℹ️ Deluxe suite apartment не найден или уже переименован');
    }
    
    // 4. Выводим итоговую структуру
    console.log('\n📋 Итоговая структура номеров:');
    console.log('================================');
    
    const { data: allRooms, error: finalError } = await supabase
      .from('rooms')
      .select('*')
      .in('room_type', ['Standard', 'Deluxe', 'Suite'])
      .order('room_type');
    
    if (!finalError && allRooms) {
      allRooms.forEach(room => {
        console.log(`\n${room.room_type}:`);
        console.log(`  ID: ${room.id}`);
        console.log(`  Название: ${room.room_number}`);
        console.log(`  Цена: ${room.base_price || 'не указана'}`);
        console.log(`  Вместимость: ${room.max_occupancy || 'не указана'}`);
      });
    }
    
    console.log('\n✅ Структура номеров исправлена!');
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

fixRoomsStructure();