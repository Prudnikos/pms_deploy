import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbhvwxpvlxqxadqzshfc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaHZ3eHB2bHhxeGFkcXpzaGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkyNTM3NCwiZXhwIjoyMDY3NTAxMzc0fQ.0kO3vG1OXNS05NPgm7MmcbkdMuLSG49GKwkCP4979tc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addStandardRoom() {
  console.log('➕ Добавляем Standard Room...\n');
  
  try {
    // Проверяем, есть ли уже Standard Room
    const { data: existing } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_type', 'Standard');
    
    if (existing && existing.length > 0) {
      console.log('✅ Standard Room уже существует:', existing[0].id);
      return;
    }
    
    // Добавляем Standard Room
    const { data: newRoom, error } = await supabase
      .from('rooms')
      .insert({
        room_number: 'Standard Room',
        room_type: 'Standard'
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Ошибка добавления:', error);
    } else {
      console.log('✅ Standard Room успешно добавлен!');
      console.log('   ID:', newRoom.id);
      console.log('   Номер:', newRoom.room_number);
      console.log('   Тип:', newRoom.room_type);
    }
    
    // Показываем все номера
    console.log('\n📋 Все номера Standard/Deluxe/Suite:');
    console.log('=====================================');
    
    const { data: rooms } = await supabase
      .from('rooms')
      .select('*')
      .in('room_type', ['Standard', 'Deluxe', 'Suite'])
      .order('room_type');
    
    if (rooms) {
      rooms.forEach(room => {
        console.log(`\n${room.room_type}:`);
        console.log(`  ID: ${room.id}`);
        console.log(`  Название: ${room.room_number}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

addStandardRoom();