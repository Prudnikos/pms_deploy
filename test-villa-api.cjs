const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_KEY = process.env.VITE_CHANNEX_API_KEY || 'nWxt87XOKhF7HslqSxJW8y0t';
const BASE_URL = 'https://staging.channex.io/api/v1';
const PROPERTY_ID = '6ae9708a-cbaa-4134-bf04-29314e842709';

async function testVillaAndSuite() {
  console.log('🔍 ТЕСТ: Проверка Villa First Floor и Suite в Channex API\n');
  console.log('='.repeat(50));
  
  const villaRoomTypeId = 'c14d8272-5406-40d0-b7d9-726513a13b5c';
  const villaRatePlanId = 'aa96a05e-f1a5-4e78-a9cb-0638ee1140f2';
  
  const suiteRoomTypeId = 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3';
  const suiteRatePlanId = '45195f3e-fb59-4ddf-9e29-b667dbe2ab58';
  
  try {
    // 1. Получаем Room Types напрямую по ID
    console.log('\n📋 Проверяем Room Types по ID:');
    console.log('================================');
    
    // Villa
    console.log('\n🏠 Villa First Floor:');
    const villaRoomUrl = `${BASE_URL}/room_types/${villaRoomTypeId}`;
    try {
      const villaResponse = await fetch(villaRoomUrl, {
        headers: {
          'user-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (villaResponse.ok) {
        const villaData = await villaResponse.json();
        console.log('✅ НАЙДЕН через прямой запрос!');
        console.log(`   Название: ${villaData.data?.attributes?.title}`);
        console.log(`   Property ID: ${villaData.data?.relationships?.property?.data?.id}`);
      } else {
        console.log(`❌ НЕ НАЙДЕН (статус: ${villaResponse.status})`);
      }
    } catch (e) {
      console.log('❌ Ошибка запроса:', e.message);
    }
    
    // Suite
    console.log('\n🏠 Deluxe Suite Apartment:');
    const suiteRoomUrl = `${BASE_URL}/room_types/${suiteRoomTypeId}`;
    try {
      const suiteResponse = await fetch(suiteRoomUrl, {
        headers: {
          'user-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (suiteResponse.ok) {
        const suiteData = await suiteResponse.json();
        console.log('✅ НАЙДЕН через прямой запрос!');
        console.log(`   Название: ${suiteData.data?.attributes?.title}`);
        console.log(`   Property ID: ${suiteData.data?.relationships?.property?.data?.id}`);
      } else {
        console.log(`❌ НЕ НАЙДЕН (статус: ${suiteResponse.status})`);
      }
    } catch (e) {
      console.log('❌ Ошибка запроса:', e.message);
    }
    
    // 2. Получаем все Room Types для property
    console.log('\n\n📋 Room Types через filter по property:');
    console.log('=========================================');
    const roomTypesUrl = `${BASE_URL}/room_types?property_id=${PROPERTY_ID}`;
    const roomTypesResponse = await fetch(roomTypesUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    const roomTypesData = await roomTypesResponse.json();
    
    console.log(`Всего найдено: ${roomTypesData.data?.length || 0} room types`);
    
    if (roomTypesData.data && roomTypesData.data.length > 0) {
      roomTypesData.data.forEach(rt => {
        console.log(`\n   ${rt.attributes.title}:`);
        console.log(`     ID: ${rt.id}`);
        
        if (rt.id === villaRoomTypeId) {
          console.log('     ✅ Это Villa First Floor!');
        }
        if (rt.id === suiteRoomTypeId) {
          console.log('     ✅ Это Deluxe Suite!');
        }
      });
    } else {
      console.log('❌ Пустой ответ от API');
    }
    
    // 3. Проверяем альтернативный способ получения
    console.log('\n\n📋 Альтернативный запрос (без фильтра):');
    console.log('=========================================');
    const allRoomTypesUrl = `${BASE_URL}/room_types`;
    const allResponse = await fetch(allRoomTypesUrl, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    const allData = await allResponse.json();
    
    console.log(`Всего room types без фильтра: ${allData.data?.length || 0}`);
    
    // Фильтруем по нашему property
    const ourRooms = allData.data?.filter(rt => 
      rt.relationships?.property?.data?.id === PROPERTY_ID
    );
    
    console.log(`Из них для нашего property: ${ourRooms?.length || 0}`);
    
    if (ourRooms && ourRooms.length > 0) {
      ourRooms.forEach(rt => {
        console.log(`   - ${rt.attributes.title} (${rt.id})`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('💡 ВЫВОДЫ:');
    console.log('==========');
    console.log('Если Villa отображается, а Suite нет - проблема в конфигурации Suite в Channex.');
    console.log('Если оба не отображаются - проблема с property_id или API доступом.');
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error.message);
  }
}

testVillaAndSuite();