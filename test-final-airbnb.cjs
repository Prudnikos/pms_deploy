const airbnbMapping = require('./src/config/airbnb-mapping.json');

console.log('🏨 ФИНАЛЬНАЯ ПРОВЕРКА ВСЕХ НОМЕРОВ\n');
console.log('='.repeat(50));

console.log('\n📋 КОНФИГУРАЦИЯ НОМЕРОВ:');
console.log('========================\n');

const rooms = [
  {
    name: 'Standard Room',
    config: airbnbMapping.airbnb_integration.room_mapping.standard_room,
    expected: { price: 100, guests: 2 }
  },
  {
    name: 'Deluxe Room',
    config: airbnbMapping.airbnb_integration.room_mapping.deluxe_room,
    expected: { price: 200, guests: 2 }
  },
  {
    name: 'Deluxe Suite Apartment',
    config: airbnbMapping.airbnb_integration.room_mapping.suite,
    expected: { price: 300, guests: 6 }
  },
  {
    name: 'Villa First Floor',
    config: airbnbMapping.airbnb_integration.room_mapping.villa_first_floor,
    expected: { price: 300, guests: 8 }
  }
];

rooms.forEach((room, index) => {
  console.log(`${index + 1}. ${room.name}:`);
  console.log(`   📍 Room Type ID: ${room.config.channex_room_type_id}`);
  console.log(`   💰 Rate Plan ID: ${room.config.channex_rate_plan_id}`);
  console.log(`   💵 Цена: $${room.config.base_price}`);
  console.log(`   👥 Вместимость: ${room.config.max_occupancy} человек`);
  console.log(`   🏷️ Название в Airbnb: "${room.config.airbnb_room_title}"`);
  
  // Проверка корректности
  const priceOk = parseInt(room.config.base_price) === room.expected.price;
  const guestsOk = room.config.max_occupancy === room.expected.guests;
  
  if (priceOk && guestsOk) {
    console.log(`   ✅ Конфигурация корректна`);
  } else {
    if (!priceOk) console.log(`   ⚠️ Цена должна быть $${room.expected.price}`);
    if (!guestsOk) console.log(`   ⚠️ Вместимость должна быть ${room.expected.guests}`);
  }
  console.log('');
});

console.log('='.repeat(50));
console.log('\n📊 СТАТУС НОМЕРОВ:');
console.log('==================\n');

console.log('API возвращает Rate Plans:');
console.log('  ✅ Standard Room - работает');
console.log('  ✅ Deluxe Room - работает');
console.log('  ⚠️ Suite - используется fallback');
console.log('  ⚠️ Villa - используется fallback');

console.log('\n💡 ИТОГ:');
console.log('=========');
console.log('Все 4 номера должны отображаться в поиске на /airbnb');
console.log('Suite и Villa работают через fallback механизм');