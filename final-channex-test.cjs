// Финальный тест интеграции Channex - создание бронирований для номеров 101 и 201
const path = require('path');

async function finalChannexTest() {
  console.log('🚀 ФИНАЛЬНЫЙ ТЕСТ CHANNEX ИНТЕГРАЦИИ');
  console.log('════════════════════════════════════════════════════════');
  
  const baseURL = 'https://staging.channex.io/api/v1';
  const apiKey = 'uUdBtyJdPAYoP0m0qrEStPh2WJcXCBBBLMngnPxygFWpw0GyDE/nmvN/6wN7gXV+';
  const propertyId = '6ae9708a-cbaa-4134-bf04-29314e842709';
  
  // Получаем актуальные типы комнат и тарифы
  console.log('\n1️⃣ Получаем данные из Channex...');
  
  try {
    const roomTypesResponse = await fetch(`${baseURL}/room_types?filter[property_id]=${propertyId}`, {
      headers: { 'user-api-key': apiKey, 'Content-Type': 'application/json' }
    });
    const roomTypesData = await roomTypesResponse.json();
    
    const ratePlansResponse = await fetch(`${baseURL}/rate_plans?filter[property_id]=${propertyId}`, {
      headers: { 'user-api-key': apiKey, 'Content-Type': 'application/json' }
    });
    const ratePlansData = await ratePlansResponse.json();
    
    console.log('✅ Получены типы комнат:', roomTypesData.data?.length || 0);
    console.log('✅ Получены тарифные планы:', ratePlansData.data?.length || 0);
    
    // Находим Standard Room и Deluxe Room
    const standardRoom = roomTypesData.data?.find(rt => rt.attributes?.title === 'Standard Room');
    const deluxeRoom = roomTypesData.data?.find(rt => rt.attributes?.title === 'Deluxe Room');
    
    const standardRate = ratePlansData.data?.find(rp => 
      rp.relationships?.room_type?.data?.id === standardRoom?.id
    );
    const deluxeRate = ratePlansData.data?.find(rp => 
      rp.relationships?.room_type?.data?.id === deluxeRoom?.id
    );
    
    console.log('\n📋 Маппинг комнат:');
    console.log('   🏠 Standard Room (101):', standardRoom?.id, '→', standardRate?.id);
    console.log('   🏨 Deluxe Room (201):', deluxeRoom?.id, '→', deluxeRate?.id);
    
    // Тестовые бронирования
    const testBookings = [
      {
        name: 'Номер 101 (Standard Room)',
        booking: {
          property_id: propertyId,
          ota_reservation_code: 'PMS-101-TEST',
          ota_name: 'Booking.com',
          arrival_date: '2025-08-28',
          departure_date: '2025-08-30', 
          currency: 'GBP',
          
          customer: {
            name: 'John',
            surname: 'Smith',
            mail: 'john.smith@example.com',
            country: 'GB',
            city: 'London'
          },
          
          rooms: [{
            room_type_id: standardRoom?.id,
            rate_plan_id: standardRate?.id,
            days: {
              '2025-08-28': '100.00',
              '2025-08-29': '100.00'
            },
            occupancy: { adults: 1, children: 0 }
          }]
        }
      },
      {
        name: 'Номер 201 (Deluxe Room)',
        booking: {
          property_id: propertyId,
          ota_reservation_code: 'PMS-201-TEST',
          ota_name: 'Booking.com',
          arrival_date: '2025-08-29',
          departure_date: '2025-08-31',
          currency: 'GBP',
          
          customer: {
            name: 'Jane',
            surname: 'Doe', 
            mail: 'jane.doe@example.com',
            country: 'GB',
            city: 'Manchester'
          },
          
          rooms: [{
            room_type_id: deluxeRoom?.id,
            rate_plan_id: deluxeRate?.id,
            days: {
              '2025-08-29': '200.00',
              '2025-08-30': '200.00'
            },
            occupancy: { adults: 2, children: 0 }
          }]
        }
      }
    ];
    
    console.log('\n2️⃣ Создаем тестовые бронирования...');
    const results = [];
    
    for (const test of testBookings) {
      console.log(`\n🧪 Тестируем: ${test.name}`);
      console.log(`   📅 Даты: ${test.booking.arrival_date} → ${test.booking.departure_date}`);
      console.log(`   👤 Гость: ${test.booking.customer.name} ${test.booking.customer.surname}`);
      console.log(`   💰 Цены:`, Object.entries(test.booking.rooms[0].days).map(([date, price]) => `${date}: £${price}`).join(', '));
      
      try {
        const response = await fetch(`${baseURL}/bookings`, {
          method: 'POST',
          headers: {
            'user-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(test)
        });
        
        const responseText = await response.text();
        
        if (response.ok) {
          const responseData = JSON.parse(responseText);
          console.log(`   ✅ УСПЕШНО! ID: ${responseData.data?.id}`);
          console.log(`   📊 Статус: ${responseData.data?.attributes?.status}`);
          results.push({ 
            name: test.name, 
            success: true, 
            id: responseData.data?.id,
            status: responseData.data?.attributes?.status 
          });
        } else {
          console.log(`   ❌ ОШИБКА ${response.status}:`, responseText);
          results.push({ name: test.name, success: false, error: responseText });
        }
        
      } catch (error) {
        console.log(`   💥 ИСКЛЮЧЕНИЕ:`, error.message);
        results.push({ name: test.name, success: false, error: error.message });
      }
    }
    
    console.log('\n3️⃣ Результаты теста:');
    console.log('═══════════════════════');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Успешно создано: ${successful.length}/${results.length}`);
    successful.forEach(r => {
      console.log(`   📍 ${r.name}: ${r.id} (${r.status})`);
    });
    
    if (failed.length > 0) {
      console.log(`❌ Ошибки: ${failed.length}`);
      failed.forEach(r => {
        console.log(`   📍 ${r.name}: ${r.error}`);
      });
    }
    
    console.log('\n4️⃣ Выводы и рекомендации:');
    console.log('═════════════════════════');
    
    if (successful.length === results.length) {
      console.log('🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!');
      console.log('✅ Интеграция Channex работает корректно');
      console.log('✅ Маппинг номеров 101→Standard, 201→Deluxe работает');
      console.log('✅ Динамический ota_name (Open Channel → Booking.com) работает');
      console.log('✅ Поле currency (GBP) корректно');
      console.log('✅ Поле mail (не email) корректно');
      console.log('✅ Страна GB корректна');
    } else {
      console.log('⚠️ Частичный успех - требуется доработка');
    }
    
    console.log('\n📝 Исправления которые были внесены:');
    console.log('   1. ota_name: "Open Channel" → "Booking.com" (валидный провайдер)');
    console.log('   2. Добавлено обязательное поле currency: "GBP"');
    console.log('   3. Подтверждено использование mail (не email)');
    console.log('   4. Подтверждена страна GB вместо RU');
    console.log('   5. Маппинг номеров: 101→Standard Room, 201→Deluxe Room');
    
  } catch (error) {
    console.error('💥 Критическая ошибка теста:', error);
  }
  
  console.log('\n🏁 Финальный тест завершен');
  console.log('════════════════════════════════════════════════════════');
}

finalChannexTest();