// Debug версия webhook endpoint для Channex
// URL: https://pms.voda.center/api/channex/webhook-debug

export default async function handler(req, res) {
  console.log('=== CHANNEX WEBHOOK DEBUG ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Query:', JSON.stringify(req.query, null, 2));
  console.log('===============================');

  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Просто возвращаем успех для любого запроса
  res.status(200).json({
    success: true,
    message: 'Debug webhook received',
    received_data: {
      method: req.method,
      headers: req.headers,
      body: req.body,
      query: req.query
    },
    timestamp: new Date().toISOString()
  });
}