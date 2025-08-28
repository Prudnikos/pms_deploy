// Локальный тест webhook server для отладки Channex интеграции
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());

const supabaseUrl = 'https://zbhvwxpvlxqxadqzshfc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaHZ3eHB2bHhxeGFkcXpzaGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkyNTM3NCwiZXhwIjoyMDY3NTAxMzc0fQ.0kO3vG1OXNS05NPgm7MmcbkdMuLSG49GKwkCP4979tc';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Webhook endpoint точно как в Channex документации
app.post('/webhook', async (req, res) => {
  console.log('🔔 Получен webhook от Channex:');
  console.log('Headers:', req.headers);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  const { event, payload, property_id, user_id, timestamp } = req.body;
  
  try {
    // Сохраняем webhook в БД
    const { error: logError } = await supabase
      .from('channex_webhooks')
      .insert({
        event_type: event,
        event_id: `local-test-${Date.now()}`,
        object_type: event.includes('booking') ? 'booking' : 'other',
        object_id: payload?.booking_id || payload?.revision_id || 'unknown',
        payload: req.body,
        received_at: timestamp || new Date().toISOString(),
        processed: false
      });

    if (logError) {
      console.error('❌ Ошибка сохранения webhook:', logError);
    } else {
      console.log('✅ Webhook сохранен в БД');
    }

    // Обрабатываем booking events
    if (event === 'booking' && payload?.booking_id) {
      console.log('📋 Обрабатываем booking event:', payload.booking_id);
      
      // Получаем данные бронирования из Channex API
      const bookingData = await fetchBookingFromChannex(payload.booking_id);
      if (bookingData) {
        await processBooking(bookingData);
      }
    }

    res.json({
      success: true,
      message: 'Webhook processed successfully',
      event,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Ошибка обработки webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Получение данных бронирования из Channex
async function fetchBookingFromChannex(bookingId) {
  const apiKey = 'uUdBtyJdPAYoP0m0qrEStPh2WJcXCBBBLMngnPxygFWpw0GyDE/nmvN/6wN7gXV+';
  const apiUrl = 'https://staging.channex.io/api/v1';
  
  try {
    console.log(`🌐 Запрос данных бронирования ${bookingId} из Channex`);
    
    const response = await fetch(`${apiUrl}/bookings/${bookingId}`, {
      headers: {
        'user-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Данные бронирования получены:', result.data?.id);
      return result.data;
    } else {
      console.error(`❌ Ошибка API Channex: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error('❌ Ошибка запроса к Channex API:', error);
    return null;
  }
}

// Обработка бронирования
async function processBooking(channexBooking) {
  console.log('📥 Обработка бронирования:', channexBooking.id);
  console.log('OTA:', channexBooking.attributes?.ota_name);
  
  // Здесь будет логика конвертации в PMS формат
  if (channexBooking.attributes?.ota_name === 'Airbnb') {
    console.log('🏠 Airbnb бронирование - будет обработано AirbnbChannexService');
    // Здесь мы бы использовали AirbnbChannexService.convertToPMSFormat()
  }
  
  console.log('✅ Бронирование обработано');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Локальный webhook server запущен на http://localhost:${PORT}/webhook`);
  console.log('📋 Для тестирования используйте этот URL в Channex webhook настройках');
});