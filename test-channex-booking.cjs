// Тест создания бронирования в Channex (CommonJS)
const path = require('path');

// Простой тест API запроса к Channex
async function testChannexAPI() {
  console.log('🧪 Начинаем тест Channex API');
  
  const baseURL = 'https://staging.channex.io/api/v1';
  const apiKey = 'uUdBtyJdPAYoP0m0qrEStPh2WJcXCBBBLMngnPxygFWpw0GyDE/nmvN/6wN7gXV+';
  const propertyId = '6ae9708a-cbaa-4134-bf04-29314e842709';
  
  // Тестовое бронирование с обязательными полями
  const testBooking = {
    booking: {
      property_id: propertyId,
      ota_reservation_code: 'PMS-TEST-101',
      ota_name: 'Booking.com',
      arrival_date: '2025-08-28',
      departure_date: '2025-08-30',
      currency: 'GBP', // Обязательное поле
      
      customer: {
        name: 'John',
        surname: 'Doe',
        mail: 'john.doe@example.com',
        country: 'GB'
      },
      
      rooms: [{
        room_type_id: 'placeholder', // Будет заменен на реальный ID
        rate_plan_id: 'placeholder', // Будет заменен на реальный ID
        days: {
          '2025-08-28': '200.00',
          '2025-08-29': '200.00'
        },
        occupancy: { 
          adults: 1,
          children: 0
        }
      }]
    }
  };
  
  try {
    console.log('📋 Тестовые данные:');
    console.log('   Property ID:', propertyId);
    console.log('   API URL:', baseURL);
    console.log('   Reservation Code:', testBooking.booking.ota_reservation_code);
    console.log('   Guest:', testBooking.booking.customer.name, testBooking.booking.customer.surname);
    console.log('   Dates:', testBooking.booking.arrival_date, '-', testBooking.booking.departure_date);
    console.log('   OTA Name:', testBooking.booking.ota_name);
    console.log('   Country:', testBooking.booking.customer.country);
    console.log('   Email field:', testBooking.booking.customer.mail);
    
    console.log('\n📤 Отправляем запрос в Channex...');
    
    // Сначала получим доступные типы комнат
    console.log('\n🏠 Получаем типы комнат из Channex...');
    const roomTypesResponse = await fetch(`${baseURL}/room_types?filter[property_id]=${propertyId}`, {
      method: 'GET',
      headers: {
        'user-api-key': apiKey,
        'Content-Type': 'application/json',
      }
    });
    
    if (!roomTypesResponse.ok) {
      const errorText = await roomTypesResponse.text();
      console.error('❌ Ошибка получения типов комнат:', errorText);
      return;
    }
    
    const roomTypesData = await roomTypesResponse.json();
    console.log('📋 Доступные типы комнат:');
    roomTypesData.data?.forEach((rt, index) => {
      console.log(`   ${index + 1}. ID: ${rt.id}`);
      console.log(`      Title: "${rt.attributes?.title}"`);
      console.log('      ---');
    });
    
    // Получаем rate plans
    console.log('\n💰 Получаем тарифные планы из Channex...');
    const ratePlansResponse = await fetch(`${baseURL}/rate_plans?filter[property_id]=${propertyId}`, {
      method: 'GET', 
      headers: {
        'user-api-key': apiKey,
        'Content-Type': 'application/json',
      }
    });
    
    if (!ratePlansResponse.ok) {
      const errorText = await ratePlansResponse.text();
      console.error('❌ Ошибка получения тарифных планов:', errorText);
      return;
    }
    
    const ratePlansData = await ratePlansResponse.json();
    console.log('📋 Доступные тарифные планы:');
    ratePlansData.data?.forEach((rp, index) => {
      console.log(`   ${index + 1}. ID: ${rp.id}`);
      console.log(`      Title: "${rp.attributes?.title}"`);
      console.log(`      Room Type ID: ${rp.relationships?.room_type?.data?.id}`);
      console.log('      ---');
    });
    
    // Обновляем тестовое бронирование с реальными ID
    if (roomTypesData.data && roomTypesData.data.length > 0) {
      const firstRoomType = roomTypesData.data[0];
      testBooking.booking.rooms[0].room_type_id = firstRoomType.id;
      
      // Ищем соответствующий rate plan
      const matchingRatePlan = ratePlansData.data?.find(rp => 
        rp.relationships?.room_type?.data?.id === firstRoomType.id
      );
      
      if (matchingRatePlan) {
        testBooking.booking.rooms[0].rate_plan_id = matchingRatePlan.id;
        console.log(`\n✅ Используем Room Type: ${firstRoomType.attributes?.title} (${firstRoomType.id})`);
        console.log(`✅ Используем Rate Plan: ${matchingRatePlan.attributes?.title} (${matchingRatePlan.id})`);
      }
    }
    
    console.log('\n📤 Отправляем бронирование в Channex...');
    console.log('📋 Финальные данные:', JSON.stringify(testBooking, null, 2));
    
    const response = await fetch(`${baseURL}/bookings`, {
      method: 'POST',
      headers: {
        'user-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testBooking)
    });
    
    const responseText = await response.text();
    console.log(`📡 Ответ API: ${response.status}`);
    console.log('📄 Полный ответ:', responseText);
    
    if (!response.ok) {
      console.error('❌ Ошибка создания бронирования');
      try {
        const errorData = JSON.parse(responseText);
        console.error('📄 Детали ошибки:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.error('📄 Ошибка как текст:', responseText);
      }
      return;
    }
    
    const responseData = JSON.parse(responseText);
    console.log('✅ Бронирование создано успешно!');
    console.log('📋 ID бронирования:', responseData.data?.id);
    console.log('📋 Статус:', responseData.data?.attributes?.status);
    
  } catch (error) {
    console.error('💥 Ошибка теста:', error.message);
    console.error('🔍 Stack trace:', error.stack);
  }
  
  console.log('\n🏁 Тест завершен');
}

// Запускаем тест
testChannexAPI();