const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_KEY = 'uUdBtyJdPAYoP0m0qrEStPh2WJcXCBBBLMngnPxygFWpw0GyDE/nmvN/6wN7gXV+';
const BASE_URL = 'https://staging.channex.io/api/v1';
const PROPERTY_ID = '6ae9708a-cbaa-4134-bf04-29314e842709';

async function createMissingRatePlans() {
  console.log('🔧 СОЗДАНИЕ RATE PLANS ДЛЯ SUITE И VILLA\n');
  console.log('='.repeat(50));
  
  const roomsToCreate = [
    {
      name: 'Suite Rate',
      room_type_id: 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3',
      room_name: 'Deluxe suite apartment'
    },
    {
      name: 'Villa First Floor Rate',
      room_type_id: 'c14d8272-5406-40d0-b7d9-726513a13b5c',
      room_name: 'Villa First Floor'
    }
  ];
  
  const createdRatePlans = {};
  
  for (const room of roomsToCreate) {
    console.log(`\n📤 Создаем Rate Plan для ${room.room_name}...`);
    
    try {
      // Формат согласно Channex API документации
      const ratePlanData = {
        data: {
          type: 'rate_plans',
          attributes: {
            title: room.name,
            currency: 'USD',
            sell_mode: 'per_room',
            rate_mode: 'manual'
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
                id: room.room_type_id
              }
            }
          }
        }
      };
      
      const createUrl = `${BASE_URL}/rate_plans`;
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'user-api-key': API_KEY,
          'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify(ratePlanData)
      });
      
      console.log(`Статус: ${createResponse.status}`);
      
      if (createResponse.ok) {
        const responseData = await createResponse.json();
        console.log(`✅ СОЗДАН Rate Plan!`);
        console.log(`   ID: ${responseData.data?.id}`);
        console.log(`   Название: ${responseData.data?.attributes?.title}`);
        
        createdRatePlans[room.room_name] = responseData.data?.id;
      } else {
        const errorText = await createResponse.text();
        console.log(`❌ Ошибка создания Rate Plan`);
        
        // Парсим ошибку
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.errors) {
            console.log(`   Детали ошибки: ${JSON.stringify(errorData.errors, null, 2)}`);
          }
        } catch {
          console.log(`   Ответ: ${errorText}`);
        }
        
        // Если ошибка из-за того что уже существует, пробуем получить существующие
        if (errorText.includes('already exists') || createResponse.status === 422) {
          console.log('\n   ℹ️ Возможно Rate Plan уже существует, но не доступен через фильтр');
          console.log('   Проверьте в Channex UI и активируйте для property');
        }
      }
      
    } catch (error) {
      console.error(`❌ Критическая ошибка: ${error.message}`);
    }
  }
  
  // Итоги
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 РЕЗУЛЬТАТЫ:');
  console.log('=============\n');
  
  if (Object.keys(createdRatePlans).length > 0) {
    console.log('✅ Созданные Rate Plans:\n');
    for (const [roomName, ratePlanId] of Object.entries(createdRatePlans)) {
      console.log(`${roomName}:`);
      console.log(`  "channex_rate_plan_id": "${ratePlanId}"`);
      console.log('');
    }
    
    console.log('📝 ОБНОВИТЕ airbnb-mapping.json с новыми ID!');
  } else {
    console.log('❌ Не удалось создать Rate Plans через API\n');
    console.log('РЕКОМЕНДАЦИИ:');
    console.log('1. Проверьте в Channex UI, что Rate Plans созданы');
    console.log('2. Убедитесь, что они активированы для property');
    console.log('3. Проверьте, что они связаны с Airbnb каналом');
    console.log('4. Если Rate Plans есть в UI, но не в API - обратитесь в поддержку Channex');
  }
  
  console.log('\n💡 АЛЬТЕРНАТИВНОЕ РЕШЕНИЕ:');
  console.log('===========================');
  console.log('Если Rate Plans видны в Channex UI (как на скриншоте),');
  console.log('но не доступны через API, можно временно использовать');
  console.log('режим fallback - показывать номера без проверки API.');
}

createMissingRatePlans();