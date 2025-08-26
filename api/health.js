// Vercel API Route для health check
// URL: https://pms.voda.center/api/health

export default async function handler(req, res) {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Только GET запросы
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'channex-webhook-server',
      environment: process.env.NODE_ENV || 'production',
      version: '1.0.0',
      endpoints: {
        webhook: '/api/channex/webhook',
        health: '/api/health'
      }
    };

    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}