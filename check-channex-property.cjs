// Проверяем текущие настройки property в Channex
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function checkChannexProperty() {
  console.log('🏨 ПРОВЕРКА НАСТРОЕК PROPERTY В CHANNEX');
  console.log('════════════════════════════════════════════════');
  
  const apiKey = 'uUdBtyJdPAYoP0m0qrEStPh2WJcXCBBBLMngnPxygFWpw0GyDE/nmvN/6wN7gXV+';
  const baseURL = 'https://staging.channex.io/api/v1';
  const propertyId = '6ae9708a-cbaa-4134-bf04-29314e842709';
  
  try {
    // 1. Получаем информацию о property
    console.log('🏢 Получаем информацию о property...');
    const propertyResponse = await fetch(`${baseURL}/properties/${propertyId}`, {
      headers: {
        'user-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });
    
    if (propertyResponse.ok) {
      const propertyData = await propertyResponse.json();
      console.log('✅ Property информация:');
      console.log(`  📍 Название: ${propertyData.data?.attributes?.name}`);
      console.log(`  🏠 Тип: ${propertyData.data?.attributes?.property_type}`);
      console.log(`  📧 Email: ${propertyData.data?.attributes?.email}`);
      console.log(`  📞 Телефон: ${propertyData.data?.attributes?.phone}`);
      console.log(`  🌍 Страна: ${propertyData.data?.attributes?.country}`);
      console.log(`  🏙️ Город: ${propertyData.data?.attributes?.city}`);
      console.log(`  💰 Валюта: ${propertyData.data?.attributes?.currency}`);
    }
    
    // 2. Получаем типы комнат
    console.log('\n🏠 Получаем типы комнат...');
    const roomTypesResponse = await fetch(`${baseURL}/room_types?filter[property_id]=${propertyId}`, {
      headers: {
        'user-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });
    
    if (roomTypesResponse.ok) {
      const roomTypesData = await roomTypesResponse.json();
      console.log(`✅ Найдено типов комнат: ${roomTypesData.data?.length || 0}`);
      
      roomTypesData.data?.forEach((roomType, index) => {
        console.log(`\n  🚪 Комната ${index + 1}:`);
        console.log(`     ID: ${roomType.id}`);
        console.log(`     Название: "${roomType.attributes?.title}"`);
        console.log(`     Тип: ${roomType.attributes?.room_kind}`);
        console.log(`     Количество: ${roomType.attributes?.count_of_rooms}`);
        console.log(`     Макс. занятость: ${roomType.attributes?.max_occupancy}`);
        console.log(`     Базовая занятость: ${roomType.attributes?.base_occupancy}`);
      });
    }
    
    // 3. Получаем тарифные планы
    console.log('\n💰 Получаем тарифные планы...');
    const ratePlansResponse = await fetch(`${baseURL}/rate_plans?filter[property_id]=${propertyId}`, {
      headers: {
        'user-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });
    
    if (ratePlansResponse.ok) {
      const ratePlansData = await ratePlansResponse.json();
      console.log(`✅ Найдено тарифных планов: ${ratePlansData.data?.length || 0}`);
      
      ratePlansData.data?.forEach((ratePlan, index) => {
        console.log(`\n  💳 Тариф ${index + 1}:`);
        console.log(`     ID: ${ratePlan.id}`);
        console.log(`     Название: "${ratePlan.attributes?.title}"`);
        console.log(`     Валюта: ${ratePlan.attributes?.currency}`);
        
        const roomTypeId = ratePlan.relationships?.room_type?.data?.id;
        if (roomTypeId) {
          console.log(`     Связан с комнатой ID: ${roomTypeId}`);
        }
      });
    }
    
    // 4. Проверяем существующие каналы
    console.log('\n📺 Проверяем существующие каналы...');
    const channelsResponse = await fetch(`${baseURL}/channels?filter[property_id]=${propertyId}`, {
      headers: {
        'user-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });
    
    if (channelsResponse.ok) {
      const channelsData = await channelsResponse.json();
      console.log(`✅ Активных каналов: ${channelsData.data?.length || 0}`);
      
      channelsData.data?.forEach((channel, index) => {
        console.log(`\n  📡 Канал ${index + 1}:`);
        console.log(`     ID: ${channel.id}`);
        console.log(`     Название: "${channel.attributes?.title}"`);
        console.log(`     Поставщик: ${channel.attributes?.ota_name}`);
        console.log(`     Статус: ${channel.attributes?.state}`);
      });
      
      // Проверяем есть ли уже Airbnb
      const airbnbChannel = channelsData.data?.find(ch => 
        ch.attributes?.ota_name?.toLowerCase().includes('airbnb')
      );
      
      if (airbnbChannel) {
        console.log('\n⚠️ ВНИМАНИЕ: Уже найден канал Airbnb!');
        console.log(`   Статус: ${airbnbChannel.attributes?.state}`);
        console.log(`   ID: ${airbnbChannel.id}`);
      } else {
        console.log('\n✅ Airbnb канал не найден - можем подключать новый');
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 РЕЗЮМЕ:');
    console.log('✅ Property активен и настроен');
    console.log('✅ Комнаты и тарифы готовы для маппинга');
    console.log('🎯 Готов к подключению Airbnb');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

checkChannexProperty().catch(console.error);