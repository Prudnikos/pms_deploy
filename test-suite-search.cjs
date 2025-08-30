const airbnbMapping = require('./src/config/airbnb-mapping.json');

console.log('🔍 ТЕСТИРОВАНИЕ ОТОБРАЖЕНИЯ SUITE В ПОИСКЕ\n');
console.log('='.repeat(50));

const suiteConfig = airbnbMapping.airbnb_integration.room_mapping.suite;

console.log('\n📋 Конфигурация Suite:');
console.log('=======================');
console.log('Название:', suiteConfig.airbnb_room_title);
console.log('Rate Plan ID:', suiteConfig.channex_rate_plan_id);
console.log('Room Type ID:', suiteConfig.channex_room_type_id);
console.log('Цена:', '$' + suiteConfig.base_price);
console.log('Вместимость:', suiteConfig.max_occupancy, 'человек');
console.log('Доступность:', suiteConfig.availability_count);

console.log('\n🔍 Проверка фильтрации по количеству гостей:');
console.log('=============================================');

const testCases = [2, 4, 6, 8];

for (const guests of testCases) {
  console.log(`\nПоиск для ${guests} гостей:`);
  
  for (const [key, config] of Object.entries(airbnbMapping.airbnb_integration.room_mapping)) {
    const hasCapacity = config.max_occupancy >= guests;
    const symbol = hasCapacity ? '✅' : '❌';
    console.log(`  ${symbol} ${config.airbnb_room_title}: вместимость ${config.max_occupancy} >= ${guests} = ${hasCapacity}`);
  }
}

console.log('\n⚠️ ВАЖНЫЕ МОМЕНТЫ:');
console.log('==================');
console.log('1. Suite теперь вмещает 6 человек');
console.log('2. Suite должен показываться для поиска до 6 гостей');
console.log('3. Если Suite не показывается, проверьте:');
console.log('   - Есть ли availability данные от Channex API');
console.log('   - Правильный ли rate_plan_id используется');
console.log('   - Не блокируется ли номер другими условиями');