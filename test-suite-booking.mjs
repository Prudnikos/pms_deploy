import AirbnbChannexService from './src/services/airbnb/AirbnbChannexService.jsx';

const airbnbService = new AirbnbChannexService();

async function testSuiteBooking() {
  console.log('🧪 Тестируем создание бронирования Suite...\n');
  
  const testBooking = {
    room_type: 'suite',  // Передаем suite
    check_in: '2025-09-10',
    check_out: '2025-09-12',
    guest_first_name: 'Test',
    guest_last_name: 'Suite',
    guest_email: 'test@suite.com',
    guest_phone: '+1234567890',
    adults: 2,
    children: 0,
    notes: 'Тестовое бронирование Suite',
    test: true
  };
  
  console.log('📋 Данные для бронирования:');
  console.log('   room_type:', testBooking.room_type);
  console.log('   guest:', testBooking.guest_first_name, testBooking.guest_last_name);
  console.log('   dates:', testBooking.check_in, '-', testBooking.check_out);
  console.log('');
  
  try {
    console.log('📤 Отправляем бронирование...\n');
    const result = await airbnbService.createAirbnbBooking(testBooking);
    console.log('✅ Результат:', result);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testSuiteBooking();