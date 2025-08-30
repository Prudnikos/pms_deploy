const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_KEY = process.env.VITE_CHANNEX_API_KEY || 'nWxt87XOKhF7HslqSxJW8y0t';
const BASE_URL = 'https://staging.channex.io/api/v1';
const PROPERTY_ID = '6ae9708a-cbaa-4134-bf04-29314e842709';

async function testAPIAccess() {
  console.log('🔍 ТЕСТ API ДОСТУПА К CHANNEX\n');
  console.log('='.repeat(50));
  
  console.log('API Key:', API_KEY);
  console.log('Property ID:', PROPERTY_ID);
  console.log('Base URL:', BASE_URL);
  
  try {
    // 1. Тест базового доступа - Properties
    console.log('\n📋 Тест 1: Получаем Properties...');
    const propertiesUrl = `${BASE_URL}/properties`;
    const propResponse = await fetch(propertiesUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Статус: ${propResponse.status} ${propResponse.statusText}`);
    
    if (propResponse.ok) {
      const propData = await propResponse.json();
      console.log(`✅ Найдено properties: ${propData.data?.length || 0}`);
      
      propData.data?.forEach(prop => {
        console.log(`\n   ${prop.attributes.title}:`);
        console.log(`     ID: ${prop.id}`);
        console.log(`     Content API Key: ${prop.attributes.content_api_key}`);
        
        if (prop.id === PROPERTY_ID) {
          console.log('     ✅ ЭТО НАШЕ PROPERTY!');
        }
      });
    } else {
      const errorText = await propResponse.text();
      console.log('❌ Ошибка:', errorText);
    }
    
    // 2. Тест с конкретным property
    console.log('\n📋 Тест 2: Получаем конкретное Property...');
    const propertyUrl = `${BASE_URL}/properties/${PROPERTY_ID}`;
    const singlePropResponse = await fetch(propertyUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Статус: ${singlePropResponse.status} ${singlePropResponse.statusText}`);
    
    if (singlePropResponse.ok) {
      const singlePropData = await singlePropResponse.json();
      console.log('✅ Property найден:');
      console.log(`   Название: ${singlePropData.data?.attributes?.title}`);
      console.log(`   Content API Key: ${singlePropData.data?.attributes?.content_api_key}`);
    } else {
      const errorText = await singlePropResponse.text();
      console.log('❌ Ошибка:', errorText);
    }
    
    // 3. Тест Room Types с разными параметрами
    console.log('\n📋 Тест 3: Room Types с filter[property_id]...');
    const roomTypesUrl1 = `${BASE_URL}/room_types?filter[property_id]=${PROPERTY_ID}`;
    const rt1Response = await fetch(roomTypesUrl1, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Статус: ${rt1Response.status} ${rt1Response.statusText}`);
    
    if (rt1Response.ok) {
      const rt1Data = await rt1Response.json();
      console.log(`✅ Найдено room types: ${rt1Data.data?.length || 0}`);
    } else {
      const errorText = await rt1Response.text();
      console.log('❌ Ошибка:', errorText);
    }
    
    // 4. Тест Room Types с property_id
    console.log('\n📋 Тест 4: Room Types с property_id (без filter)...');
    const roomTypesUrl2 = `${BASE_URL}/room_types?property_id=${PROPERTY_ID}`;
    const rt2Response = await fetch(roomTypesUrl2, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Статус: ${rt2Response.status} ${rt2Response.statusText}`);
    
    if (rt2Response.ok) {
      const rt2Data = await rt2Response.json();
      console.log(`✅ Найдено room types: ${rt2Data.data?.length || 0}`);
      
      rt2Data.data?.forEach(rt => {
        console.log(`\n   ${rt.attributes.title}:`);
        console.log(`     ID: ${rt.id}`);
        console.log(`     Occupancy: ${rt.attributes.occ_adults} adults`);
      });
    } else {
      const errorText = await rt2Response.text();
      console.log('❌ Ошибка:', errorText);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('💡 ВЫВОДЫ:');
    console.log('Проверьте какой формат запроса работает и возвращает данные.');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
  }
}

testAPIAccess();