// Проверяем настройки webhook в Channex
import fetch from 'node-fetch';

const CHANNEX_API_URL = 'https://staging.channex.io/api/v1';
const CHANNEX_API_KEY = 'uUdBtyJdPAYoP0m0qrEStPh2WJcXCBBBLMngnPxygFWpw0GyDE/nmvN/6wN7gXV+';
const PROPERTY_ID = '6ae9708a-cbaa-4134-bf04-29314e842709';

async function checkWebhookSettings() {
  console.log('🔍 Проверяем настройки webhook в Channex...');
  
  try {
    // Проверяем webhook настройки для property
    const response = await fetch(`${CHANNEX_API_URL}/properties/${PROPERTY_ID}/webhooks`, {
      headers: {
        'user-api-key': CHANNEX_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const webhooks = await response.json();
      console.log('📋 Настройки webhook:', JSON.stringify(webhooks, null, 2));
      return webhooks;
    } else {
      console.error('❌ Ошибка получения webhook настроек:', response.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Ошибка запроса:', error.message);
  }
}

async function testChannexWebhook() {
  console.log('🧪 Тестируем создание реального webhook события...');
  
  try {
    // Создаем тестовое бронирование которое должно триггернуть webhook
    const testBooking = {
      booking: {
        property_id: PROPERTY_ID,
        ota_reservation_code: `WEBHOOK-TEST-${Date.now()}`,
        ota_name: 'Airbnb',
        arrival_date: '2025-08-30',
        departure_date: '2025-08-31',
        currency: 'USD',
        arrival_hour: '15:00',
        
        customer: {
          name: 'Webhook',
          surname: 'TestUser',
          mail: 'webhook-test@airbnb.com',
          phone: '+1234567890',
          country: 'US',
          language: 'en'
        },
        
        rooms: [{
          room_type_id: '8df610ce-cabb-429d-98d0-90c33f451d97',
          rate_plan_id: '8212ad16-0057-496b-8b0b-54d741841852',
          days: {
            '2025-08-30': 100
          },
          occupancy: {
            adults: 2,
            children: 0,
            infants: 0
          },
          guests: [{
            name: 'Webhook',
            surname: 'TestUser'
          }]
        }],
        
        services: [],
        notes: 'Тестовое бронирование для проверки webhook',
        
        meta: {
          source: 'Airbnb',
          test_webhook: true
        }
      }
    };

    console.log('📤 Создаем тестовое бронирование в Channex...');
    
    const response = await fetch(`${CHANNEX_API_URL}/bookings`, {
      method: 'POST',
      headers: {
        'user-api-key': CHANNEX_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testBooking)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Бронирование создано:', result.data?.id);
      console.log('⏳ Ждем webhook от Channex...');
      return result.data?.id;
    } else {
      const errorText = await response.text();
      console.error('❌ Ошибка создания:', response.status, errorText);
      return null;
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    return null;
  }
}

async function main() {
  console.log('🔗 Проверка webhook интеграции Channex → PMS');
  console.log('');
  
  // 1. Проверяем настройки webhook
  await checkWebhookSettings();
  
  console.log('');
  
  // 2. Создаем тестовое бронирование для webhook
  const bookingId = await testChannexWebhook();
  
  if (bookingId) {
    console.log('');
    console.log('📋 Инструкция для проверки:');
    console.log('1. Создали бронирование:', bookingId);
    console.log('2. Channex должен отправить webhook на: https://pms.voda.center/api/channex/webhook');
    console.log('3. Бронирование должно появиться в PMS через ~30 секунд');
    console.log('4. Проверьте страницу Bookings в PMS');
  }
}

main().catch(console.error);