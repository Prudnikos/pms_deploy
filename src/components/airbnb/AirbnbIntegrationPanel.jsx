import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  RefreshCw, 
  Send, 
  Download, 
  AlertCircle, 
  CheckCircle,
  Home,
  Users,
  DollarSign,
  CalendarDays,
  Settings,
  Activity
} from 'lucide-react';
import airbnbService from '@/services/airbnb/AirbnbChannexService';
import { supabase } from '@/lib/supabase';
import airbnbMapping from '@/config/airbnb-mapping.json';

export default function AirbnbIntegrationPanel() {
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSync, setLastSync] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({ total: 0, confirmed: 0, cancelled: 0, revenue: 0 });
  const [testBooking, setTestBooking] = useState({
    check_in: '2025-08-30',
    check_out: '2025-09-02',
    room_type: 'standard_apartment',
    guest_first_name: 'John',
    guest_last_name: 'Smith', 
    guest_email: 'test@airbnb.com',
    guest_phone: '+1 555 123 4567',
    adults: 2,
    children: 0
  });
  const [logs, setLogs] = useState([]);

  const airbnbConfig = airbnbMapping.airbnb_integration;

  useEffect(() => {
    loadAirbnbBookings();
    loadStats();
    checkSyncStatus();
  }, []);

  const addLog = (message, type = 'info') => {
    setLogs(prev => [{
      timestamp: new Date().toISOString(),
      message,
      type
    }, ...prev].slice(0, 50));
  };

  const loadAirbnbBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('channel', 'airbnb')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setBookings(data || []);
      addLog(`Загружено ${data?.length || 0} бронирований Airbnb`, 'success');
    } catch (error) {
      console.error('Ошибка загрузки бронирований:', error);
      addLog(`Ошибка загрузки: ${error.message}`, 'error');
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await airbnbService.getAirbnbStats();
      setStats(statsData);
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  const checkSyncStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_status')
        .select('*')
        .eq('channel', 'airbnb')
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
    addLog('🔄 Запуск полной синхронизации с Airbnb...', 'info');

    try {
      const result = await airbnbService.syncWithAirbnb();
      
      setSyncStatus('synced');
      setLastSync(new Date().toISOString());
      
      addLog(`✅ Синхронизация завершена: ${result.synced}/${result.total} бронирований`, 'success');
      
      await loadAirbnbBookings();
      await loadStats();
      
      await supabase
        .from('sync_status')
        .upsert({
          channel: 'airbnb',
          status: 'synced',
          last_sync_at: new Date().toISOString(),
          total_synced: result.synced,
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
    addLog('📤 Создаем тестовое Airbnb бронирование...', 'info');

    try {
      // Валидация обязательных полей
      if (!testBooking.check_in || !testBooking.check_out) {
        throw new Error('Укажите даты заезда и выезда');
      }
      
      if (!testBooking.guest_first_name || !testBooking.guest_last_name) {
        throw new Error('Укажите имя и фамилию гостя');
      }

      const bookingData = {
        ...testBooking,
        id: `airbnb-test-${Date.now()}`,
        room_number: airbnbConfig.room_mapping[testBooking.room_type]?.pms_room_number || 'A1',
        status: 'confirmed',
        channel: 'airbnb',
        source: 'airbnb',
        test: true
      };

      const result = await airbnbService.createAirbnbBooking(bookingData);
      
      addLog(`✅ Airbnb бронирование создано: ${result.data?.id}`, 'success');
      
      await loadAirbnbBookings();
      await loadStats();
      
      setTestBooking({
        check_in: '2025-08-30',
        check_out: '2025-09-02',
        room_type: 'standard_apartment',
        guest_first_name: 'John',
        guest_last_name: 'Smith',
        guest_email: 'test@airbnb.com',
        guest_phone: '+1 555 123 4567',
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
                <Home className="w-5 h-5" />
                Airbnb Integration
              </CardTitle>
              <CardDescription>
                Управление бронированиями и синхронизация с Airbnb через Channex
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

      {/* Статистика */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Всего бронирований</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Подтвержденных</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Отмененных</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Выручка</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.revenue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Статистика комнат */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(airbnbConfig.room_mapping).map(([key, room]) => (
          <Card key={key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{room.airbnb_room_title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{room.availability_count}</div>
              <p className="text-xs text-muted-foreground">
                Номер: {room.pms_room_number}
              </p>
              <p className="text-xs text-muted-foreground">
                ${room.base_price}/ночь
              </p>
              <p className="text-xs text-muted-foreground">
                До {room.max_occupancy} гостей
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Табы с функционалом */}
      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bookings">Бронирования</TabsTrigger>
          <TabsTrigger value="test">Тест бронирования</TabsTrigger>
          <TabsTrigger value="logs">Логи</TabsTrigger>
        </TabsList>

        {/* Вкладка бронирований */}
        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Последние бронирования Airbnb</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bookings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Нет бронирований из Airbnb
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
                          {booking.room_title || booking.room_number}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                          {booking.status}
                        </Badge>
                        <p className="text-sm mt-1">
                          ${booking.total_amount || 0}
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
              <CardTitle className="text-lg">Создать тестовое бронирование Airbnb</CardTitle>
              <CardDescription>
                Отправить тестовое бронирование в Airbnb через Channex
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
                    {Object.entries(airbnbConfig.room_mapping).map(([key, room]) => (
                      <SelectItem key={key} value={key}>
                        {room.airbnb_room_title} (${room.base_price}/ночь)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Имя</Label>
                  <Input
                    value={testBooking.guest_first_name}
                    onChange={(e) => setTestBooking({...testBooking, guest_first_name: e.target.value})}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Фамилия</Label>
                  <Input
                    value={testBooking.guest_last_name}
                    onChange={(e) => setTestBooking({...testBooking, guest_last_name: e.target.value})}
                    placeholder="Smith"
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
                    placeholder="test@airbnb.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input
                    value={testBooking.guest_phone}
                    onChange={(e) => setTestBooking({...testBooking, guest_phone: e.target.value})}
                    placeholder="+1 555 123 4567"
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
                Создать бронирование в Airbnb
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка логов */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Логи Airbnb интеграции</CardTitle>
              <CardDescription>
                Последние операции и события
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Логи пусты
                  </p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 border rounded text-sm">
                      <span className="text-xs text-muted-foreground min-w-20">
                        {new Date(log.timestamp).toLocaleTimeString('ru-RU')}
                      </span>
                      <span className={`flex-1 ${
                        log.type === 'error' ? 'text-red-600' : 
                        log.type === 'success' ? 'text-green-600' : 
                        'text-foreground'
                      }`}>
                        {log.message}
                      </span>
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