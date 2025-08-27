// Тест создания бронирования в Channex
import channexService from './src/services/channex/ChannexService.jsx';

// Тестовые данные для бронирований
const testBookings = [
  {
    id: 'test-101',
    room_id: 'room-101',
    check_in: '2025-08-28',
    check_out: '2025-08-30',
    source: 'Open Channel',
    guests: {
      full_name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+44 123 456 789',
      address: '123 Test Street',
      city: 'London',
      country: 'GB'
    },
    guests_count: 2,
    total_amount: 200,
    notes: 'Тестовое бронирование для номера 101'
  },
  {
    id: 'test-201',
    room_id: 'room-201', 
    check_in: '2025-08-29',
    check_out: '2025-08-31',
    source: 'Open Channel',
    guests: {
      full_name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+44 987 654 321',
      address: '456 Another Street',
      city: 'Manchester',
      country: 'GB'
    },
    guests_count: 1,
    total_amount: 400,
    notes: 'Тестовое бронирование для номера 201'
  }
];

async function testChannexBooking() {
  console.log('🧪 Начинаем тест создания бронирований в Channex');
  
  try {
    // Тестируем каждое бронирование
    for (const booking of testBookings) {
      console.log(`\n📋 Тестируем бронирование ${booking.id}:`);
      console.log(`   Комната: ${booking.room_id}`);
      console.log(`   Даты: ${booking.check_in} - ${booking.check_out}`);
      console.log(`   Гость: ${booking.guests.full_name}`);
      console.log(`   Источник: ${booking.source}`);
      
      try {
        const result = await channexService.createBookingInChannex(booking);
        console.log(`✅ Бронирование ${booking.id} успешно создано:`, result?.id);
      } catch (error) {
        console.error(`❌ Ошибка создания бронирования ${booking.id}:`, error.message);
        console.error('   Детали ошибки:', error.stack);
      }
    }
    
  } catch (error) {
    console.error('💥 Общая ошибка теста:', error);
  }
  
  console.log('\n🏁 Тест завершен');
}

// Запускаем тест
testChannexBooking();