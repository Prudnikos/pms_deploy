const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_KEY = process.env.VITE_CHANNEX_API_KEY || 'nWxt87XOKhF7HslqSxJW8y0t';
const BASE_URL = 'https://staging.channex.io/api/v1';
const PROPERTY_ID = '6ae9708a-cbaa-4134-bf04-29314e842709';

async function listAllChannexData() {
  console.log('📋 ПОЛНЫЙ СПИСОК ДАННЫХ В CHANNEX API\n');
  console.log('='.repeat(50));
  
  try {
    // 1. Room Types
    console.log('\n🏠 ROOM TYPES:');
    console.log('==============');
    const roomTypesUrl = `${BASE_URL}/room_types?property_id=${PROPERTY_ID}`;
    const roomTypesResponse = await fetch(roomTypesUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    const roomTypesData = await roomTypesResponse.json();
    
    if (roomTypesData.data && roomTypesData.data.length > 0) {
      roomTypesData.data.forEach(rt => {
        console.log(`\n${rt.attributes.title}:`);
        console.log(`  ID: ${rt.id}`);
        console.log(`  Count: ${rt.attributes.count_of_rooms}`);
        console.log(`  Occupancy: ${rt.attributes.occ_adults} adults + ${rt.attributes.occ_children} children`);
        console.log(`  OTA Room Type ID: ${rt.attributes.ota_room_type_id || 'не указан'}`);
      });
    } else {
      console.log('Нет доступных Room Types');
    }
    
    // 2. Rate Plans
    console.log('\n\n💰 RATE PLANS:');
    console.log('==============');
    const ratePlansUrl = `${BASE_URL}/rate_plans?property_id=${PROPERTY_ID}`;
    const ratePlansResponse = await fetch(ratePlansUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    const ratePlansData = await ratePlansResponse.json();
    
    if (ratePlansData.data && ratePlansData.data.length > 0) {
      ratePlansData.data.forEach(rp => {
        const roomTypeId = rp.relationships?.room_type?.data?.id;
        const roomType = roomTypesData.data?.find(rt => rt.id === roomTypeId);
        
        console.log(`\n${rp.attributes.title}:`);
        console.log(`  ID: ${rp.id}`);
        console.log(`  Room Type: ${roomType?.attributes?.title || 'не найден'} (${roomTypeId})`);
        console.log(`  Currency: ${rp.attributes.currency}`);
        console.log(`  Sell Mode: ${rp.attributes.sell_mode}`);
        console.log(`  OTA Rate Plan ID: ${rp.attributes.ota_rate_plan_id || 'не указан'}`);
      });
    } else {
      console.log('Нет доступных Rate Plans');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n⚠️ ВАЖНО:');
    console.log('=========');
    console.log('Если Suite (ID: e243d5aa-eff3-43a7-8bf8-87352b62fdc3) не в списке,');
    console.log('то он не доступен через API и не будет показываться в поиске.');
    console.log('\nВозможные причины:');
    console.log('1. Suite еще не синхронизирован после создания');
    console.log('2. Suite не активирован для property');
    console.log('3. Требуется обновить/перезагрузить данные в Channex');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

listAllChannexData();