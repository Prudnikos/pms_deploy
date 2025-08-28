// Простой тестовый webhook endpoint без авторизации
// URL: https://pms.voda.center/api/channex/webhook-test

export default async function handler(req, res) {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  console.log('🔔 ТЕСТОВЫЙ webhook получен:', {
    method: req.method,
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // Принимаем любые HTTP методы для теста
  try {
    const response = {
      success: true,
      message: 'Test webhook received successfully!',
      method: req.method,
      timestamp: new Date().toISOString(),
      data_received: req.body || {},
      headers_received: req.headers
    };

    console.log('📤 Отправляем ответ:', response);
    
    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Ошибка тестового webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}