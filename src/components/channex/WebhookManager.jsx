import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Clock, RefreshCw, Play, Server } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function WebhookManager() {
  const [webhookServerStatus, setWebhookServerStatus] = useState('unknown');
  const [webhooks, setWebhooks] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, timestamp }]);
  };

  // Проверяем статус webhook сервера
  const checkWebhookServer = async () => {
    // Определяем URL в зависимости от окружения
    const healthUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3001/health' 
      : 'https://pms.voda.center/api/health';
      
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        const data = await response.json();
        setWebhookServerStatus('running');
        addLog(`✅ Webhook сервер работает (${data.environment || 'production'})`, 'success');
      } else {
        setWebhookServerStatus('error');
        addLog('❌ Webhook сервер недоступен', 'error');
      }
    } catch (error) {
      setWebhookServerStatus('offline');
      addLog('🔌 Webhook сервер не запущен', 'warning');
    }
  };

  // Загружаем webhooks из БД
  const loadWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from('channex_webhooks')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(20);
        
      if (error) throw error;
      setWebhooks(data || []);
      addLog(`📥 Загружено webhook'ов: ${data?.length || 0}`, 'info');
    } catch (error) {
      addLog(`❌ Ошибка загрузки webhooks: ${error.message}`, 'error');
    }
  };

  // Загружаем бронирования из Channex
  const loadBookingsFromChannex = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .not('external_booking_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (error) throw error;
      setBookings(data || []);
      addLog(`📋 Загружено бронирований из Channex: ${data?.length || 0}`, 'info');
    } catch (error) {
      addLog(`❌ Ошибка загрузки бронирований: ${error.message}`, 'error');
    }
  };

  // Создание тестового бронирования
  const createTestBooking = async () => {
    setLoading(true);
    addLog('🧪 Создаем тестовое бронирование...', 'info');
    
    try {
      const testBooking = {
        external_booking_id: `test_${Date.now()}`,
        source: 'booking',
        check_in: new Date().toISOString().split('T')[0],
        check_out: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        guest_name: 'Тест Гость',
        guest_email: 'test@example.com',
        guest_phone: '+7 999 123-45-67',
        total_amount: 5000,
        status: 'confirmed',
        guests_count: 2,
        notes: 'Тестовое бронирование для проверки Channex интеграции',
        channex_data: {
          test: true,
          created_at: new Date().toISOString()
        }
      };

      const { data, error } = await supabase
        .from('bookings')
        .insert(testBooking)
        .select()
        .single();

      if (error) throw error;

      addLog('✅ Тестовое бронирование создано!', 'success');
      addLog(`🆔 ID: ${data.external_booking_id}`, 'info');
      addLog(`👤 Гость: ${data.guest_name}`, 'info');
      addLog(`📅 Заезд: ${data.check_in} - Выезд: ${data.check_out}`, 'info');
      
      // Обновляем список бронирований
      await loadBookingsFromChannex();
      
    } catch (error) {
      addLog(`❌ Ошибка создания тестового бронирования: ${error.message}`, 'error');
    }
    
    setLoading(false);
  };

  // Симуляция webhook от Channex
  const simulateWebhook = async () => {
    setLoading(true);
    addLog('🎭 Симулируем webhook от Channex...', 'info');
    
    try {
      const webhookData = {
        type: 'booking_new',
        id: `webhook_${Date.now()}`,
        object_type: 'booking',
        object_id: `booking_${Date.now()}`,
        data: {
          booking: {
            id: `channex_booking_${Date.now()}`,
            ota_name: 'Booking.com',
            status: 'confirmed',
            arrival_date: '2025-09-15',
            departure_date: '2025-09-18',
            total_price: 15000,
            customer: {
              name: 'Анна Иванова',
              email: 'anna@example.com',
              phone: '+7 999 888-77-66'
            },
            occupancy: { adults: 2, children: 0 },
            notes: 'Симулированное бронирование от webhook'
          }
        }
      };

      // Отправляем webhook на наш сервер
      const webhookUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api/channex/webhook' 
        : 'https://pms.voda.center/api/channex/webhook';
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      });

      if (response.ok) {
        addLog('✅ Webhook успешно отправлен и обработан!', 'success');
        
        // Обновляем данные
        await loadWebhooks();
        await loadBookingsFromChannex();
      } else {
        addLog(`❌ Ошибка обработки webhook: ${response.status}`, 'error');
      }
      
    } catch (error) {
      addLog(`❌ Ошибка симуляции webhook: ${error.message}`, 'error');
    }
    
    setLoading(false);
  };

  const getWebhookServerStatusColor = () => {
    switch (webhookServerStatus) {
      case 'running': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  const getWebhookServerStatusText = () => {
    switch (webhookServerStatus) {
      case 'running': return 'Работает';
      case 'error': return 'Ошибка';
      case 'offline': return 'Не запущен';
      default: return 'Проверяется';
    }
  };

  // Инициализация при загрузке
  useEffect(() => {
    checkWebhookServer();
    loadWebhooks();
    loadBookingsFromChannex();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Управление Webhooks</h2>
        <Badge className={getWebhookServerStatusColor()}>
          <Server className="h-4 w-4 mr-2" />
          {getWebhookServerStatusText()}
        </Badge>
      </div>

      {/* Server Status Alert */}
      {webhookServerStatus !== 'running' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Webhook сервер не запущен!</strong> 
            <br />
            Для получения уведомлений от Channex запустите сервер командой: 
            <code className="ml-2 px-2 py-1 bg-gray-100 rounded">npm run webhook-server</code>
            <br />
            Или запустите полную среду разработки: 
            <code className="ml-2 px-2 py-1 bg-gray-100 rounded">npm run dev:full</code>
          </AlertDescription>
        </Alert>
      )}

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Панель управления</CardTitle>
          <CardDescription>
            Инструменты для тестирования и мониторинга webhook интеграции
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Button 
              onClick={checkWebhookServer}
              variant="outline"
            >
              <Server className="h-4 w-4 mr-2" />
              Проверить сервер
            </Button>
            
            <Button 
              onClick={simulateWebhook}
              disabled={loading || webhookServerStatus !== 'running'}
            >
              {loading ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Симулировать webhook
            </Button>
            
            <Button 
              onClick={createTestBooking}
              disabled={loading}
              variant="outline"
            >
              {loading ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Тестовое бронирование
            </Button>
            
            <Button 
              onClick={() => {
                loadWebhooks();
                loadBookingsFromChannex();
              }}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить данные
            </Button>
          </div>

          {/* Webhook URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Webhook URL для Channex</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 p-2 border rounded bg-slate-50"
                value={window.location.hostname === 'localhost' 
                  ? 'http://localhost:3001/api/channex/webhook' 
                  : 'https://pms.voda.center/api/channex/webhook'}
                readOnly
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const webhookUrl = window.location.hostname === 'localhost' 
                    ? 'http://localhost:3001/api/channex/webhook' 
                    : 'https://pms.voda.center/api/channex/webhook';
                  navigator.clipboard.writeText(webhookUrl);
                  addLog('✅ URL скопирован в буфер обмена', 'success');
                }}
              >
                Копировать
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Укажите этот URL в настройках Channex для получения уведомлений
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="webhooks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="webhooks">Webhooks ({webhooks.length})</TabsTrigger>
          <TabsTrigger value="bookings">Бронирования ({bookings.length})</TabsTrigger>
          <TabsTrigger value="logs">Логи активности</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle>Полученные Webhooks</CardTitle>
              <CardDescription>
                История входящих уведомлений от Channex
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {webhooks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Webhook'и еще не поступали
                  </p>
                ) : (
                  webhooks.map((webhook) => (
                    <div key={webhook.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{webhook.event_type}</Badge>
                            {webhook.object_type && (
                              <Badge variant="secondary">{webhook.object_type}</Badge>
                            )}
                            {webhook.processed ? (
                              <Badge className="bg-green-500">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Обработан
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <Clock className="h-3 w-3 mr-1" />
                                Не обработан
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>Event ID: {webhook.event_id}</p>
                            <p>Object ID: {webhook.object_id}</p>
                            <p className="text-xs">
                              {new Date(webhook.received_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle>Бронирования из Channex</CardTitle>
              <CardDescription>
                Список бронирований, полученных через интеграцию
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {bookings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Бронирований из Channex пока нет
                  </p>
                ) : (
                  bookings.map((booking) => (
                    <div key={booking.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{booking.guest_name}</h4>
                            <Badge variant="outline">{booking.source}</Badge>
                            <Badge 
                              className={
                                booking.status === 'confirmed' ? 'bg-green-500' :
                                booking.status === 'cancelled' ? 'bg-red-500' :
                                'bg-yellow-500'
                              }
                            >
                              {booking.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>📅 {booking.check_in} — {booking.check_out}</p>
                            <p>👥 Гостей: {booking.guests_count} | 💰 {booking.total_amount} ₽</p>
                            <p>🆔 Channex ID: {booking.external_booking_id}</p>
                            {booking.notes && <p>📝 {booking.notes}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Логи активности</CardTitle>
              <CardDescription>
                История операций и событий
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Нет активности
                  </p>
                ) : (
                  logs.slice(-20).reverse().map((log, index) => (
                    <div 
                      key={index}
                      className={`p-2 rounded text-sm border-l-4 ${
                        log.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' :
                        log.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
                        log.type === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-800' :
                        'bg-blue-50 border-blue-500 text-blue-800'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span>{log.message}</span>
                        <span className="text-xs opacity-70">{log.timestamp}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}