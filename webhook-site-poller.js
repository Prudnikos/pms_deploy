// Скрипт для получения webhook данных с webhook.site и пересылки на наш endpoint
import fetch from 'node-fetch';

const WEBHOOK_SITE_TOKEN = '995bf7d4-49d3-425c-a640-8574f3b4f4c8';
const OUR_ENDPOINT = 'https://pms.voda.center/api/channex/webhook';

let lastRequestId = null;

async function checkAndRelay() {
  try {
    // Получаем последние запросы с webhook.site
    const response = await fetch(`https://webhook.site/token/${WEBHOOK_SITE_TOKEN}/requests`);
    const requests = await response.json();

    if (requests && requests.data && requests.data.length > 0) {
      const latestRequest = requests.data[0];
      
      // Если это новый запрос
      if (latestRequest.uuid !== lastRequestId) {
        console.log('🔔 Новый webhook получен с webhook.site:', latestRequest.uuid);
        
        try {
          // Пересылаем на наш endpoint
          const relayResponse = await fetch(OUR_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer hotel_pms_webhook_secret_2024'
            },
            body: latestRequest.content
          });

          const relayResult = await relayResponse.json();
          console.log('✅ Успешно переслано на наш endpoint:', relayResult);
          
        } catch (relayError) {
          console.error('❌ Ошибка пересылки:', relayError.message);
        }

        lastRequestId = latestRequest.uuid;
      }
    }
  } catch (error) {
    console.error('❌ Ошибка получения с webhook.site:', error.message);
  }
}

console.log('🚀 Запускаем poller для webhook.site...');
console.log(`📡 Мониторим: https://webhook.site/${WEBHOOK_SITE_TOKEN}`);
console.log(`🎯 Пересылаем на: ${OUR_ENDPOINT}`);

// Проверяем каждые 5 секунд
setInterval(checkAndRelay, 5000);