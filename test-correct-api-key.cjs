const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Используем ключ из .env файла
const API_KEY = 'uUdBtyJdPAYoP0m0qrEStPh2WJcXCBBBLMngnPxygFWpw0GyDE/nmvN/6wN7gXV+';
const BASE_URL = 'https://staging.channex.io/api/v1';
const PROPERTY_ID = '6ae9708a-cbaa-4134-bf04-29314e842709';

async function testWithCorrectKey() {
  console.log('🔍 ТЕСТ С ПРАВИЛЬНЫМ API КЛЮЧОМ\n');
  console.log('='.repeat(50));
  
  try {
    // 1. Получаем Room Types
    console.log('\n📋 Получаем Room Types...');
    const roomTypesUrl = `${BASE_URL}/room_types?property_id=${PROPERTY_ID}`;
    const rtResponse = await fetch(roomTypesUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Статус: ${rtResponse.status}`);
    
    if (rtResponse.ok) {
      const rtData = await rtResponse.json();
      console.log(`✅ Найдено room types: ${rtData.data?.length || 0}\n`);
      
      const villaId = 'c14d8272-5406-40d0-b7d9-726513a13b5c';
      const suiteId = 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3';
      
      rtData.data?.forEach(rt => {
        console.log(`${rt.attributes.title}:`);
        console.log(`  ID: ${rt.id}`);
        
        if (rt.id === villaId) {
          console.log('  ✅ ЭТО Villa First Floor!');
        }
        if (rt.id === suiteId) {
          console.log('  ✅ ЭТО Deluxe Suite Apartment!');
        }
        console.log('');
      });
    } else {
      const errorText = await rtResponse.text();
      console.log('❌ Ошибка:', errorText);
    }
    
    // 2. Получаем Rate Plans
    console.log('📋 Получаем Rate Plans...');
    const rpUrl = `${BASE_URL}/rate_plans?property_id=${PROPERTY_ID}`;
    const rpResponse = await fetch(rpUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Статус: ${rpResponse.status}`);
    
    if (rpResponse.ok) {
      const rpData = await rpResponse.json();
      console.log(`✅ Найдено rate plans: ${rpData.data?.length || 0}\n`);
      
      const villaRateId = 'aa96a05e-f1a5-4e78-a9cb-0638ee1140f2';
      const suiteRateId = '45195f3e-fb59-4ddf-9e29-b667dbe2ab58';
      
      rpData.data?.forEach(rp => {
        console.log(`${rp.attributes.title}:`);
        console.log(`  ID: ${rp.id}`);
        
        if (rp.id === villaRateId) {
          console.log('  ✅ ЭТО Villa First Floor Rate!');
        }
        if (rp.id === suiteRateId) {
          console.log('  ✅ ЭТО Deluxe Suite Rate!');
        }
        console.log('');
      });
    } else {
      const errorText = await rpResponse.text();
      console.log('❌ Ошибка:', errorText);
    }
    
    console.log('='.repeat(50));
    console.log('\n💡 ВАЖНО:');
    console.log('Если Villa отображается, а Suite нет - значит Suite не создан/активирован в Channex.');
    console.log('Если оба отображаются - проблема была в неправильном API ключе в тестовых скриптах.');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
  }
}

testWithCorrectKey();