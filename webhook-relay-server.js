// Простой relay сервер для передачи webhook от Channex к нашему endpoint
import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// Наш реальный endpoint
const TARGET_WEBHOOK_URL = 'https://pms.voda.center/api/channex/webhook';

app.post('/relay', async (req, res) => {
  console.log('🔄 Relay получил webhook от Channex:', {
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    // Пересылаем запрос на наш реальный endpoint
    const response = await fetch(TARGET_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer hotel_pms_webhook_secret_2024'
      },
      body: JSON.stringify(req.body)
    });

    const responseData = await response.json();
    
    console.log('✅ Успешно переслан на PMS:', {
      status: response.status,
      response: responseData
    });

    // Возвращаем успешный ответ Channex
    res.status(200).json({
      success: true,
      message: 'Webhook relayed successfully',
      target_response: responseData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Ошибка relay:', error);
    
    // Всё равно возвращаем 200 Channex, чтобы не было повторных попыток
    res.status(200).json({
      success: false,
      message: 'Relay failed but acknowledged',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'webhook-relay' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Webhook Relay запущен на порту ${PORT}`);
  console.log(`📡 Релеит webhook на: ${TARGET_WEBHOOK_URL}`);
});