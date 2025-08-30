const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Используем правильный ключ из .env
const API_KEY = 'uUdBtyJdPAYoP0m0qrEStPh2WJcXCBBBLMngnPxygFWpw0GyDE/nmvN/6wN7gXV+';
const BASE_URL = 'https://staging.channex.io/api/v1';
const PROPERTY_ID = '6ae9708a-cbaa-4134-bf04-29314e842709';

const roomsConfig = {
  'Standard Room': {
    room_type_id: '8df610ce-cabb-429d-98d0-90c33f451d97',
    rate_plan_id: '8212ad16-0057-496b-8b0b-54d741841852'
  },
  'Deluxe Room': {
    room_type_id: '734d5d86-1fe6-44d8-b6c5-4ac9349c4410',
    rate_plan_id: '0661e606-18e5-4ad3-bda0-ade13d29b76b'
  },
  'Deluxe suite apartment': {
    room_type_id: 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3',
    rate_plan_id: '45195f3e-fb59-4ddf-9e29-b667dbe2ab58'
  },
  'Villa First Floor': {
    room_type_id: 'c14d8272-5406-40d0-b7d9-726513a13b5c',
    rate_plan_id: 'aa96a05e-f1a5-4e78-a9cb-0638ee1140f2'
  }
};

async function testAllRoomsDisplay() {
  console.log('🔍 ТЕСТИРОВАНИЕ ОТОБРАЖЕНИЯ ВСЕХ НОМЕРОВ\n');
  console.log('='.repeat(50));
  
  try {
    // 1. Получаем Room Types
    console.log('\n📋 Шаг 1: Получаем Room Types из API...');
    const roomTypesUrl = `${BASE_URL}/room_types?property_id=${PROPERTY_ID}`;
    const rtResponse = await fetch(roomTypesUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const rtData = await rtResponse.json();
    console.log(`Найдено room types: ${rtData.data?.length || 0}`);
    
    // 2. Получаем Rate Plans
    console.log('\n📋 Шаг 2: Получаем Rate Plans из API...');
    const rpUrl = `${BASE_URL}/rate_plans?property_id=${PROPERTY_ID}`;
    const rpResponse = await fetch(rpUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const rpData = await rpResponse.json();
    console.log(`Найдено rate plans: ${rpData.data?.length || 0}`);
    
    // 3. Проверяем каждый номер
    console.log('\n📊 ПРОВЕРКА КАЖДОГО НОМЕРА:');
    console.log('============================\n');
    
    for (const [roomName, config] of Object.entries(roomsConfig)) {
      console.log(`🏠 ${roomName}:`);
      
      // Проверяем Room Type
      const roomType = rtData.data?.find(rt => rt.id === config.room_type_id);
      if (roomType) {
        console.log(`  ✅ Room Type найден: ${roomType.attributes.title}`);
      } else {
        console.log(`  ❌ Room Type НЕ НАЙДЕН (ID: ${config.room_type_id})`);
      }
      
      // Проверяем Rate Plan
      const ratePlan = rpData.data?.find(rp => rp.id === config.rate_plan_id);
      if (ratePlan) {
        console.log(`  ✅ Rate Plan найден: ${ratePlan.attributes.title}`);
      } else {
        console.log(`  ❌ Rate Plan НЕ НАЙДЕН (ID: ${config.rate_plan_id})`);
        
        // Ищем альтернативные Rate Plans для этого Room Type
        const altRatePlans = rpData.data?.filter(rp => 
          rp.relationships?.room_type?.data?.id === config.room_type_id
        );
        
        if (altRatePlans && altRatePlans.length > 0) {
          console.log(`  ℹ️ Но есть другие Rate Plans для этого Room Type:`);
          altRatePlans.forEach(rp => {
            console.log(`     - ${rp.id}: ${rp.attributes.title}`);
          });
        }
      }
      
      // Статус
      if (roomType && ratePlan) {
        console.log(`  ✅ ГОТОВ К ОТОБРАЖЕНИЮ`);
      } else {
        console.log(`  ⚠️ НЕ БУДЕТ ОТОБРАЖАТЬСЯ`);
      }
      
      console.log('');
    }
    
    // 4. Проверяем restrictions API
    console.log('📋 Шаг 3: Проверяем API restrictions (availability)...');
    const restrictionsUrl = `${BASE_URL}/restrictions?filter[property_id]=${PROPERTY_ID}&filter[date][gte]=2025-09-01&filter[date][lte]=2025-09-03&filter[restrictions]=availability`;
    const restrictionsResponse = await fetch(restrictionsUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Статус restrictions API: ${restrictionsResponse.status}`);
    
    if (restrictionsResponse.ok) {
      const restrictionsData = await restrictionsResponse.json();
      console.log('✅ Restrictions API работает');
      
      if (restrictionsData.data && Object.keys(restrictionsData.data).length > 0) {
        console.log(`Данные availability для ${Object.keys(restrictionsData.data).length} rate plans`);
      } else {
        console.log('⚠️ Нет данных availability - будет использоваться fallback');
      }
    } else {
      console.log('❌ Restrictions API не работает');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n💡 ИТОГИ:');
    console.log('=========');
    console.log('Проблемные номера нужно либо:');
    console.log('1. Исправить Rate Plan ID в конфигурации');
    console.log('2. Создать новые Rate Plans в Channex');
    console.log('3. Активировать существующие Rate Plans');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
  }
}

testAllRoomsDisplay();