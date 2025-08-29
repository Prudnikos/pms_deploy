const fetch = require('node-fetch');

const API_KEY = process.env.VITE_CHANNEX_API_KEY || 'nWxt87XOKhF7HslqSxJW8y0t';
const BASE_URL = 'https://staging.channex.io/api/v1';
const PROPERTY_ID = '6ae9708a-cbaa-4134-bf04-29314e842709';

async function checkSuiteAvailability() {
  console.log('🔍 Проверяем availability для Suite...\n');
  
  try {
    // Проверяем availability для правильного rate plan Suite
    const suiteRatePlanId = '45195f3e-fb59-4ddf-9e29-b667dbe2ab58';
    const dates = ['2025-09-01', '2025-09-02', '2025-09-03'];
    
    console.log('📅 Проверяем даты:', dates.join(', '));
    console.log('🔑 Suite Rate Plan ID:', suiteRatePlanId);
    console.log('');
    
    const url = `${BASE_URL}/availability?filter[property_id]=${PROPERTY_ID}&filter[rate_plan_id]=${suiteRatePlanId}&filter[date]=${dates.join(',')}`;
    
    console.log('🌐 Запрос:', url);
    console.log('');
    
    const response = await fetch(url, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      console.log('✅ Найдены данные availability для Suite:\n');
      data.data.forEach(item => {
        console.log(`  📅 ${item.attributes.date}: ${item.attributes.availability} доступно`);
      });
    } else {
      console.log('❌ Нет данных availability для Suite rate plan');
      console.log('📝 Это может быть причиной, почему Suite не показывается в поиске');
    }
    
    // Проверяем также старый rate plan ID (который был у Deluxe)
    console.log('\n🔍 Проверяем старый rate plan ID (для сравнения)...');
    const oldRatePlanId = '0661e606-18e5-4ad3-bda0-ade13d29b76b';
    
    const url2 = `${BASE_URL}/availability?filter[property_id]=${PROPERTY_ID}&filter[rate_plan_id]=${oldRatePlanId}&filter[date]=${dates.join(',')}`;
    
    const response2 = await fetch(url2, {
      headers: {
        'user-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const data2 = await response2.json();
    
    if (data2.data && data2.data.length > 0) {
      console.log('📊 Данные для старого rate plan (Deluxe):\n');
      data2.data.forEach(item => {
        console.log(`  📅 ${item.attributes.date}: ${item.attributes.availability} доступно`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkSuiteAvailability();