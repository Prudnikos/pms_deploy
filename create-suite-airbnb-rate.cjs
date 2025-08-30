const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_KEY = 'uUdBtyJdPAYoP0m0qrEStPh2WJcXCBBBLMngnPxygFWpw0GyDE/nmvN/6wN7gXV+';
const BASE_URL = 'https://staging.channex.io/api/v1';
const PROPERTY_ID = '6ae9708a-cbaa-4134-bf04-29314e842709';

async function createSuiteAirbnbRatePlan() {
  console.log('🔧 СОЗДАНИЕ AIRBNB RATE PLAN ДЛЯ SUITE\n');
  console.log('='.repeat(50));
  
  const suiteRoomTypeId = 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3';
  
  try {
    // Создаем новый Rate Plan
    const ratePlanData = {
      data: {
        type: 'rate_plans',
        attributes: {
          title: 'Suite Rate - AirBNB New AirBNB Channel',
          currency: 'USD',
          sell_mode: 'per_room',
          rate_mode: 'manual',
          closed_to_arrival: false,
          closed_to_departure: false,
          stop_sell: false,
          min_stay: 1,
          max_stay: 30,
          availability: 1
        },
        relationships: {
          property: {
            data: {
              type: 'properties',
              id: PROPERTY_ID
            }
          },
          room_type: {
            data: {
              type: 'room_types',
              id: suiteRoomTypeId
            }
          }
        }
      }
    };
    
    console.log('📤 Отправляем запрос на создание Rate Plan...');
    console.log('   Room Type ID:', suiteRoomTypeId);
    console.log('   Property ID:', PROPERTY_ID);
    console.log('   Title:', ratePlanData.data.attributes.title);
    
    const createUrl = `${BASE_URL}/rate_plans`;
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/vnd.api+json'
      },
      body: JSON.stringify(ratePlanData)
    });
    
    console.log(`\nСтатус ответа: ${createResponse.status}`);
    
    if (createResponse.ok) {
      const responseData = await createResponse.json();
      console.log('\n✅ УСПЕШНО СОЗДАН Rate Plan!');
      console.log('   ID:', responseData.data?.id);
      console.log('   Название:', responseData.data?.attributes?.title);
      
      console.log('\n' + '='.repeat(50));
      console.log('\n🎉 ВАЖНО: Обновите конфигурацию!');
      console.log('=====================================');
      console.log('Добавьте в airbnb-mapping.json для Suite:');
      console.log(`"channex_rate_plan_id": "${responseData.data?.id}"`);
      
      return responseData.data?.id;
    } else {
      const errorText = await createResponse.text();
      console.log('\n❌ Ошибка создания:');
      console.log(errorText);
      
      // Пробуем альтернативный формат
      console.log('\n📤 Пробуем альтернативный формат...');
      
      const altData = {
        title: 'Suite Rate - Airbnb',
        currency: 'USD',
        property_id: PROPERTY_ID,
        room_type_id: suiteRoomTypeId
      };
      
      const altResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'user-api-key': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(altData)
      });
      
      if (altResponse.ok) {
        const altResponseData = await altResponse.json();
        console.log('\n✅ Создан через альтернативный формат!');
        console.log('   ID:', altResponseData.data?.id);
        return altResponseData.data?.id;
      } else {
        const altError = await altResponse.text();
        console.log('❌ Альтернативный формат тоже не сработал:', altError);
      }
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
  }
}

// Запускаем создание
createSuiteAirbnbRatePlan().then(newRatePlanId => {
  if (newRatePlanId) {
    console.log('\n✅ Новый Rate Plan ID:', newRatePlanId);
    console.log('Используйте его в конфигурации!');
  }
});