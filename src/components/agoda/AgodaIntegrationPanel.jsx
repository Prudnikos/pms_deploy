import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { 
  RefreshCw, 
  Send, 
  Download, 
  AlertCircle, 
  CheckCircle,
  Hotel,
  Users,
  DollarSign,
  CalendarDays,
  Settings,
  Activity
} from 'lucide-react';
import agodaService from '@/services/agoda/AgodaChannexService';
import { supabase } from '@/lib/supabase';
import agodaMapping from '@/config/agoda-mapping.json';

export default function AgodaIntegrationPanel() {
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSync, setLastSync] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [availability, setAvailability] = useState({});
  const [testBooking, setTestBooking] = useState({
    check_in: '',
    check_out: '',
    room_type: 'double',
    guest_first_name: '',
    guest_last_name: '',
    guest_email: '',
    guest_phone: '',
    adults: 2,
    children: 0
  });
  const [logs, setLogs] = useState([]);

  const agodaConfig = agodaMapping.agoda_integration;

  useEffect(() => {
    loadAgodaBookings();
    checkSyncStatus();
  }, []);

  const addLog = (message, type = 'info') => {
    setLogs(prev => [{
      timestamp: new Date().toISOString(),
      message,
      type
    }, ...prev].slice(0, 50));
  };

  const loadAgodaBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('channel', 'agoda')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setBookings(data || []);
      addLog(`Загружено ${data?.length || 0} бронирований Agoda`, 'success');
    } catch (error) {
      console.error('Ошибка загрузки бронирований:', error);
      addLog(`Ошибка загрузки: ${error.message}`, 'error');
    }
  };

  const checkSyncStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_status')
        .select('*')
        .eq('channel', 'agoda')
        .single();

      if (data) {
        setSyncStatus(data.status);
        setLastSync(data.last_sync_at);
      }
    } catch (error) {
      console.error('Ошибка проверки статуса:', error);
    }
  };

  const handleFullSync = async () => {
    setLoading(true);
    setSyncStatus('syncing');
    addLog('🔄 Запуск полной синхронизации с Agoda...', 'info');

    try {
      const result = await agodaService.syncWithAgoda();
      
      setSyncStatus('synced');
      setLastSync(new Date().toISOString());
      
      addLog(`✅ Синхронизация завершена: ${result.total} бронирований`, 'success');
      
      // Обновляем список
      await loadAgodaBookings();
      
      // Сохраняем статус
      await supabase
        .from('sync_status')
        .upsert({
          channel: 'agoda',
          status: 'synced',
          last_sync_at: new Date().toISOString(),
          total_synced: result.total,
          errors: result.errors
        });
      
    } catch (error) {
      setSyncStatus('error');
      console.error('Ошибка синхронизации:', error);
      addLog(`❌ Ошибка синхронизации: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTestBooking = async () => {
    setLoading(true);
    addLog('📤 Создаем тестовое бронирование...', 'info');

    try {
      // Подготавливаем данные
      const bookingData = {
        ...testBooking,
        id: `test-${Date.now()}`,
        room_number: testBooking.room_type === 'double' ? '101' : '201',
        status: 'confirmed',
        channel: 'agoda',
        source: 'agoda'
      };

      // Отправляем в Agoda
      const result = await agodaService.createAgodaBooking(bookingData);
      
      addLog(`✅ Бронирование создано: ${result.id}`, 'success');
      
      // Обновляем список
      await loadAgodaBookings();
      
      // Очищаем форму
      setTestBooking({
        check_in: '',
        check_out: '',
        room_type: 'double',
        guest_first_name: '',
        guest_last_name: '',
        guest_email: '',
        guest_phone: '',
        adults: 2,
        children: 0
      });
      
    } catch (error) {
      console.error('Ошибка создания бронирования:', error);
      addLog(`❌ Ошибка: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvailability = async (roomType, dates, count) => {
    setLoading(true);
    addLog(`📅 Обновляем availability для ${roomType}...`, 'info');

    try {
      await agodaService.updateAgodaAvailability(roomType, dates, count);
      addLog(`✅ Availability обновлен`, 'success');
    } catch (error) {
      console.error('Ошибка обновления availability:', error);
      addLog(`❌ Ошибка: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrices = async (roomType, dates, price) => {
    setLoading(true);
    addLog(`💰 Обновляем цены для ${roomType}...`, 'info');

    try {
      await agodaService.updateAgodaPrices(roomType, dates, price);
      addLog(`✅ Цены обновлены`, 'success');
    } catch (error) {
      console.error('Ошибка обновления цен:', error);
      addLog(`❌ Ошибка: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getSyncStatusBadge = () => {
    switch (syncStatus) {
      case 'synced':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Синхронизировано</Badge>;
      case 'syncing':
        return <Badge className="bg-blue-500"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Синхронизация...</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Ошибка</Badge>;
      default:
        return <Badge variant="secondary">Ожидание</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок и статус */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Hotel className="w-5 h-5" />
                Agoda Integration
              </CardTitle>
              <CardDescription>
                Управление бронированиями и синхронизация с Agoda через Channex
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {getSyncStatusBadge()}
              <Button 
                onClick={handleFullSync} 
                disabled={loading}
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Синхронизировать
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {lastSync && (
            <p className="text-sm text-muted-foreground">
              Последняя синхронизация: {new Date(lastSync).toLocaleString('ru-RU')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Статистика комнат */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Двухместный номер</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agodaConfig.room_mapping.double_room.availability_count}</div>
            <p className="text-xs text-muted-foreground">
              ID: {agodaConfig.room_mapping.double_room.agoda_room_id}
            </p>
            <p className="text-xs text-muted-foreground">
              ${agodaConfig.room_mapping.double_room.base_price}/ночь
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Бунгало с видом на сад</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agodaConfig.room_mapping.bungalow.availability_count}</div>
            <p className="text-xs text-muted-foreground">
              ID: {agodaConfig.room_mapping.bungalow.agoda_room_id}
            </p>
            <p className="text-xs text-muted-foreground">
              ${agodaConfig.room_mapping.bungalow.base_price}/ночь
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Табы с функционалом */}
      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bookings">Бронирования</TabsTrigger>
          <TabsTrigger value="test">Тест бронирования</TabsTrigger>
          <TabsTrigger value="availability">Доступность</TabsTrigger>
          <TabsTrigger value="prices">Цены</TabsTrigger>
          <TabsTrigger value="logs">Логи</TabsTrigger>
        </TabsList>

        {/* Вкладка бронирований */}
        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Последние бронирования Agoda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bookings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Нет бронирований из Agoda
                  </p>
                ) : (
                  bookings.map(booking => (
                    <div key={booking.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {booking.guest_first_name} {booking.guest_last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {booking.check_in} - {booking.check_out}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Комната: {booking.room_number || 'Не назначена'}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                          {booking.status}
                        </Badge>
                        <p className="text-sm mt-1">
                          ${booking.total_amount}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка тестового бронирования */}
        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Создать тестовое бронирование</CardTitle>
              <CardDescription>
                Отправить тестовое бронирование в Agoda через Channex
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Заезд</Label>
                  <Input
                    type="date"
                    value={testBooking.check_in}
                    onChange={(e) => setTestBooking({...testBooking, check_in: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Выезд</Label>
                  <Input
                    type="date"
                    value={testBooking.check_out}
                    onChange={(e) => setTestBooking({...testBooking, check_out: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Тип номера</Label>
                <Select 
                  value={testBooking.room_type} 
                  onValueChange={(value) => setTestBooking({...testBooking, room_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="double">Двухместный номер</SelectItem>
                    <SelectItem value="bungalow">Бунгало с видом на сад</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Имя</Label>
                  <Input
                    value={testBooking.guest_first_name}
                    onChange={(e) => setTestBooking({...testBooking, guest_first_name: e.target.value})}
                    placeholder="Иван"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Фамилия</Label>
                  <Input
                    value={testBooking.guest_last_name}
                    onChange={(e) => setTestBooking({...testBooking, guest_last_name: e.target.value})}
                    placeholder="Иванов"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={testBooking.guest_email}
                    onChange={(e) => setTestBooking({...testBooking, guest_email: e.target.value})}
                    placeholder="test@agoda.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input
                    value={testBooking.guest_phone}
                    onChange={(e) => setTestBooking({...testBooking, guest_phone: e.target.value})}
                    placeholder="+7 999 123 4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Взрослые</Label>
                  <Input
                    type="number"
                    min="1"
                    max="4"
                    value={testBooking.adults}
                    onChange={(e) => setTestBooking({...testBooking, adults: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Дети</Label>
                  <Input
                    type="number"
                    min="0"
                    max="3"
                    value={testBooking.children}
                    onChange={(e) => setTestBooking({...testBooking, children: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <Button 
                onClick={handleCreateTestBooking}
                disabled={loading || !testBooking.check_in || !testBooking.check_out || !testBooking.guest_first_name}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                Создать бронирование в Agoda
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка availability */}
        <TabsContent value="availability">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Управление доступностью</CardTitle>
              <CardDescription>
                Обновление количества доступных номеров в Agoda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Функция обновления availability будет доступна после полной настройки канала Agoda в Channex
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка цен */}
        <TabsContent value="prices">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Управление ценами</CardTitle>
              <CardDescription>
                Обновление цен для номеров в Agoda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Функция обновления цен будет доступна после полной настройки канала Agoda в Channex
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка логов */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Журнал операций</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Нет записей в журнале
                  </p>
                ) : (
                  logs.map((log, index) => (
                    <div 
                      key={index}
                      className={`text-xs p-2 rounded font-mono ${
                        log.type === 'error' ? 'bg-red-50 text-red-900' :
                        log.type === 'success' ? 'bg-green-50 text-green-900' :
                        'bg-gray-50 text-gray-900'
                      }`}
                    >
                      <span className="opacity-50">
                        {new Date(log.timestamp).toLocaleTimeString('ru-RU')}
                      </span>
                      {' '}
                      {log.message}
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