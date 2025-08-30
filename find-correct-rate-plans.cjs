const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_KEY = 'uUdBtyJdPAYoP0m0qrEStPh2WJcXCBBBLMngnPxygFWpw0GyDE/nmvN/6wN7gXV+';
const BASE_URL = 'https://staging.channex.io/api/v1';
const PROPERTY_ID = '6ae9708a-cbaa-4134-bf04-29314e842709';

async function findCorrectRatePlans() {
  console.log('🔍 ПОИСК ПРАВИЛЬНЫХ RATE PLANS ДЛЯ SUITE И VILLA\n');
  console.log('='.repeat(50));
  
  const suiteRoomTypeId = 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3';
  const villaRoomTypeId = 'c14d8272-5406-40d0-b7d9-726513a13b5c';
  
  try {
    // Получаем все Rate Plans
    const rpUrl = `${BASE_URL}/rate_plans?property_id=${PROPERTY_ID}`;
    const rpResponse = await fetch(rpUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const rpData = await rpResponse.json();
    console.log(`Всего найдено rate plans: ${rpData.data?.length || 0}\n`);
    
    // Группируем по Room Type
    const ratePlansByRoomType = {};
    
    rpData.data?.forEach(rp => {
      const roomTypeId = rp.relationships?.room_type?.data?.id;
      if (!ratePlansByRoomType[roomTypeId]) {
        ratePlansByRoomType[roomTypeId] = [];
      }
      ratePlansByRoomType[roomTypeId].push(rp);
    });
    
    // Ищем для Suite
    console.log('📋 RATE PLANS ДЛЯ SUITE:');
    console.log('========================');
    console.log(`Room Type ID: ${suiteRoomTypeId}\n`);
    
    if (ratePlansByRoomType[suiteRoomTypeId]) {
      console.log(`✅ Найдено ${ratePlansByRoomType[suiteRoomTypeId].length} rate plans:\n`);
      ratePlansByRoomType[suiteRoomTypeId].forEach(rp => {
        console.log(`${rp.attributes.title}:`);
        console.log(`  ID: ${rp.id}`);
        console.log(`  Currency: ${rp.attributes.currency}`);
        console.log(`  Sell Mode: ${rp.attributes.sell_mode}`);
        console.log('');
      });
      
      // Рекомендуем первый
      const recommended = ratePlansByRoomType[suiteRoomTypeId][0];
      console.log(`📌 РЕКОМЕНДУЮ ИСПОЛЬЗОВАТЬ:`);
      console.log(`   "channex_rate_plan_id": "${recommended.id}"`);
    } else {
      console.log('❌ НЕТ Rate Plans для Suite');
      console.log('   Нужно создать Rate Plan в Channex для этого Room Type');
    }
    
    // Ищем для Villa
    console.log('\n\n📋 RATE PLANS ДЛЯ VILLA FIRST FLOOR:');
    console.log('=====================================');
    console.log(`Room Type ID: ${villaRoomTypeId}\n`);
    
    if (ratePlansByRoomType[villaRoomTypeId]) {
      console.log(`✅ Найдено ${ratePlansByRoomType[villaRoomTypeId].length} rate plans:\n`);
      ratePlansByRoomType[villaRoomTypeId].forEach(rp => {
        console.log(`${rp.attributes.title}:`);
        console.log(`  ID: ${rp.id}`);
        console.log(`  Currency: ${rp.attributes.currency}`);
        console.log(`  Sell Mode: ${rp.attributes.sell_mode}`);
        console.log('');
      });
      
      // Рекомендуем первый
      const recommended = ratePlansByRoomType[villaRoomTypeId][0];
      console.log(`📌 РЕКОМЕНДУЮ ИСПОЛЬЗОВАТЬ:`);
      console.log(`   "channex_rate_plan_id": "${recommended.id}"`);
    } else {
      console.log('❌ НЕТ Rate Plans для Villa First Floor');
      console.log('   Нужно создать Rate Plan в Channex для этого Room Type');
    }
    
    // Показываем все Rate Plans для отладки
    console.log('\n\n📊 ВСЕ RATE PLANS В СИСТЕМЕ:');
    console.log('============================\n');
    rpData.data?.forEach(rp => {
      const roomTypeId = rp.relationships?.room_type?.data?.id;
      console.log(`${rp.attributes.title}:`);
      console.log(`  Rate Plan ID: ${rp.id}`);
      console.log(`  Room Type ID: ${roomTypeId}`);
      
      if (roomTypeId === suiteRoomTypeId) {
        console.log(`  ✅ ЭТО ДЛЯ SUITE!`);
      } else if (roomTypeId === villaRoomTypeId) {
        console.log(`  ✅ ЭТО ДЛЯ VILLA!`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

findCorrectRatePlans();