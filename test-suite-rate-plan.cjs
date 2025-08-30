const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_KEY = 'uUdBtyJdPAYoP0m0qrEStPh2WJcXCBBBLMngnPxygFWpw0GyDE/nmvN/6wN7gXV+';
const BASE_URL = 'https://staging.channex.io/api/v1';
const PROPERTY_ID = '6ae9708a-cbaa-4134-bf04-29314e842709';

async function testSuiteRatePlan() {
  console.log('🔍 ПРОВЕРКА SUITE RATE PLAN\n');
  console.log('='.repeat(50));
  
  const suiteRoomTypeId = 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3';
  const suiteRatePlanId = '45195f3e-fb59-4ddf-9e29-b667dbe2ab58';
  
  try {
    // 1. Проверяем прямым запросом Rate Plan
    console.log('\n📋 Проверяем Rate Plan по ID напрямую:');
    console.log(`Rate Plan ID: ${suiteRatePlanId}`);
    
    const directUrl = `${BASE_URL}/rate_plans/${suiteRatePlanId}`;
    const directResponse = await fetch(directUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Статус прямого запроса: ${directResponse.status}`);
    
    if (directResponse.ok) {
      const directData = await directResponse.json();
      console.log('✅ Rate Plan найден!');
      console.log(`   Название: ${directData.data?.attributes?.title}`);
      console.log(`   Room Type ID: ${directData.data?.relationships?.room_type?.data?.id}`);
      console.log(`   Property ID: ${directData.data?.relationships?.property?.data?.id}`);
    } else if (directResponse.status === 404) {
      console.log('❌ Rate Plan НЕ СУЩЕСТВУЕТ с таким ID');
    } else {
      console.log('❌ Ошибка доступа');
    }
    
    // 2. Ищем все Rate Plans для Suite Room Type
    console.log('\n📋 Все Rate Plans для Suite Room Type:');
    const allRatePlansUrl = `${BASE_URL}/rate_plans?property_id=${PROPERTY_ID}`;
    const allResponse = await fetch(allRatePlansUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (allResponse.ok) {
      const allData = await allResponse.json();
      
      // Фильтруем только для Suite
      const suiteRatePlans = allData.data?.filter(rp => 
        rp.relationships?.room_type?.data?.id === suiteRoomTypeId
      );
      
      if (suiteRatePlans && suiteRatePlans.length > 0) {
        console.log(`\n✅ Найдено ${suiteRatePlans.length} Rate Plans для Suite:`);
        suiteRatePlans.forEach(rp => {
          console.log(`\n   ${rp.attributes.title}:`);
          console.log(`     ID: ${rp.id}`);
          console.log(`     Currency: ${rp.attributes.currency}`);
          console.log(`     Sell Mode: ${rp.attributes.sell_mode}`);
          
          // Проверяем, есть ли связь с Airbnb
          if (rp.attributes.title?.includes('AirBNB') || 
              rp.attributes.title?.includes('Airbnb')) {
            console.log('     📍 Связан с Airbnb!');
          }
        });
        
        console.log('\n💡 РЕКОМЕНДАЦИЯ:');
        console.log('Используйте один из этих Rate Plan ID для Suite в конфигурации.');
        
        // Предлагаем первый найденный
        if (suiteRatePlans[0]) {
          console.log(`\nПредлагаемый Rate Plan ID: ${suiteRatePlans[0].id}`);
          console.log(`Название: ${suiteRatePlans[0].attributes.title}`);
        }
      } else {
        console.log('❌ Нет Rate Plans для Suite Room Type');
        console.log('   Необходимо создать Rate Plan в Channex для Suite');
      }
    }
    
    // 3. Проверяем Villa для сравнения
    console.log('\n📋 Для сравнения - Villa First Floor:');
    const villaRoomTypeId = 'c14d8272-5406-40d0-b7d9-726513a13b5c';
    
    if (allResponse.ok) {
      const allData = await allResponse.json();
      
      const villaRatePlans = allData.data?.filter(rp => 
        rp.relationships?.room_type?.data?.id === villaRoomTypeId
      );
      
      if (villaRatePlans && villaRatePlans.length > 0) {
        console.log(`✅ У Villa есть ${villaRatePlans.length} Rate Plans:`);
        villaRatePlans.forEach(rp => {
          console.log(`   - ${rp.id}: ${rp.attributes.title}`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 ИТОГ:');
    console.log('========');
    console.log('Suite Room Type существует, но нужен правильный Rate Plan ID.');
    console.log('Проверьте выше какие Rate Plans доступны для Suite.');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testSuiteRatePlan();