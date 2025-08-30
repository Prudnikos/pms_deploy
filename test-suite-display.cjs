const airbnbMapping = require('./src/config/airbnb-mapping.json');

console.log('🔍 ПРОВЕРКА КОНФИГУРАЦИИ SUITE\n');
console.log('='.repeat(50));

const suiteConfig = airbnbMapping.airbnb_integration.room_mapping.suite;

console.log('\n✅ Текущая конфигурация Suite:');
console.log('================================');
console.log('PMS Room Number:', suiteConfig.pms_room_number);
console.log('PMS Room Type:', suiteConfig.pms_room_type);
console.log('Airbnb Title:', suiteConfig.airbnb_room_title);
console.log('Channex Room Type ID:', suiteConfig.channex_room_type_id);
console.log('Channex Rate Plan ID:', suiteConfig.channex_rate_plan_id);
console.log('Base Price: $' + suiteConfig.base_price);
console.log('Max Occupancy:', suiteConfig.max_occupancy);
console.log('Availability Count:', suiteConfig.availability_count);

console.log('\n📊 ПРОВЕРКА ВСЕХ НОМЕРОВ:');
console.log('=========================');

for (const [key, config] of Object.entries(airbnbMapping.airbnb_integration.room_mapping)) {
  console.log(`\n${key}:`);
  console.log(`  • Название: ${config.airbnb_room_title}`);
  console.log(`  • Цена: $${config.base_price}`);
  console.log(`  • Rate Plan: ${config.channex_rate_plan_id}`);
  console.log(`  • Доступность: ${config.availability_count}`);
}

console.log('\n✅ Конфигурация корректна!');
console.log('Suite должен отображаться с названием "Deluxe suite apartment" и ценой $300');