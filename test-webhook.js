// Тест webhook endpoint для получения Airbnb бронирований
import fetch from 'node-fetch';

async function testWebhook() {
  console.log('🧪 Тестирование webhook endpoint...');
  
  // Симулируем webhook от Channex с Airbnb бронированием
  const webhookPayload = {
    type: 'booking.created',
    id: `test-webhook-${Date.now()}`,
    object_type: 'booking',
    object_id: '81cb77eb-6ac0-45d1-858d-96da47c70df2',
    data: {
      id: '81cb77eb-6ac0-45d1-858d-96da47c70df2',
      attributes: {
        ota_name: 'Airbnb',
        ota_reservation_code: `AIRBNB-TEST-${Date.now()}`,
        arrival_date: '2025-08-30',
        departure_date: '2025-09-02',
        total_price: 300.00,
        currency: 'USD',
        status: 'confirmed',
        customer: {
          name: 'John',
          surname: 'Smith',
          mail: 'test@airbnb.com',
          phone: '+1 555 123 4567'
        },
        rooms: [{
          room_type_id: '8df610ce-cabb-429d-98d0-90c33f451d97',
          rate_plan_id: '8212ad16-0057-496b-8b0b-54d741841852',
          occupancy: {
            adults: 2,
            children: 0
          }
        }],
        notes: 'Тестовое webhook бронирование от Airbnb'
      }
    }
  };

  try {
    console.log('📤 Отправка webhook payload...');
    
    const response = await fetch('https://pms.voda.center/api/channex/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });

    const result = await response.text();
    console.log('📥 Ответ webhook:', response.status, result);

    if (response.ok) {
      console.log('✅ Webhook endpoint работает!');
      return true;
    } else {
      console.log('❌ Webhook endpoint вернул ошибку');
      return false;
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования webhook:', error.message);
    return false;
  }
}

testWebhook().then(success => {
  if (success) {
    console.log('🎉 Тест webhook успешен - цепочка Airbnb → Channex → PMS готова!');
  } else {
    console.log('❌ Тест webhook не прошел - нужна отладка');
  }
}).catch(console.error);