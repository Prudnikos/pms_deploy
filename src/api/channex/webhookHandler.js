import channexService from '@/services/channex/ChannexService';
import { supabase } from '@/lib/supabase';

/**
 * Webhook handler для Channex
 * Этот файл обрабатывает входящие вебхуки от Channex
 * 
 * URL для вебхуков: https://yourdomain.com/api/channex/webhook
 */
export async function handleChannexWebhook(request) {
  console.log('🔔 Получен вебхук от Channex');
  
  try {
    // Проверяем подпись (в production обязательно!)
    const signature = request.headers.get('X-Channex-Signature');
    if (!verifyWebhookSignature(request.body, signature)) {
      return new Response('Invalid signature', { status: 401 });
    }
    
    const webhookData = await request.json();
    console.log('📦 Данные вебхука:', webhookData);
    
    // Сохраняем вебхук в БД для истории
    await logWebhook(webhookData);
    
    // Обрабатываем вебхук
    const result = await channexService.handleWebhook(webhookData);
    
    // Возвращаем успешный ответ Channex
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Webhook processed',
      result 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Ошибка обработки вебхука:', error);
    
    // Логируем ошибку
    await logWebhookError(error, request.body);
    
    // Возвращаем ошибку (Channex повторит попытку позже)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Проверка подписи вебхука
function verifyWebhookSignature(payload, signature) {
  // TODO: Реализовать проверку HMAC подписи
  // const expectedSignature = crypto
  //   .createHmac('sha256', process.env.CHANNEX_WEBHOOK_SECRET)
  //   .update(payload)
  //   .digest('hex');
  // return signature === expectedSignature;
  
  return true; // Временно для тестирования
}

// Логирование вебхука в БД
async function logWebhook(webhookData) {
  try {
    await supabase
      .from('channex_webhook_logs')
      .insert({
        event_type: webhookData.event_type,
        payload: webhookData,
        processed_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Ошибка логирования вебхука:', error);
  }
}

// Логирование ошибок
async function logWebhookError(error, payload) {
  try {
    await supabase
      .from('channex_webhook_errors')
      .insert({
        error_message: error.message,
        error_stack: error.stack,
        payload: payload,
        occurred_at: new Date().toISOString()
      });
  } catch (logError) {
    console.error('Ошибка логирования ошибки:', logError);
  }
}