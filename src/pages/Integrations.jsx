import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Webhook, Settings, Save, Check, AlertCircle } from 'lucide-react';
import { getWebhookSettings, saveWebhookSettings } from '@/components/integrations/Webhooks';

export default function IntegrationsPage() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    loadWebhookSettings();
  }, []);

  const loadWebhookSettings = async () => {
    try {
      const { data, error } = await getWebhookSettings();
      if (error) {
        console.error('Ошибка загрузки настроек:', error);
        return;
      }
      
      if (data?.webhook_url) {
        setWebhookUrl(data.webhook_url);
      }
    } catch (error) {
      console.error('Ошибка при загрузке настроек:', error);
    }
  };

  const handleSave = async () => {
    if (!webhookUrl.trim()) {
      setMessage('Введите URL вебхука');
      setMessageType('error');
      return;
    }

    // Простая валидация URL
    try {
      new URL(webhookUrl);
    } catch (error) {
      setMessage('Введите корректный URL');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await saveWebhookSettings({
        webhook_url: webhookUrl.trim()
      });

      if (error) {
        throw new Error(error.message);
      }

      setMessage('Настройки вебхука успешно сохранены');
      setMessageType('success');
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      setMessage(`Ошибка: ${error.message}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <style>{`
        .integration-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(226,232,240,0.6);
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
        }
        .webhook-section {
          background: linear-gradient(135deg, rgba(59,130,246,0.05) 0%, rgba(147,197,253,0.05) 100%);
          border: 1px solid rgba(59,130,246,0.1);
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center">
            <Settings className="mr-3 h-8 w-8" />
            Интеграции
          </h1>
          <p className="text-slate-600 mt-1">Управление внешними интеграциями и вебхуками</p>
        </div>
        <Badge variant="outline" className="text-blue-600 border-blue-200">
          Настройки системы
        </Badge>
      </div>

      {/* Webhooks Section */}
      <Card className="integration-card">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Webhook className="mr-3 h-6 w-6 text-blue-500" />
            Вебхуки
          </CardTitle>
          <p className="text-slate-600">
            Настройка автоматических уведомлений о событиях в системе
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* New Message Webhook */}
          <div className="webhook-section p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                New Message Webhook
              </h3>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                Сообщения в чате
              </Badge>
            </div>
            
            <p className="text-sm text-slate-600 mb-4">
              Получайте уведомления каждый раз, когда в систему приходит новое сообщение от гостя или сотрудника.
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="webhook-url" className="text-sm font-medium text-slate-700">
                  Webhook URL
                </Label>
                <Input
                  id="webhook-url"
                  type="url"
                  placeholder="https://example.com/webhook/messages"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="mt-1"
                  disabled={loading}
                />
                <p className="text-xs text-slate-500 mt-1">
                  URL, на который будут отправляться POST запросы с данными новых сообщений
                </p>
              </div>

              <Button 
                onClick={handleSave}
                disabled={loading || !webhookUrl.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Сохранить
                  </>
                )}
              </Button>
            </div>

            {/* Status Message */}
            {message && (
              <Alert variant={messageType === 'success' ? 'default' : 'destructive'} className="mt-4">
                {messageType === 'success' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          {/* Webhook Format Info */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-medium text-slate-800 mb-2">Формат данных вебхука</h4>
            <p className="text-sm text-slate-600 mb-3">
              При создании нового сообщения на указанный URL будет отправлен POST запрос с JSON данными:
            </p>
            <pre className="bg-slate-800 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`{
  "id": "uuid",
  "conversation_id": "uuid", 
  "sender_type": "guest|staff",
  "sender_id": "uuid",
  "content": "Текст сообщения",
  "created_at": "2024-01-01T12:00:00Z",
  "sender_name": "Имя отправителя"
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Future Integrations Placeholder */}
      <Card className="integration-card opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center text-xl text-slate-500">
            <Settings className="mr-3 h-6 w-6" />
            Другие интеграции
          </CardTitle>
          <p className="text-slate-500">
            Дополнительные интеграции будут добавлены в будущих версиях
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-slate-400">Скоро появятся новые возможности</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}