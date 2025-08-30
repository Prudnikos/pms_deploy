const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_KEY = 'uUdBtyJdPAYoP0m0qrEStPh2WJcXCBBBLMngnPxygFWpw0GyDE/nmvN/6wN7gXV+';
const BASE_URL = 'https://staging.channex.io/api/v1';
const PROPERTY_ID = '6ae9708a-cbaa-4134-bf04-29314e842709';

async function analyzeSuiteIssue() {
  console.log('🔍 АНАЛИЗ ПРОБЛЕМЫ С SUITE\n');
  console.log('='.repeat(50));
  
  const suiteRoomTypeId = 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3';
  const suiteRatePlanId = '45195f3e-fb59-4ddf-9e29-b667dbe2ab58';
  
  try {
    // 1. Получаем ВСЕ Rate Plans
    console.log('\n📋 Шаг 1: Получаем ВСЕ Rate Plans для property...');
    const allRatePlansUrl = `${BASE_URL}/rate_plans?property_id=${PROPERTY_ID}`;
    const allResponse = await fetch(allRatePlansUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const allData = await allResponse.json();
    console.log(`Всего Rate Plans: ${allData.data?.length || 0}`);
    
    // Проверяем, есть ли наш Suite Rate Plan в списке
    const foundSuiteRatePlan = allData.data?.find(rp => rp.id === suiteRatePlanId);
    
    if (foundSuiteRatePlan) {
      console.log('\n✅ Suite Rate Plan НАЙДЕН в общем списке!');
      console.log(`   ID: ${foundSuiteRatePlan.id}`);
      console.log(`   Название: ${foundSuiteRatePlan.attributes.title}`);
      console.log(`   Room Type ID: ${foundSuiteRatePlan.relationships?.room_type?.data?.id}`);
    } else {
      console.log('\n❌ Suite Rate Plan НЕ найден в общем списке');
      console.log(`   Искали ID: ${suiteRatePlanId}`);
      
      // Показываем что есть для Suite
      const suiteRatePlans = allData.data?.filter(rp => 
        rp.relationships?.room_type?.data?.id === suiteRoomTypeId
      );
      
      if (suiteRatePlans && suiteRatePlans.length > 0) {
        console.log(`\n   Но есть другие Rate Plans для Suite (${suiteRatePlans.length}):`);
        suiteRatePlans.forEach(rp => {
          console.log(`     - ${rp.id}: ${rp.attributes.title}`);
        });
      }
    }
    
    // 2. Проверяем прямой запрос к Rate Plan
    console.log('\n📋 Шаг 2: Прямой запрос к Suite Rate Plan...');
    const directUrl = `${BASE_URL}/rate_plans/${suiteRatePlanId}`;
    const directResponse = await fetch(directUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (directResponse.ok) {
      const directData = await directResponse.json();
      console.log('✅ При прямом запросе Rate Plan доступен');
      console.log(`   Property ID в ответе: ${directData.data?.relationships?.property?.data?.id}`);
      
      if (directData.data?.relationships?.property?.data?.id !== PROPERTY_ID) {
        console.log('   ⚠️ ВНИМАНИЕ: Rate Plan принадлежит другому property!');
      }
    } else {
      console.log(`❌ Прямой запрос вернул ошибку: ${directResponse.status}`);
    }
    
    // 3. Проверяем Room Type
    console.log('\n📋 Шаг 3: Проверяем Suite Room Type...');
    const roomTypesUrl = `${BASE_URL}/room_types?property_id=${PROPERTY_ID}`;
    const rtResponse = await fetch(roomTypesUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const rtData = await rtResponse.json();
    const suiteRoomType = rtData.data?.find(rt => rt.id === suiteRoomTypeId);
    
    if (suiteRoomType) {
      console.log('✅ Suite Room Type найден');
      console.log(`   Название: ${suiteRoomType.attributes.title}`);
    } else {
      console.log('❌ Suite Room Type не найден');
    }
    
    // 4. Финальная рекомендация
    console.log('\n' + '='.repeat(50));
    console.log('\n💡 РЕШЕНИЕ:');
    console.log('===========');
    
    if (foundSuiteRatePlan) {
      console.log('✅ Конфигурация корректна! Suite должен работать.');
      console.log('   Проблема может быть в фронтенде или кэшировании.');
    } else {
      console.log('❌ Rate Plan ID в конфигурации не соответствует property.');
      console.log('\n🔧 Нужно либо:');
      console.log('   1. Создать новый Rate Plan для Suite в Channex');
      console.log('   2. Использовать существующий Rate Plan ID из списка выше');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

analyzeSuiteIssue();