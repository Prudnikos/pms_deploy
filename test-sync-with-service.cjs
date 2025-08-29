/**
 * Тестирование синхронизации через AirbnbChannexService
 */

const { config } = require('dotenv');

// Загружаем переменные окружения
config({ path: '.env.local' });

// Импортируем сервис (используем dynamic import)
async function testWithService() {
  console.log('🧪 Тестирование синхронизации через AirbnbChannexService');
  
  try {
    // Динамический импорт модуля
    const AirbnbChannexService = (await import('./src/services/airbnb/AirbnbChannexService.jsx')).default;
    
    const BOOKING_ID = '00be50a6-ef60-4d18-bcf5-9cf046603141';
    
    console.log('📋 Booking ID:', BOOKING_ID);
    console.log('🔄 Синхронизация через сервис...');
    
    // Используем метод из сервиса
    const result = await AirbnbChannexService.syncBookingById(BOOKING_ID);
    
    console.log('🎉 Успешно! Бронирование синхронизировано:');
    console.log('✅ Результат:', result?.[0]);
    
  } catch (error) {
    console.error('💥 Ошибка тестирования:', error);
  }
}

// Запускаем тест
testWithService();