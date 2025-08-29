const fetch = require('node-fetch');

const API_KEY = process.env.VITE_CHANNEX_API_KEY || 'nWxt87XOKhF7HslqSxJW8y0t';
const BASE_URL = 'https://staging.channex.io/api/v1';
const PROPERTY_ID = '6ae9708a-cbaa-4134-bf04-29314e842709';

async function checkAllAvailability() {
  console.log('🔍 Проверяем availability для всех номеров...\n');
  
  const ratePlans = {
    'Standard': '8212ad16-0057-496b-8b0b-54d741841852',
    'Deluxe': '0661e606-18e5-4ad3-bda0-ade13d29b76b',
    'Suite': '45195f3e-fb59-4ddf-9e29-b667dbe2ab58'
  };
  
  const dates = ['2025-09-01', '2025-09-02', '2025-09-03'];
  
  console.log('📅 Проверяем даты:', dates.join(', '));
  console.log('');
  
  for (const [roomType, ratePlanId] of Object.entries(ratePlans)) {
    console.log(`\n🏠 ${roomType} Room:`);
    console.log('  Rate Plan ID:', ratePlanId);
    
    const url = `${BASE_URL}/availability?filter[property_id]=${PROPERTY_ID}&filter[rate_plan_id]=${ratePlanId}&filter[date]=${dates.join(',')}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'user-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        console.log('  ✅ Availability найден:');
        data.data.forEach(item => {
          console.log(`    📅 ${item.attributes.date}: ${item.attributes.availability} доступно`);
        });
      } else {
        console.log('  ❌ НЕТ данных availability!');
        console.log('  ⚠️ Это причина почему номер не показывается в поиске');
      }
      
    } catch (error) {
      console.error(`  ❌ Ошибка запроса: ${error.message}`);
    }
  }
  
  console.log('\n\n📊 ИТОГ:');
  console.log('Если у Suite нет данных availability, нужно:');
  console.log('1. Добавить availability в Channex для rate plan 45195f3e-fb59-4ddf-9e29-b667dbe2ab58');
  console.log('2. Или использовать fallback на config availability_count');
}

checkAllAvailability();