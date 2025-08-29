const https = require('https');

async function getChannexData() {
  const CHANNEX_API_KEY = 'uUdBtyJdPAYoP0m0qrEStPh2WJcXCBBBLMngnPxygFWpw0GyDE/nmvN/6wN7gXV+';
  const PROPERTY_ID = '6ae9708a-cbaa-4134-bf04-29314e842709';

  function makeRequest(url) {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'Authorization': `Bearer ${CHANNEX_API_KEY}`,
          'Content-Type': 'application/json'
        }
      };

      https.get(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }

  console.log('🔍 Получаем типы номеров из Channex...');
  const roomTypes = await makeRequest(`https://staging.channex.io/api/v1/room_types?property_id=${PROPERTY_ID}`);
  console.log('📋 Room types response:', roomTypes);

  console.log('🔍 Получаем тарифы из Channex...');
  const ratePlans = await makeRequest(`https://staging.channex.io/api/v1/rate_plans?property_id=${PROPERTY_ID}`);
  console.log('💰 Rate plans response:', ratePlans);

  console.log('\n📋 ТИПЫ НОМЕРОВ:');
  roomTypes.data.forEach(rt => {
    console.log(`  ${rt.attributes.title}: ${rt.id}`);
  });

  console.log('\n💰 ТАРИФЫ:');
  ratePlans.data.forEach(rp => {
    console.log(`  ${rp.attributes.title}: ${rp.id} (room_type: ${rp.attributes.room_type_id})`);
  });

  // Группируем тарифы по типам номеров
  console.log('\n🔗 СВЯЗИ:');
  roomTypes.data.forEach(rt => {
    console.log(`\n📍 ${rt.attributes.title} (${rt.id}):`);
    const matchingPlans = ratePlans.data.filter(rp => rp.attributes.room_type_id === rt.id);
    matchingPlans.forEach(rp => {
      console.log(`  - ${rp.attributes.title}: ${rp.id}`);
    });
  });

  // Создаем правильную конфигурацию
  console.log('\n🎯 РЕКОМЕНДУЕМАЯ КОНФИГУРАЦИЯ:');
  const mapping = {};
  
  roomTypes.data.forEach(rt => {
    const title = rt.attributes.title;
    const roomTypeId = rt.id;
    const standardRate = ratePlans.data.find(rp => 
      rp.attributes.room_type_id === roomTypeId && 
      rp.attributes.title.includes('Rate')
    );
    
    if (standardRate) {
      const key = title.toLowerCase().replace(' ', '_');
      mapping[key] = {
        pms_room_number: title,
        pms_room_type: title,
        channex_room_type_id: roomTypeId,
        channex_rate_plan_id: standardRate.id,
        airbnb_room_title: title,
        base_price: title.includes('Standard') ? '100' : title.includes('Deluxe') ? '200' : '300',
        max_occupancy: title.includes('Suite') ? 4 : 2,
        availability_count: 5
      };
      
      console.log(`"${key}": ${JSON.stringify(mapping[key], null, 2)}`);
    }
  });
}

getChannexData().catch(console.error);