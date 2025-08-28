// Простой webhook тест сервер для ngrok
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());

const supabaseUrl = 'https://zbhvwxpvlxqxadqzshfc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaHZ3eHB2bHhxeGFkcXpzaGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkyNTM3NCwiZXhwIjoyMDY3NTAxMzc0fQ.0kO3vG1OXNS05NPgm7MmcbkdMuLSG49GKwkCP4979tc';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  console.log('\n🔔 ========== CHANNEX WEBHOOK ПОЛУЧЕН ==========');
  console.log('📅 Время:', new Date().toISOString());
  console.log('🔧 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📋 Body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Сохраняем webhook в БД
    const { error: logError } = await supabase
      .from('channex_webhooks')
      .insert({
        event_type: 'booking',
        event_id: `ngrok-test-${Date.now()}`,
        object_type: 'booking',
        object_id: req.body.booking_id || 'test',
        payload: req.body,
        received_at: new Date().toISOString(),
        processed: true
      });

    if (logError) {
      console.error('❌ Ошибка сохранения в БД:', logError);
    } else {
      console.log('✅ Webhook сохранен в БД успешно!');
    }

    // Возвращаем успешный ответ
    const response = {
      success: true,
      message: 'Webhook received successfully via ngrok!',
      timestamp: new Date().toISOString(),
      data_received: req.body
    };

    console.log('📤 Ответ Channex:', response);
    console.log('================================================\n');
    
    res.status(200).json(response);

  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    server: 'ngrok-webhook-test',
    timestamp: new Date().toISOString() 
  });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`🚀 Webhook тест сервер запущен на порту ${PORT}`);
  console.log(`🔗 Локальный URL: http://localhost:${PORT}/webhook`);
  console.log(`📋 Запустите ngrok: ngrok http ${PORT}`);
  console.log(`🎯 Используйте ngrok URL в Channex webhook настройках`);
});