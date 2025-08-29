const fetch = require('node-fetch');

const API_KEY = process.env.VITE_CHANNEX_API_KEY || 'nWxt87XOKhF7HslqSxJW8y0t';
const BASE_URL = 'https://staging.channex.io/api/v1';
const PROPERTY_ID = '6ae9708a-cbaa-4134-bf04-29314e842709';

async function checkChannexListings() {
  console.log('🔍 Проверяем связь Room Types с Airbnb листингами...\n');
  
  try {
    // 1. Получаем Room Types
    console.log('📋 Room Types в Channex:');
    console.log('========================');
    const roomTypesUrl = `${BASE_URL}/room_types?property_id=${PROPERTY_ID}`;
    const roomTypesResponse = await fetch(roomTypesUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const roomTypesData = await roomTypesResponse.json();
    
    if (roomTypesData.data) {
      roomTypesData.data.forEach(rt => {
        console.log(`\n${rt.attributes.title}:`);
        console.log(`  ID: ${rt.id}`);
        console.log(`  OTA Room Type ID: ${rt.attributes.ota_room_type_id || 'не указан'}`);
      });
    }
    
    // 2. Получаем Rate Plans
    console.log('\n\n📋 Rate Plans в Channex:');
    console.log('========================');
    const ratePlansUrl = `${BASE_URL}/rate_plans?property_id=${PROPERTY_ID}`;
    const ratePlansResponse = await fetch(ratePlansUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const ratePlansData = await ratePlansResponse.json();
    
    if (ratePlansData.data) {
      ratePlansData.data.forEach(rp => {
        const roomTypeId = rp.relationships?.room_type?.data?.id;
        const roomType = roomTypesData.data?.find(rt => rt.id === roomTypeId);
        console.log(`\n${rp.attributes.title}:`);
        console.log(`  ID: ${rp.id}`);
        console.log(`  Room Type: ${roomType?.attributes?.title || 'не найден'}`);
        console.log(`  OTA Rate Plan ID: ${rp.attributes.ota_rate_plan_id || 'не указан'}`);
      });
    }
    
    // 3. Сопоставление с нашим конфигом
    console.log('\n\n📊 СОПОСТАВЛЕНИЕ С НАШИМ КОНФИГОМ:');
    console.log('====================================');
    
    const mapping = {
      'Standard Room': {
        channex_room_type_id: '8df610ce-cabb-429d-98d0-90c33f451d97',
        channex_rate_plan_id: '8212ad16-0057-496b-8b0b-54d741841852'
      },
      'Deluxe Room': {
        channex_room_type_id: '734d5d86-1fe6-44d8-b6c5-4ac9349c4410',
        channex_rate_plan_id: '0661e606-18e5-4ad3-bda0-ade13d29b76b'
      },
      'Suite': {
        channex_room_type_id: 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3',
        channex_rate_plan_id: '45195f3e-fb59-4ddf-9e29-b667dbe2ab58'
      }
    };
    
    for (const [roomName, config] of Object.entries(mapping)) {
      console.log(`\n${roomName}:`);
      
      const roomType = roomTypesData.data?.find(rt => rt.id === config.channex_room_type_id);
      const ratePlan = ratePlansData.data?.find(rp => rp.id === config.channex_rate_plan_id);
      
      if (roomType) {
        console.log(`  ✅ Room Type найден: ${roomType.attributes.title}`);
      } else {
        console.log(`  ❌ Room Type НЕ НАЙДЕН!`);
      }
      
      if (ratePlan) {
        console.log(`  ✅ Rate Plan найден: ${ratePlan.attributes.title}`);
      } else {
        console.log(`  ❌ Rate Plan НЕ НАЙДЕН!`);
      }
    }
    
    console.log('\n\n💡 РЕКОМЕНДАЦИИ:');
    console.log('================');
    console.log('Из списка Airbnb листингов наиболее подходящие:');
    console.log('');
    console.log('Для Standard Room:');
    console.log('  • A 11 · One-bedroom apartment (базовый вариант)');
    console.log('  • A 1 · Deluxe apartment (если это стандарт)');
    console.log('');
    console.log('Для Deluxe Room:');
    console.log('  • A 4 · Deluxe family apartment (семейный = больше)');
    console.log('  • A6 · Two bed rooms Deluxe Suite (двухкомнатный)');
    console.log('');
    console.log('Для Suite:');
    console.log('  • A 5 · Deluxe suite apartment (прямое совпадение!)');
    console.log('  • V 1 · Villa ground floor (вилла = люкс)');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

checkChannexListings();