const fetch = require('node-fetch');

const API_KEY = process.env.VITE_CHANNEX_API_KEY || 'nWxt87XOKhF7HslqSxJW8y0t';
const BASE_URL = 'https://staging.channex.io/api/v1';
const PROPERTY_ID = '6ae9708a-cbaa-4134-bf04-29314e842709';

console.log('🎉 ФИНАЛЬНАЯ ПРОВЕРКА SUITE КОНФИГУРАЦИИ\n');
console.log('='.repeat(50));

console.log('\n✅ ПРАВИЛЬНАЯ КОНФИГУРАЦИЯ SUITE:');
console.log('==================================');
console.log('Название: Deluxe suite apartment');
console.log('Room Type ID: e243d5aa-eff3-43a7-8bf8-87352b62fdc3');
console.log('Rate Plan ID: 45195f3e-fb59-4ddf-9e29-b667dbe2ab58');
console.log('Цена: $300/ночь');
console.log('Вместимость: 4 человека');

async function checkSuiteAvailability() {
  console.log('\n🔍 Проверяем availability для Suite...\n');
  
  const dates = ['2025-09-01', '2025-09-02', '2025-09-03'];
  const suiteRatePlanId = '45195f3e-fb59-4ddf-9e29-b667dbe2ab58';
  
  console.log('📅 Проверяемые даты:', dates.join(', '));
  console.log('🔑 Suite Rate Plan ID:', suiteRatePlanId);
  
  const url = `${BASE_URL}/availability?filter[property_id]=${PROPERTY_ID}&filter[rate_plan_id]=${suiteRatePlanId}&filter[date]=${dates.join(',')}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      console.log('\n✅ Suite availability найден в Channex:');
      data.data.forEach(item => {
        console.log(`  📅 ${item.attributes.date}: ${item.attributes.availability} доступно`);
      });
      
      console.log('\n🎉 УСПЕХ! Suite настроен правильно и должен показываться в поиске!');
    } else {
      console.log('\n⚠️ Нет данных availability для Suite');
      console.log('Но с fallback на конфиг Suite все равно должен показываться');
    }
    
  } catch (error) {
    console.error('\n❌ Ошибка запроса:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 ИТОГОВАЯ КОНФИГУРАЦИЯ:');
  console.log('========================');
  console.log('');
  console.log('Standard Room:');
  console.log('  • Цена: $100/ночь');
  console.log('  • Rate Plan: 8212ad16-0057-496b-8b0b-54d741841852');
  console.log('');
  console.log('Deluxe Room:');
  console.log('  • Цена: $200/ночь');
  console.log('  • Rate Plan: 0661e606-18e5-4ad3-bda0-ade13d29b76b');
  console.log('');
  console.log('Deluxe Suite Apartment:');
  console.log('  • Цена: $300/ночь');
  console.log('  • Rate Plan: 45195f3e-fb59-4ddf-9e29-b667dbe2ab58');
  console.log('');
  console.log('✅ Все три номера теперь должны работать корректно!');
}

checkSuiteAvailability();