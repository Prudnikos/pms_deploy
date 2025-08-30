const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_KEY = process.env.VITE_CHANNEX_API_KEY || 'nWxt87XOKhF7HslqSxJW8y0t';
const BASE_URL = 'https://staging.channex.io/api/v1';
const PROPERTY_ID = '6ae9708a-cbaa-4134-bf04-29314e842709';

async function testSuiteInAPI() {
  console.log('🔍 ТЕСТ: Проверка Suite в Channex API\n');
  console.log('='.repeat(50));
  
  try {
    // 1. Получаем Room Types
    console.log('\n📋 Шаг 1: Получаем Room Types...');
    const roomTypesUrl = `${BASE_URL}/room_types?property_id=${PROPERTY_ID}`;
    const roomTypesResponse = await fetch(roomTypesUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    const roomTypesData = await roomTypesResponse.json();
    
    // Ищем Suite
    const suiteRoomType = roomTypesData.data?.find(rt => 
      rt.id === 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3'
    );
    
    if (suiteRoomType) {
      console.log('✅ Suite Room Type найден:');
      console.log(`   ID: ${suiteRoomType.id}`);
      console.log(`   Название: ${suiteRoomType.attributes.title}`);
    } else {
      console.log('❌ Suite Room Type НЕ НАЙДЕН!');
      console.log('Доступные Room Types:');
      roomTypesData.data?.forEach(rt => {
        console.log(`   - ${rt.id}: ${rt.attributes.title}`);
      });
    }
    
    // 2. Получаем Rate Plans
    console.log('\n📋 Шаг 2: Получаем Rate Plans...');
    const ratePlansUrl = `${BASE_URL}/rate_plans?property_id=${PROPERTY_ID}`;
    const ratePlansResponse = await fetch(ratePlansUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    const ratePlansData = await ratePlansResponse.json();
    
    // Ищем Suite Rate Plan
    const suiteRatePlan = ratePlansData.data?.find(rp => 
      rp.id === '45195f3e-fb59-4ddf-9e29-b667dbe2ab58'
    );
    
    if (suiteRatePlan) {
      console.log('✅ Suite Rate Plan найден:');
      console.log(`   ID: ${suiteRatePlan.id}`);
      console.log(`   Название: ${suiteRatePlan.attributes.title}`);
      console.log(`   Room Type ID: ${suiteRatePlan.relationships?.room_type?.data?.id}`);
    } else {
      console.log('❌ Suite Rate Plan НЕ НАЙДЕН!');
      console.log('Доступные Rate Plans:');
      ratePlansData.data?.forEach(rp => {
        console.log(`   - ${rp.id}: ${rp.attributes.title}`);
      });
    }
    
    // 3. Проверяем Availability
    console.log('\n📋 Шаг 3: Проверяем Availability для Suite...');
    const dates = ['2025-09-01', '2025-09-02', '2025-09-03'];
    const availUrl = `${BASE_URL}/availability?filter[property_id]=${PROPERTY_ID}&filter[rate_plan_id]=45195f3e-fb59-4ddf-9e29-b667dbe2ab58&filter[date]=${dates.join(',')}`;
    
    const availResponse = await fetch(availUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    const availData = await availResponse.json();
    
    if (availData.data && availData.data.length > 0) {
      console.log('✅ Availability найден для Suite:');
      availData.data.forEach(item => {
        console.log(`   ${item.attributes.date}: ${item.attributes.availability} доступно`);
      });
    } else {
      console.log('⚠️ Нет данных availability для Suite');
    }
    
    // Итоговый вывод
    console.log('\n' + '='.repeat(50));
    console.log('📊 РЕЗУЛЬТАТЫ ТЕСТА:');
    console.log('===================');
    
    if (suiteRoomType && suiteRatePlan) {
      console.log('✅ Suite полностью настроен в Channex API');
      console.log('   Если не отображается в поиске, проблема в фронтенде');
    } else {
      console.log('❌ Suite не полностью настроен в Channex API');
      if (!suiteRoomType) console.log('   - Отсутствует Room Type');
      if (!suiteRatePlan) console.log('   - Отсутствует Rate Plan');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testSuiteInAPI();