const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_KEY = 'uUdBtyJdPAYoP0m0qrEStPh2WJcXCBBBLMngnPxygFWpw0GyDE/nmvN/6wN7gXV+';
const BASE_URL = 'https://staging.channex.io/api/v1';
const PROPERTY_ID = '6ae9708a-cbaa-4134-bf04-29314e842709';

async function syncChannexData() {
  console.log('🔄 ЗАПУСК СИНХРОНИЗАЦИИ CHANNEX\n');
  console.log('='.repeat(50));
  
  try {
    // 1. Проверяем подключение
    console.log('\n📋 Шаг 1: Проверка подключения...');
    const testUrl = `${BASE_URL}/room_types?property_id=${PROPERTY_ID}`;
    const testResponse = await fetch(testUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!testResponse.ok) {
      console.log('❌ Не удалось подключиться к Channex API');
      console.log(`Статус: ${testResponse.status}`);
      return;
    }
    
    console.log('✅ Подключение установлено');
    
    // 2. Получаем Room Types
    console.log('\n📋 Шаг 2: Синхронизация Room Types...');
    const rtData = await testResponse.json();
    console.log(`Найдено room types: ${rtData.data?.length || 0}`);
    
    if (rtData.data) {
      rtData.data.forEach(rt => {
        console.log(`  - ${rt.attributes.title} (${rt.id})`);
      });
    }
    
    // 3. Получаем Rate Plans
    console.log('\n📋 Шаг 3: Синхронизация Rate Plans...');
    const rpUrl = `${BASE_URL}/rate_plans?property_id=${PROPERTY_ID}`;
    const rpResponse = await fetch(rpUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const rpData = await rpResponse.json();
    console.log(`Найдено rate plans: ${rpData.data?.length || 0}`);
    
    // 4. Проверяем проблемные номера
    console.log('\n📋 Шаг 4: Проверка проблемных номеров...');
    
    const problematicRooms = {
      'Deluxe suite apartment': {
        room_type_id: 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3',
        expected_rate_plan_id: '45195f3e-fb59-4ddf-9e29-b667dbe2ab58'
      },
      'Villa First Floor': {
        room_type_id: 'c14d8272-5406-40d0-b7d9-726513a13b5c',
        expected_rate_plan_id: 'aa96a05e-f1a5-4e78-a9cb-0638ee1140f2'
      }
    };
    
    for (const [roomName, config] of Object.entries(problematicRooms)) {
      console.log(`\n🏠 ${roomName}:`);
      
      // Проверяем Room Type
      const roomType = rtData.data?.find(rt => rt.id === config.room_type_id);
      if (roomType) {
        console.log(`  ✅ Room Type найден`);
      } else {
        console.log(`  ❌ Room Type НЕ найден`);
      }
      
      // Проверяем Rate Plan
      const ratePlan = rpData.data?.find(rp => rp.id === config.expected_rate_plan_id);
      if (ratePlan) {
        console.log(`  ✅ Rate Plan найден`);
      } else {
        console.log(`  ❌ Rate Plan НЕ найден`);
        
        // Ищем альтернативные Rate Plans
        const altRatePlans = rpData.data?.filter(rp => 
          rp.relationships?.room_type?.data?.id === config.room_type_id
        );
        
        if (altRatePlans && altRatePlans.length > 0) {
          console.log(`  ℹ️ Найдены альтернативные Rate Plans:`);
          altRatePlans.forEach(rp => {
            console.log(`     - ${rp.id}: ${rp.attributes.title}`);
          });
        } else {
          console.log(`  ⚠️ Нет Rate Plans для этого Room Type`);
        }
      }
    }
    
    // 5. Итоги
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 РЕЗУЛЬТАТЫ СИНХРОНИЗАЦИИ:');
    console.log('============================');
    console.log(`✅ Room Types: ${rtData.data?.length || 0}`);
    console.log(`✅ Rate Plans: ${rpData.data?.length || 0}`);
    
    // Проверяем, нужно ли создать Rate Plans
    const needsRatePlans = [];
    
    if (!rpData.data?.find(rp => rp.relationships?.room_type?.data?.id === 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3')) {
      needsRatePlans.push('Deluxe suite apartment');
    }
    
    if (!rpData.data?.find(rp => rp.relationships?.room_type?.data?.id === 'c14d8272-5406-40d0-b7d9-726513a13b5c')) {
      needsRatePlans.push('Villa First Floor');
    }
    
    if (needsRatePlans.length > 0) {
      console.log('\n⚠️ ТРЕБУЕТСЯ ДЕЙСТВИЕ:');
      console.log('Создайте Rate Plans в Channex UI для:');
      needsRatePlans.forEach(room => {
        console.log(`  - ${room}`);
      });
      console.log('\nИли используйте существующие Rate Plans с другими ID');
    } else {
      console.log('\n✅ Все номера настроены правильно!');
    }
    
  } catch (error) {
    console.error('❌ Ошибка синхронизации:', error.message);
  }
}

syncChannexData();