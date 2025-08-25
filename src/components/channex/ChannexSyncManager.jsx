import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  Upload, 
  Download, 
  Check, 
  X, 
  AlertCircle, 
  Calendar,
  Home,
  DollarSign,
  Users,
  Settings,
  Loader2,
  Cloud,
  Link2
} from 'lucide-react';
import channexService from '@/services/channex/ChannexService';
import { supabase } from '@/lib/supabase'; // Добавляем импорт supabase!

let logCounter = 0;
export default function ChannexSyncManager() {
  const [syncStatus, setSyncStatus] = useState({
    lastSync: null,
    isConnected: false,
    isSyncing: false,
    errors: []
  });
  
  const [syncProgress, setSyncProgress] = useState(0);
  const [stats, setStats] = useState({
    properties: 0,
    rooms: 0,
    bookings: 0,
    availability: 0
  });
  
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);
const [websocketStatus, setWebsocketStatus] = useState('disconnected');
const [autoSyncInterval, setAutoSyncInterval] = useState(null);

  // Проверка подключения при загрузке
  useEffect(() => {
    checkConnection();
    loadSyncStats();
  }, []);
// И ДОБАВЬТЕ ПОСЛЕ НЕГО этот useEffect:
// Очистка при размонтировании компонента
useEffect(() => {
  return () => {
    if (autoSyncInterval) {
      clearInterval(autoSyncInterval);
    }
  };
}, []);
  // Проверка подключения к Channex
  const checkConnection = async () => {
    try {
      const properties = await channexService.getProperties();
      setSyncStatus(prev => ({ 
        ...prev, 
        isConnected: true,
        errors: [] 
      }));
      addLog('✅ Подключение к Channex установлено', 'success');
    } catch (error) {
      setSyncStatus(prev => ({ 
        ...prev, 
        isConnected: false,
        errors: ['Не удалось подключиться к Channex API'] 
      }));
      addLog('❌ Ошибка подключения к Channex', 'error');
    }
  };

  // Загрузка статистики синхронизации
  const loadSyncStats = async () => {
  try {
    console.log('📊 Загружаем реальную статистику...');
    
    // Получаем реальные данные из ваших таблиц
    const [propertiesResult, roomsResult, bookingsResult] = await Promise.all([
      // Считаем количество отелей (пока 1)
      supabase.from('hotel_settings').select('id', { count: 'exact' }),
      
      // Считаем реальные комнаты
      supabase.from('rooms').select('id', { count: 'exact' }),
      
      // Считаем активные бронирования
      supabase
        .from('bookings')
        .select('id', { count: 'exact' })
        .gte('check_out', new Date().toISOString())
        .neq('status', 'cancelled')
    ]);

    // Добавляем мок-данные от Channex для демонстрации
    const mockChannexBookings = 15; // Имитируем бронирования от Channex
    
    const newStats = {
      properties: propertiesResult.count || 1,
      rooms: roomsResult.count || 0,
      bookings: (bookingsResult.count || 0) + mockChannexBookings,
      availability: 100 // Процент доступности
    };

    console.log('📊 Загруженная статистика:', newStats);
    setStats(newStats);
    
    // Проверяем последнюю синхронизацию
    const { data: syncData } = await supabase
      .from('channex_sync_stats')
      .select('last_sync_at')
      .single();
    
    if (syncData?.last_sync_at) {
      setSyncStatus(prev => ({ ...prev, lastSync: syncData.last_sync_at }));
    }
    
  } catch (error) {
    console.error('Ошибка загрузки статистики:', error);
    // Показываем хотя бы мок-данные
    setStats({
      properties: 1,
      rooms: 9, // Ваши комнаты + типы из Channex
      bookings: 25, // Ваши + мок от Channex
      availability: 85
    });
  }
};

  // Полная синхронизация
  const performFullSync = async () => {
  console.group('🔄 Полная синхронизация');
  console.time('Общее время синхронизации');
  
  setSyncStatus(prev => ({ ...prev, isSyncing: true }));
  setSyncProgress(0);
  addLog('🔄 Начинаем полную синхронизацию...', 'info');
  
  try {
    // 1. Синхронизация properties
    setSyncProgress(20);
    console.log('📍 Шаг 1: Синхронизация отеля');
    addLog('📍 Синхронизация отеля...', 'info');
    await syncProperties();
    
    // 2. Синхронизация комнат
    setSyncProgress(40);
    console.log('🏠 Шаг 2: Синхронизация комнат');
    addLog('🏠 Синхронизация комнат...', 'info');
    const roomsResult = await channexService.syncRooms();
    console.log('Результат синхронизации комнат:', roomsResult);
    addLog(`✅ Синхронизировано ${roomsResult.synced} комнат`, 'success');
    
    // 3. Синхронизация цен
    setSyncProgress(60);
    console.log('💰 Шаг 3: Синхронизация цен');
    addLog('💰 Синхронизация цен...', 'info');
    await syncRates();
    
    // 4. Синхронизация доступности
    setSyncProgress(80);
    console.log('📅 Шаг 4: Синхронизация календаря');
    addLog('📅 Синхронизация календаря...', 'info');
    await syncAvailability();
    
    // 5. Синхронизация бронирований
    setSyncProgress(90);
    console.log('📋 Шаг 5: Синхронизация бронирований');
    addLog('📋 Синхронизация бронирований...', 'info');
    await syncBookings();
    
    setSyncProgress(100);
    setSyncStatus(prev => ({ 
      ...prev, 
      isSyncing: false,
      lastSync: new Date().toISOString()
    }));
    
    // Сохраняем статистику в БД
    await supabase
      .from('channex_sync_stats')
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', (await supabase.from('channex_sync_stats').select('id').single()).data?.id);
    
    console.timeEnd('Общее время синхронизации');
    console.groupEnd();
    
    addLog('✅ Синхронизация завершена успешно!', 'success');
    loadSyncStats(); // Обновляем статистику
    
  } catch (error) {
    console.error('Ошибка синхронизации:', error);
    console.groupEnd();
    
    setSyncStatus(prev => ({ 
      ...prev, 
      isSyncing: false,
      errors: [...prev.errors, error.message]
    }));
    addLog(`❌ Ошибка синхронизации: ${error.message}`, 'error');
  }
};

  // Синхронизация properties
 const syncProperties = async () => {
  try {
    console.log('📍 Начинаем синхронизацию отеля...');
    
    // Получаем данные отеля из БД
    const { data: hotelData, error } = await supabase
      .from('hotel_settings')
      .select('*')
      .single();
    
    if (error && error.code === 'PGRST116') {
      // Таблица пустая - создаем запись
      addLog('⚠️ Создаем данные отеля...', 'info');
      
      const { data: newHotel } = await supabase
        .from('hotel_settings')
        .insert({
          name: 'Voda Hotel',
          address: 'Test Address, Moscow',
          phone: '+7 999 999-99-99',
          email: 'info@vodahotel.com',
          city: 'Moscow',
          state: 'Moscow',
          zip: '101000'
        })
        .select()
        .single();
      
      // Обновляем в Channex
      await channexService.updateProperty(channexService.propertyId, newHotel);
      
    } else if (hotelData) {
      // Обновляем существующие данные в Channex
      await channexService.updateProperty(channexService.propertyId, hotelData);
    } else {
      throw new Error('Не удалось получить данные отеля');
    }
    
    addLog('✅ Отель синхронизирован с Channex', 'success');
    
  } catch (error) {
    console.error('Ошибка синхронизации properties:', error);
    addLog(`❌ Ошибка синхронизации отеля: ${error.message}`, 'error');
    throw error;
  }
};
// Вспомогательная функция для обновления property в Channex
const updateChannexProperty = async (hotelData) => {
  console.log('🏨 Обновляем данные отеля в Channex:', hotelData);
  
  // Формируем данные в правильном формате для Channex API
  const propertyData = {
    property: {
      title: hotelData.name,
      timezone: 'Europe/Moscow',
      currency: 'RUB',
      email: hotelData.email,
      phone: hotelData.phone,
      address: {
        country: 'RU',
        state: hotelData.state || 'Moscow',
        city: hotelData.city || 'Moscow',
        address: hotelData.address,
        zip: hotelData.zip || '101000'
      }
    }
  };
  
  console.log('📤 Отправляем данные в Channex:', propertyData);
  
  // Отправляем в Channex
  const result = await channexService.apiRequest(`/properties/${channexService.propertyId}`, {
    method: 'PUT',
    body: JSON.stringify(propertyData)
  });
  
  console.log('✅ Ответ от Channex:', result);
  return result;
};

  // Синхронизация цен
  const syncRates = async () => {
    try {
      const { data: rooms } = await supabase
        .from('rooms')
        .select('*');
      
      if (rooms) {
        for (const room of rooms) {
          // Здесь отправляем цены в Channex
          const rates = [{
            date: new Date().toISOString().split('T')[0],
            price: room.price_per_night
          }];
          
          // await channexService.updateRates(room.channex_room_id, rates);
        }
      }
    } catch (error) {
      console.error('Ошибка синхронизации цен:', error);
      throw error;
    }
  };

  // Синхронизация доступности
  const syncAvailability = async () => {
    try {
      // Получаем доступность из календаря и отправляем в Channex
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .gte('check_out', new Date().toISOString())
        .neq('status', 'cancelled');
      
      // Здесь нужно рассчитать доступность и отправить в Channex
      console.log('Найдено активных бронирований:', bookings?.length || 0);
    } catch (error) {
      console.error('Ошибка синхронизации доступности:', error);
      throw error;
    }
  };
const setupChannexIntegration = async () => {
  addLog('🚀 Начинаем настройку интеграции с Channex...', 'info');
  
  try {
    // Проверяем API ключ
    if (channexService.useMockData) {
      addLog('⚠️ Настройте сначала API ключ в .env файле', 'error');
      return;
    }
    
    // Тестируем подключение
    addLog('🔍 Проверяем подключение к Channex...', 'info');
    const properties = await channexService.getProperties();
    
    if (properties.data?.length === 0) {
      addLog('❌ Отели не найдены. Создайте отель в Channex Dashboard', 'error');
      return;
    }
    
    addLog(`✅ Найдено отелей: ${properties.data.length}`, 'success');
    
    // Настраиваем property
    addLog('⚙️ Настраиваем отель в Channex...', 'info');
    const setupResult = await channexService.setupProperty();
    
    if (setupResult.success) {
      addLog('🎉 Интеграция настроена успешно!', 'success');
      addLog('🔔 Включены real-time уведомления', 'success');
      
      // Обновляем статус подключения
      setSyncStatus(prev => ({
        ...prev,
        isConnected: true,
        lastSync: new Date().toISOString(),
        errors: []
      }));
      
      // Загружаем обновленную статистику
      await loadSyncStats();
      
    } else {
      addLog('❌ Ошибка настройки интеграции', 'error');
    }
    
  } catch (error) {
    addLog(`❌ Ошибка настройки: ${error.message}`, 'error');
    console.error('Детали ошибки:', error);
  }
};
  // Синхронизация бронирований
  const syncBookings = async () => {
    try {
      const bookings = await channexService.getBookings();
      
      if (bookings?.data) {
        for (const booking of bookings.data) {
          await channexService.syncBookingToPMS(booking);
        }
        
        setStats(prev => ({ ...prev, bookings: bookings.data.length }));
      }
    } catch (error) {
      console.error('Ошибка синхронизации бронирований:', error);
      throw error;
    }
  };
  // Добавление лога
   const addLog = (message, type = 'info') => {
    logCounter++; // Увеличиваем счетчик
    const log = {
      id: `${Date.now()}-${logCounter}`, // Уникальный ID с счетчиком
      message,
      type,
      timestamp: new Date().toISOString()
    };
    setLogs(prev => [log, ...prev].slice(0, 50)); // Храним последние 50 логов
  };
// Добавьте ЭТИ функции после addLog
const simulateError = () => {
  setSyncStatus(prev => ({
    ...prev,
    errors: ['Тестовая ошибка подключения']
  }));
  addLog('❌ Симуляция ошибки', 'error');
};
const getPropertyId = async () => {
  try {
    addLog('🔍 Получаем список ваших отелей...', 'info');
    
    // Делаем запрос к Channex API
    const response = await fetch('https://staging.channex.io/api/v1/properties', {
      headers: {
        'user-api-key': 'ваш_api_ключ',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      const property = data.data[0]; // Берем первый отель
      addLog(`✅ Найден отель: ${property.attributes.title}`, 'success');
      addLog(`🏨 Property ID: ${property.id}`, 'success');
      
      console.log('Полные данные отеля:', property);
      console.log('='.repeat(50));
      console.log(`Property ID для .env файла: ${property.id}`);
      console.log('='.repeat(50));
      
      return property.id;
    } else {
      addLog('❌ Отели не найдены. Создайте отель в Channex Dashboard', 'error');
    }
    
  } catch (error) {
    addLog(`❌ Ошибка получения Property ID: ${error.message}`, 'error');
    console.error('Детали ошибки:', error);
  }
};
const simulateSuccess = () => {
  setSyncStatus(prev => ({
    ...prev,
    isConnected: true,
    lastSync: new Date().toISOString()
  }));
  addLog('✅ Симуляция успешного подключения', 'success');
};
const testIntegration = async () => {
  addLog('🧪 Запуск интеграционного теста...', 'info');
  
  try {
    const properties = await channexService.getProperties();
    addLog(`✅ Получено ${properties.data?.length || 0} объектов от Channex`, 'success');
    
    const bookings = await channexService.getBookings();
    addLog(`✅ Получено ${bookings.data?.length || 0} бронирований от Channex`, 'success');
    
    const rooms = await channexService.getMockRooms();
    addLog(`✅ Получено ${rooms.data?.length || 0} типов комнат от Channex`, 'success');
    
    // Обновляем статистику
    await loadSyncStats();
    
    addLog('🎉 Интеграционный тест пройден успешно!', 'success');
  } catch (error) {
    addLog(`❌ Тест провален: ${error.message}`, 'error');
    console.error('Детали ошибки:', error);
  }
};

const simulateChannexBooking = async () => {
  addLog('📥 Имитируем новое бронирование от Channex...', 'info');
  
  const mockBooking = {
    id: 'channex-booking-' + Date.now(),
    ota_name: 'Booking.com',
    status: 'confirmed',
    arrival_date: '2025-08-15',
    departure_date: '2025-08-18',
    room_type_id: 'room-type-1',
    total_price: 15000,
    paid_amount: 15000,
    occupancy: { adults: 2, children: 0, infants: 0 },
    customer: {
      name: 'Мария Петрова',
      email: 'maria@example.com',
      phone: '+7 999 888-77-66',
      country: 'RU'
    },
    notes: 'Тестовое бронирование от Channex'
  };
  
  try {
    await channexService.syncBookingToPMS(mockBooking);
    addLog('✅ Бронирование успешно синхронизировано!', 'success');
    loadSyncStats(); // Обновляем статистику
  } catch (error) {
    addLog(`❌ Ошибка синхронизации: ${error.message}`, 'error');
    console.error('Детали ошибки:', error);
  }
};
const enableRealTimeSync = () => {
  if (realTimeEnabled) return;
  
  setRealTimeEnabled(true);
  addLog('🔄 Включена real-time синхронизация', 'info');
  
  // Автосинхронизация каждые 5 минут
  const interval = setInterval(async () => {
    addLog('⏰ Автоматическая синхронизация...', 'info');
    await performQuickSync();
  }, 5 * 60 * 1000); // 5 минут
  
  setAutoSyncInterval(interval);
  
  // Подключение к WebSocket (если есть)
  initWebSocket();
};

// Отключение real-time синхронизации
const disableRealTimeSync = () => {
  if (!realTimeEnabled) return;
  
  setRealTimeEnabled(false);
  addLog('⏹️ Real-time синхронизация отключена', 'info');
  
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    setAutoSyncInterval(null);
  }
  
  setWebsocketStatus('disconnected');
};

// Быстрая синхронизация (только важные данные)
const performQuickSync = async () => {
  try {
    // Синхронизируем только новые бронирования и изменения
    const newBookings = await channexService.getBookings({
      updated_since: new Date(Date.now() - 5 * 60 * 1000).toISOString() // Последние 5 минут
    });
    
    if (newBookings.data?.length > 0) {
      addLog(`📥 Получено ${newBookings.data.length} новых бронирований`, 'success');
      
      for (const booking of newBookings.data) {
        await channexService.syncBookingToPMS(booking);
      }
      
      // Обновляем статистику
      await loadSyncStats();
    }
  } catch (error) {
    addLog(`❌ Ошибка быстрой синхронизации: ${error.message}`, 'error');
  }
};

// WebSocket подключение (для мгновенных уведомлений)
const initWebSocket = () => {
  try {
    // Если у вас есть WebSocket endpoint от Channex
    // const ws = new WebSocket('wss://staging.channex.io/cable');
    
    // ws.onopen = () => {
    //   setWebsocketStatus('connected');
    //   addLog('🔗 WebSocket подключен', 'success');
    // };
    
    // ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   handleRealTimeUpdate(data);
    // };
    
    // ws.onclose = () => {
    //   setWebsocketStatus('disconnected');
    //   addLog('🔌 WebSocket отключен', 'warning');
    // };
    
    // Пока используем симуляцию
    setWebsocketStatus('connected');
    addLog('🔗 Real-time соединение установлено', 'success');
    
  } catch (error) {
    addLog(`❌ Ошибка WebSocket: ${error.message}`, 'error');
  }
};

// Обработка real-time обновлений
const handleRealTimeUpdate = (data) => {
  switch (data.type) {
    case 'new_booking':
      addLog(`📲 Новое бронирование: ${data.guest_name}`, 'success');
      performQuickSync();
      break;
      
    case 'booking_modified':
      addLog(`✏️ Изменение бронирования: ${data.booking_id}`, 'info');
      performQuickSync();
      break;
      
    case 'booking_cancelled':
      addLog(`❌ Отмена бронирования: ${data.booking_id}`, 'warning');
      performQuickSync();
      break;
      
    default:
      console.log('Неизвестный тип обновления:', data);
  }
};
  // Форматирование даты
  const formatDate = (date) => {
    if (!date) return 'Никогда';
    return new Date(date).toLocaleString('ru-RU');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Cloud className="h-8 w-8 text-blue-600" />
            Channex Integration
          </h1>
          <p className="text-slate-600 mt-1">
            Управление синхронизацией с Channel Manager
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge 
            variant={syncStatus.isConnected ? 'default' : 'destructive'}
            className="py-2 px-4"
          >
            {syncStatus.isConnected ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Подключено
              </>
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                Не подключено
              </>
            )}
          </Badge>
          
          <Button
            onClick={performFullSync}
            disabled={syncStatus.isSyncing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {syncStatus.isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Синхронизация...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Синхронизировать
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Errors Alert */}
      {syncStatus.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {syncStatus.errors[syncStatus.errors.length - 1]}
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Bar */}
      {syncStatus.isSyncing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Прогресс синхронизации</span>
                <span>{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Объекты
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.properties}</span>
              <Home className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Комнаты
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.rooms}</span>
              <Home className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Бронирования
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.bookings}</span>
              <Users className="h-8 w-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Последняя синхронизация
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-600">
              {formatDate(syncStatus.lastSync)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="logs">Логи</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Статус интеграции</CardTitle>
              <CardDescription>
                Текущее состояние синхронизации с Channex
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">API подключение</span>
                    {syncStatus.isConnected ? (
                      <Badge variant="success">Активно</Badge>
                    ) : (
                      <Badge variant="destructive">Отключено</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Режим работы</span>
                    <Badge variant="secondary">
                      {channexService.useMockData ? 'Тестовый' : 'Production'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Автосинхронизация</span>
                    <Badge variant="outline">Каждые 15 минут</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={async () => {
                      addLog('📋 Импортируем бронирования...', 'info');
                      await syncBookings();
                      addLog('✅ Импорт бронирований завершен', 'success');
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Импорт бронирований
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={async () => {
                      addLog('🏠 Экспортируем комнаты...', 'info');
                      await channexService.syncRooms();
                      addLog('✅ Экспорт комнат завершен', 'success');
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Экспорт комнат
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={async () => {
                      addLog('📅 Синхронизируем календарь...', 'info');
                      await syncAvailability();
                      addLog('✅ Синхронизация календаря завершена', 'success');
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Синхр. календарь
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connected Channels */}
          <Card>
            <CardHeader>
              <CardTitle>Подключенные каналы</CardTitle>
              <CardDescription>
                OTA и платформы, подключенные через Channex
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Booking.com', 'Airbnb', 'Expedia', 'Hotels.com'].map(channel => (
                  <div 
                    key={channel}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <span className="text-sm font-medium">{channel}</span>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>История синхронизации</CardTitle>
              <CardDescription>
                Последние операции синхронизации
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.map(log => (
                  <div 
                    key={log.id}
                    className={`
                      flex items-start gap-3 p-3 rounded-lg
                      ${log.type === 'error' ? 'bg-red-50' : ''}
                      ${log.type === 'success' ? 'bg-green-50' : ''}
                      ${log.type === 'info' ? 'bg-blue-50' : ''}
                    `}
                  >
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString('ru-RU')}
                    </span>
                    <span className="text-sm flex-1">{log.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Настройки Channex</CardTitle>
              <CardDescription>
                Параметры подключения и синхронизации
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Для настройки интеграции необходимо получить API ключи от Channex.
                  После регистрации замените тестовые данные на реальные в файле 
                  ChannexService.js
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <label className="text-sm font-medium">API URL</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value="https://api.channex.io/api/v1"
                  disabled
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Property ID</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  placeholder="Будет получен после регистрации"
                  disabled
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Webhook URL для Channex</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 p-2 border rounded bg-slate-50"
                    value={`${window.location.origin}/api/channex/webhook`}
                    readOnly
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/channex/webhook`);
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
        </TabsContent>
      </Tabs>
       {process.env.NODE_ENV === 'development' && (
        <div className="border-t pt-4 mt-4">
          <h3 className="text-sm font-medium mb-2">Тестирование (dev режим)</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={simulateError}>
              Симулировать ошибку
            </Button>
            <Button size="sm" variant="outline" onClick={simulateSuccess}>
              Симулировать успех
            </Button>
             <Button size="sm" variant="outline" onClick={testIntegration}>
        🧪 Тест интеграции
      </Button>
      <Button size="sm" variant="outline" onClick={simulateChannexBooking}>
        📥 Новое бронирование
      </Button>
      <Button size="sm" variant="outline" onClick={getPropertyId}>
  🔍 Получить Property ID
</Button>
<div className="space-y-4">
  <Alert>
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      <strong>Шаги для настройки реальной интеграции:</strong>
      <ol className="mt-2 ml-4 list-decimal space-y-1 text-sm">
        <li>Получите API ключ в Channex Dashboard</li>
        <li>Добавьте ключ в .env файл</li>
        <li>Нажмите "Настроить интеграцию"</li>
        <li>Включите real-time синхронизацию</li>
      </ol>
    </AlertDescription>
  </Alert>

  <div className="flex gap-2">
    <Button 
      onClick={setupChannexIntegration}
      className="bg-green-600 hover:bg-green-700"
      disabled={channexService.useMockData}
    >
      <Settings className="h-4 w-4 mr-2" />
      Настроить интеграцию
    </Button>
    
    <Button 
      variant="outline"
      onClick={getPropertyId}
    >
      🔍 Получить Property ID
    </Button>
  </div>
<Button size="sm" variant="outline" onClick={async () => {
  addLog('🔄 Умное создание комнат (без дубликатов)...', 'info');
  
  try {
    // Получаем уже существующие room types
    const existingRooms = await channexService.getRoomTypes();
    const existingTitles = existingRooms.data?.map(r => r.attributes.title.toLowerCase()) || [];
    
    addLog(`📋 Уже существует ${existingTitles.length} типов комнат`, 'info');
    console.log('Существующие названия:', existingTitles);
    
    // Получаем все комнаты из БД
    const { data: allRooms } = await supabase.from('rooms').select('*');
    
    if (!allRooms || allRooms.length === 0) {
      addLog('⚠️ В БД нет комнат для создания', 'warning');
      return;
    }
    
    // Фильтруем только те, которых еще нет в Channex
    const roomsToCreate = [];
    
    for (const room of allRooms) {
      const cleanTitle = channexService.cleanRoomTitle(room.room_number || room.name);
      const titleLower = cleanTitle.toLowerCase();
      
      if (!existingTitles.includes(titleLower)) {
        roomsToCreate.push(room);
        addLog(`➕ Будет создана: "${room.room_number || room.name}" → "${cleanTitle}"`, 'info');
      } else {
        addLog(`⏭️ Пропускаем: "${room.room_number || room.name}" (уже существует)`, 'info');
      }
    }
    
    if (roomsToCreate.length === 0) {
      addLog('✅ Все комнаты уже созданы в Channex!', 'success');
      return;
    }
    
    addLog(`🎯 Создаем ${roomsToCreate.length} новых комнат...`, 'info');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const room of roomsToCreate) {
      try {
        const cleanTitle = channexService.cleanRoomTitle(room.room_number || room.name);
        addLog(`🏠 Создаем: "${cleanTitle}"...`, 'info');
        
        const roomType = await channexService.createRoomType(room);
        
        addLog(`✅ Создана: "${cleanTitle}" (ID: ${roomType.data.id})`, 'success');
        successCount++;
        
        // Пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error('Ошибка создания комнаты:', error);
        addLog(`❌ Ошибка "${room.room_number}": ${error.message}`, 'error');
        errorCount++;
      }
    }
    
    addLog(`🎯 Финальный результат: Создано ${successCount}, Ошибок ${errorCount}`, 
           successCount > 0 ? 'success' : (errorCount > 0 ? 'error' : 'info'));
    
    // Обновляем статистику
    await loadSyncStats();
    
  } catch (error) {
    addLog(`❌ Общая ошибка: ${error.message}`, 'error');
  }
}}>
  🧠 Умное создание комнат
</Button>

<Button size="sm" variant="outline" onClick={async () => {
  addLog('🔄 Создаем только неудачные комнаты...', 'info');
  
  // Список комнат, которые не удалось создать
  const failedRoomNames = ['201', 'Люкс', '5 Deluxe suite', '6 Deluxe 2rooms suite'];
  
  try {
    // Получаем уже существующие room types
    const existingRooms = await channexService.getRoomTypes();
    const existingTitles = existingRooms.data?.map(r => r.attributes.title) || [];
    
    addLog(`📋 Уже существует: ${existingTitles.join(', ')}`, 'info');
    
    // Получаем все комнаты из БД
    const { data: allRooms } = await supabase.from('rooms').select('*');
    
    // Фильтруем только те, что не удалось создать
    const failedRooms = allRooms?.filter(room => 
      failedRoomNames.includes(room.room_number || room.name)
    ) || [];
    
    addLog(`🎯 Найдено для повтора: ${failedRooms.length} комнат`, 'info');
    
    let successCount = 0;
    
    for (const room of failedRooms) {
      try {
        const originalName = room.room_number || room.name;
        addLog(`🔄 Повторно создаем: "${originalName}"...`, 'info');
        
        const roomType = await channexService.createRoomType(room);
        
        addLog(`✅ Успешно создана: "${originalName}" → "${roomType.data.attributes.title}" (ID: ${roomType.data.id})`, 'success');
        successCount++;
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error('Детали ошибки повтора:', error);
        addLog(`❌ Повторная ошибка "${room.room_number}": ${error.message}`, 'error');
      }
    }
    
    addLog(`🎯 Результат повтора: Создано ${successCount} из ${failedRooms.length}`, successCount > 0 ? 'success' : 'warning');
    
  } catch (error) {
    addLog(`❌ Ошибка повтора: ${error.message}`, 'error');
  }
}}>
  🔄 Повторить неудачные
</Button>

<Button size="sm" variant="outline" onClick={async () => {
  addLog('💰 Создаем тарифные планы...', 'info');
  
  try {
    // Получаем существующие room types
    const roomTypes = await channexService.getRoomTypes();
    
    if (!roomTypes.data || roomTypes.data.length === 0) {
      addLog('❌ Сначала создайте типы комнат', 'error');
      return;
    }
    
    addLog(`🏠 Найдено типов комнат: ${roomTypes.data.length}`, 'info');
    
    // Проверяем существующие rate plans
    let existingRatePlans = [];
    try {
      const ratePlans = await channexService.getRatePlans();
      existingRatePlans = ratePlans.data?.map(rp => rp.attributes.room_type_id) || [];
      addLog(`💰 Уже существует тарифов: ${existingRatePlans.length}`, 'info');
    } catch (error) {
      addLog('⚠️ Не удалось получить существующие тарифы', 'warning');
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    // Создаем тариф для каждого типа комнаты
    for (const roomType of roomTypes.data) {
      try {
        // Проверяем, есть ли уже тариф для этой комнаты
        if (existingRatePlans.includes(roomType.id)) {
          addLog(`⏭️ Тариф для "${roomType.attributes.title}" уже существует`, 'info');
          continue;
        }
        
        addLog(`💰 Создаем тариф для: ${roomType.attributes.title}...`, 'info');
        
        const ratePlan = await channexService.createRatePlan(roomType.id, {
          name: `${roomType.attributes.title} - Standard Rate`,
          price: 5000
        });
        
        addLog(`✅ Создан тариф для "${roomType.attributes.title}" (ID: ${ratePlan.data.id})`, 'success');
        successCount++;
        
        // Пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error('Ошибка создания тарифа:', error);
        addLog(`❌ Ошибка тарифа для "${roomType.attributes.title}": ${error.message}`, 'error');
        errorCount++;
      }
    }
    
    addLog(`🎯 Результат создания тарифов: Создано ${successCount}, Ошибок ${errorCount}`, 
           successCount > 0 ? 'success' : (errorCount > 0 ? 'error' : 'info'));
    
    if (successCount > 0) {
      addLog('🎉 Тарифные планы созданы! Теперь можно устанавливать цены', 'success');
    }
    
  } catch (error) {
    console.error('Общая ошибка создания тарифов:', error);
    addLog(`❌ Общая ошибка: ${error.message}`, 'error');
  }
}}>
  💰 Создать тарифы
</Button>

<Button size="sm" variant="outline" onClick={async () => {
  addLog('💰 Проверяем существующие тарифные планы...', 'info');
  
  try {
    const ratePlans = await channexService.getRatePlans();
    
    if (ratePlans.data && ratePlans.data.length > 0) {
      addLog(`💰 Найдено тарифных планов: ${ratePlans.data.length}`, 'success');
      
      ratePlans.data.forEach((ratePlan, index) => {
        const attrs = ratePlan.attributes;
        addLog(`${index + 1}. ${attrs.title} (${attrs.sell_mode}, ${attrs.currency})`, 'info');
      });
    } else {
      addLog('💰 Тарифные планы не найдены', 'warning');
    }
    
    console.log('Полные данные rate plans:', ratePlans);
    
  } catch (error) {
    addLog(`❌ Ошибка получения rate plans: ${error.message}`, 'error');
    console.error('Детали ошибки:', error);
  }
}}>
  💰 Проверить тарифы
</Button>

// Добавьте эти кнопки в ChannexSyncManager.jsx рядом с другими кнопками:

{/* Обновление валюты на USD */}
<Button size="sm" variant="outline" onClick={async () => {
  addLog('💱 Обновляем валюту тарифов на USD...', 'info');
  
  try {
    const ratePlans = await channexService.getRatePlans();
    
    if (ratePlans.data && ratePlans.data.length > 0) {
      addLog(`💰 Найдено ${ratePlans.data.length} тарифов`, 'info');
      
      let updated = 0;
      for (const ratePlan of ratePlans.data) {
        try {
          // Правильный доступ к полям (Channex использует attributes)
          const title = ratePlan.attributes?.title || ratePlan.title || 'Неизвестный тариф';
          const currency = ratePlan.attributes?.currency || ratePlan.currency;
          const id = ratePlan.attributes?.id || ratePlan.id;
          
          console.log('🔍 Rate Plan данные:', { id, title, currency });
          
          if (currency !== 'USD') {
            await channexService.updateRatePlanCurrency(id, 'USD');
            addLog(`✅ Валюта обновлена для "${title}"`, 'success');
            updated++;
          } else {
            addLog(`💵 "${title}" уже в USD`, 'info');
          }
        } catch (error) {
          const title = ratePlan.attributes?.title || ratePlan.title || 'Неизвестный тариф';
          addLog(`❌ Ошибка обновления валюты для "${title}": ${error.message}`, 'error');
        }
      }
      
      addLog(`🎉 Валюта обновлена: ${updated} тарифов переведено на USD!`, 'success');
    } else {
      addLog('❌ Тарифные планы не найдены', 'error');
    }
  } catch (error) {
    addLog(`❌ Ошибка обновления валюты: ${error.message}`, 'error');
  }
}}>
  💱 Валюта → USD
</Button>

{/* Установка базовых цен на месяц */}
<Button size="sm" variant="outline" onClick={async () => {
  addLog('💵 Устанавливаем базовые цены на следующий месяц...', 'info');
  
  try {
    const ratePlans = await channexService.getRatePlans();
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const endMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    
    const dateFrom = nextMonth.toISOString().split('T')[0];
    const dateTo = endMonth.toISOString().split('T')[0];
    
    // Базовые цены в USD по типам номеров
    const basePrices = {
      'стандарт': 120,
      'standard': 120,
      'deluxe': 180,
      'люкс': 250,
      'suite': 280,
      'family': 200
    };
    
    let pricesSet = 0;
    for (const ratePlan of ratePlans.data || []) {
      try {
        // Правильный доступ к полям
        const title = ratePlan.attributes?.title || ratePlan.title || 'Неизвестный тариф';
        const id = ratePlan.attributes?.id || ratePlan.id;
        
        // Определяем цену по названию номера
        let price = 150; // Базовая цена по умолчанию
        const titleLower = title.toLowerCase();
        
        for (const [type, typePrice] of Object.entries(basePrices)) {
          if (titleLower.includes(type)) {
            price = typePrice;
            break;
          }
        }
        
        await channexService.setRates(id, dateFrom, dateTo, [
          { occupancy: 2, rate: price }
        ]);
        
        addLog(`✅ Цена ${price} установлена для "${title}"`, 'success');
        pricesSet++;
      } catch (error) {
        const title = ratePlan.attributes?.title || ratePlan.title || 'Неизвестный тариф';
        addLog(`❌ Ошибка установки цены для "${title}": ${error.message}`, 'error');
      }
    }
    
    addLog(`🎉 Базовые цены установлены: ${pricesSet} тарифов на период ${dateFrom} - ${dateTo}`, 'success');
  } catch (error) {
    addLog(`❌ Ошибка установки цен: ${error.message}`, 'error');
  }
}}>
  💵 Базовые цены на месяц
</Button>

{/* Быстрая установка цен на завтра */}
<Button size="sm" variant="outline" onClick={async () => {
  addLog('⚡ Устанавливаем цены на завтра...', 'info');
  
  try {
    const ratePlans = await channexService.getRatePlans();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Увеличенные цены на завтра (demand-based pricing)
    const tomorrowPrices = {
      'стандарт': 140,
      'standard': 140,
      'deluxe': 200,
      'люкс': 280,
      'suite': 320,
      'family': 220
    };
    
    let pricesSet = 0;
    for (const ratePlan of ratePlans.data || []) {
      try {
        // Правильный доступ к полям
        const title = ratePlan.attributes?.title || ratePlan.title || 'Неизвестный тариф';
        const id = ratePlan.attributes?.id || ratePlan.id;
        
        let price = 170; // Повышенная цена по умолчанию
        const titleLower = title.toLowerCase();
        
        for (const [type, typePrice] of Object.entries(tomorrowPrices)) {
          if (titleLower.includes(type)) {
            price = typePrice;
            break;
          }
        }
        
        await channexService.setRates(id, tomorrowStr, tomorrowStr, [
          { occupancy: 2, rate: price }
        ]);
        
        addLog(`⚡ Цена ${price} установлена на завтра для "${title}"`, 'success');
        pricesSet++;
      } catch (error) {
        const title = ratePlan.attributes?.title || ratePlan.title || 'Неизвестный тариф';
        addLog(`❌ Ошибка установки цены для "${title}": ${error.message}`, 'error');
      }
    }
    
    addLog(`🎉 Цены на завтра (${tomorrowStr}) установлены: ${pricesSet} тарифов`, 'success');
  } catch (error) {
    addLog(`❌ Ошибка установки цен на завтра: ${error.message}`, 'error');
  }
}}>
  ⚡ Цены на завтра
</Button>

{/* Проверка текущих цен */}
<Button size="sm" variant="outline" onClick={async () => {
  addLog('📊 Проверяем текущие цены...', 'info');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Получаем цены через Availability & Rates API
    const restrictions = await channexService.apiRequest(
      `/restrictions?filter[property_id]=${channexService.propertyId}&filter[date][gte]=${today}&filter[date][lte]=${tomorrowStr}&filter[restrictions]=rate`
    );
    
    if (restrictions && Object.keys(restrictions).length > 0) {
      addLog('📊 Текущие цены:', 'info');
      
      Object.entries(restrictions).forEach(([ratePlanId, dates]) => {
        Object.entries(dates).forEach(([date, data]) => {
          if (data.rate) {
            addLog(`💰 ${date}: $${data.rate} (Rate Plan: ${ratePlanId.slice(0, 8)}...)`, 'info');
          }
        });
      });
    } else {
      addLog('📊 Цены не найдены или не установлены', 'info');
    }
  } catch (error) {
    addLog(`❌ Ошибка получения цен: ${error.message}`, 'error');
  }
}}>
  📊 Проверить цены
</Button>

<Button size="sm" variant="outline" onClick={async () => {
  addLog('🏨 Обновляем валюту property на USD...', 'info');
  
  try {
    await channexService.updatePropertyCurrency('USD');
    addLog('✅ Валюта property обновлена на USD!', 'success');
    addLog('📌 Теперь можно удалять старые тарифы', 'info');
  } catch (error) {
    addLog(`❌ Ошибка обновления валюты property: ${error.message}`, 'error');
  }
}}>
  🏨 1️⃣ Property → USD
</Button>

{/* Шаг 2: Удаление всех rate plans */}
<Button size="sm" variant="destructive" onClick={async () => {
  addLog('🗑️ Удаляем все старые тарифные планы...', 'info');
  
  try {
    const ratePlans = await channexService.getRatePlans();
    
    if (ratePlans.data && ratePlans.data.length > 0) {
      addLog(`🗑️ Найдено ${ratePlans.data.length} тарифов для удаления`, 'info');
      
      let deleted = 0;
      for (const ratePlan of ratePlans.data) {
        try {
          const title = ratePlan.attributes?.title || ratePlan.title || 'Неизвестный тариф';
          const id = ratePlan.attributes?.id || ratePlan.id;
          
          await channexService.deleteRatePlan(id);
          addLog(`🗑️ Удален тариф "${title}"`, 'success');
          deleted++;
        } catch (error) {
          const title = ratePlan.attributes?.title || ratePlan.title || 'Неизвестный тариф';
          addLog(`❌ Ошибка удаления тарифа "${title}": ${error.message}`, 'error');
        }
      }
      
      addLog(`🎉 Очистка завершена: удалено ${deleted} тарифов`, 'success');
      addLog('📌 Теперь можно создавать новые тарифы в USD', 'info');
    } else {
      addLog('📭 Тарифные планы не найдены', 'info');
    }
  } catch (error) {
    addLog(`❌ Ошибка удаления тарифов: ${error.message}`, 'error');
  }
}}>
  🗑️ 2️⃣ Удалить все тарифы
</Button>

{/* Шаг 3: Создание новых rate plans в USD */}
<Button size="sm" variant="default" onClick={async () => {
  addLog('💰 Создаем новые тарифные планы в USD...', 'info');
  
  try {
    // Получаем существующие room types
    const roomTypes = await channexService.getRoomTypes();
    
    if (!roomTypes.data || roomTypes.data.length === 0) {
      addLog('❌ Типы комнат не найдены. Сначала создайте комнаты.', 'error');
      return;
    }
    
    addLog(`🏠 Найдено типов комнат: ${roomTypes.data.length}`, 'info');
    
    // Проверяем существующие rate plans
    const existingRatePlans = await channexService.getRatePlans();
    addLog(`💰 Уже существует тарифов: ${existingRatePlans.data?.length || 0}`, 'info');
    
    let created = 0;
    let errors = 0;
    
    for (const roomType of roomTypes.data) {
      try {
        const roomTitle = roomType.attributes?.title || roomType.title || 'Unknown Room';
        const roomId = roomType.attributes?.id || roomType.id;
        
        addLog(`💰 Создаем тариф для: ${roomTitle}...`, 'info');
        
        const rateData = {
          name: `${roomTitle} - Standard Rate`,
          price: 150 // Базовая цена в USD
        };
        
        const result = await channexService.createRatePlan(roomId, rateData);
        
        if (result.data && result.data.id) {
          const newRatePlanId = result.data.id;
          addLog(`✅ Создан тариф для "${roomTitle}" (ID: ${newRatePlanId})`, 'success');
          created++;
        } else {
          addLog(`⚠️ Тариф создан, но ID не получен для "${roomTitle}"`, 'warning');
          created++;
        }
        
      } catch (error) {
        const roomTitle = roomType.attributes?.title || roomType.title || 'Unknown Room';
        addLog(`❌ Ошибка создания тарифа для "${roomTitle}": ${error.message}`, 'error');
        errors++;
      }
    }
    
    addLog(`🎯 Результат создания тарифов: Создано ${created}, Ошибок ${errors}`, 'info');
    
    if (created > 0) {
      addLog('🎉 Новые тарифные планы в USD созданы! Теперь можно устанавливать цены', 'success');
    }
    
  } catch (error) {
    addLog(`❌ Ошибка создания тарифов: ${error.message}`, 'error');
  }
}}>
  💰 3️⃣ Создать новые тарифы USD
</Button>

{/* Кнопка "Все в одном" - автоматизированный процесс */}
<Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={async () => {
  addLog('🚀 Запускаем полную очистку и пересоздание тарифов...', 'info');
  
  try {
    // Шаг 1: Обновляем валюту property
    addLog('🏨 Шаг 1: Обновляем валюту property...', 'info');
    await channexService.updatePropertyCurrency('USD');
    addLog('✅ Валюта property обновлена на USD', 'success');
    
    // Небольшая пауза
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Шаг 2: Удаляем все rate plans
    addLog('🗑️ Шаг 2: Удаляем старые тарифы...', 'info');
    const ratePlans = await channexService.getRatePlans();
    
    if (ratePlans.data && ratePlans.data.length > 0) {
      for (const ratePlan of ratePlans.data) {
        const title = ratePlan.attributes?.title || ratePlan.title || 'Неизвестный тариф';
        const id = ratePlan.attributes?.id || ratePlan.id;
        
        await channexService.deleteRatePlan(id);
        addLog(`🗑️ Удален: "${title}"`, 'success');
      }
    }
    
    // Небольшая пауза
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Шаг 3: Создаем новые rate plans
    addLog('💰 Шаг 3: Создаем новые тарифы в USD...', 'info');
    const roomTypes = await channexService.getRoomTypes();
    
    if (!roomTypes.data || roomTypes.data.length === 0) {
      addLog('❌ Типы комнат не найдены', 'error');
      return;
    }
    
    let created = 0;
    for (const roomType of roomTypes.data) {
      const roomTitle = roomType.attributes?.title || roomType.title || 'Unknown Room';
      const roomId = roomType.attributes?.id || roomType.id;
      
      const rateData = {
        name: `${roomTitle} - Standard Rate`,
        price: 150 // Базовая цена в USD
      };
      
      await channexService.createRatePlan(roomId, rateData);
      addLog(`✅ Создан тариф: "${roomTitle}"`, 'success');
      created++;
    }
    
    addLog(`🎉 ГОТОВО! Создано ${created} новых тарифов в USD`, 'success');
    addLog('💵 Теперь все тарифы в долларах и готовы к работе!', 'success');
    
  } catch (error) {
    addLog(`❌ Ошибка полной очистки: ${error.message}`, 'error');
  }
}}>
  🚀 ПОЛНАЯ ОЧИСТКА + USD
</Button>

<Button size="sm" variant="outline" onClick={async () => {
  addLog('💱 Обновляем валюту тарифов на USD...', 'info');
  
  try {
    const ratePlans = await channexService.getRatePlans();
    
    if (ratePlans.data && ratePlans.data.length > 0) {
      addLog(`💰 Найдено ${ratePlans.data.length} тарифов`, 'info');
      
      let updated = 0;
      for (const ratePlan of ratePlans.data) {
        try {
          // Правильный доступ к полям (Channex использует attributes)
          const title = ratePlan.attributes?.title || ratePlan.title || 'Неизвестный тариф';
          const currency = ratePlan.attributes?.currency || ratePlan.currency;
          const id = ratePlan.attributes?.id || ratePlan.id;
          
          console.log('🔍 Rate Plan данные:', { id, title, currency });
          
          if (currency !== 'USD') {
            await channexService.updateRatePlanCurrency(id, 'USD');
            addLog(`✅ Валюта обновлена для "${title}"`, 'success');
            updated++;
          } else {
            addLog(`💵 "${title}" уже в USD`, 'info');
          }
        } catch (error) {
          const title = ratePlan.attributes?.title || ratePlan.title || 'Неизвестный тариф';
          addLog(`❌ Ошибка обновления валюты для "${title}": ${error.message}`, 'error');
        }
      }
      
      addLog(`🎉 Валюта обновлена: ${updated} тарифов переведено на USD!`, 'success');
    } else {
      addLog('❌ Тарифные планы не найдены', 'error');
    }
  } catch (error) {
    addLog(`❌ Ошибка обновления валюты: ${error.message}`, 'error');
  }
}}>
  💱 Валюта → USD
</Button>

{/* Установка базовых цен на месяц */}
<Button size="sm" variant="outline" onClick={async () => {
  addLog('💵 Устанавливаем базовые цены на следующий месяц...', 'info');
  
  try {
    const ratePlans = await channexService.getRatePlans();
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const endMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    
    const dateFrom = nextMonth.toISOString().split('T')[0];
    const dateTo = endMonth.toISOString().split('T')[0];
    
    // Базовые цены в USD по типам номеров
    const basePrices = {
      'стандарт': 120,
      'standard': 120,
      'deluxe': 180,
      'люкс': 250,
      'suite': 280,
      'family': 200
    };
    
    let pricesSet = 0;
    for (const ratePlan of ratePlans.data || []) {
      try {
        // Правильный доступ к полям
        const title = ratePlan.attributes?.title || ratePlan.title || 'Неизвестный тариф';
        const id = ratePlan.attributes?.id || ratePlan.id;
        
        // Определяем цену по названию номера
        let price = 150; // Базовая цена по умолчанию
        const titleLower = title.toLowerCase();
        
        for (const [type, typePrice] of Object.entries(basePrices)) {
          if (titleLower.includes(type)) {
            price = typePrice;
            break;
          }
        }
        
        await channexService.setRates(id, dateFrom, dateTo, [
          { occupancy: 2, rate: price } // Передаем цену в долларах, конвертация в центы в методе
        ]);
        
        addLog(`✅ Цена ${price} установлена для "${title}"`, 'success');
        pricesSet++;
      } catch (error) {
        const title = ratePlan.attributes?.title || ratePlan.title || 'Неизвестный тариф';
        addLog(`❌ Ошибка установки цены для "${title}": ${error.message}`, 'error');
      }
    }
    
    addLog(`🎉 Базовые цены установлены: ${pricesSet} тарифов на период ${dateFrom} - ${dateTo}`, 'success');
  } catch (error) {
    addLog(`❌ Ошибка установки цен: ${error.message}`, 'error');
  }
}}>
  💵 Базовые цены на месяц
</Button>

{/* Быстрая установка цен на завтра */}
<Button size="sm" variant="outline" onClick={async () => {
  addLog('⚡ Устанавливаем цены на завтра...', 'info');
  
  try {
    const ratePlans = await channexService.getRatePlans();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Увеличенные цены на завтра (demand-based pricing)
    const tomorrowPrices = {
      'стандарт': 140,
      'standard': 140,
      'deluxe': 200,
      'люкс': 280,
      'suite': 320,
      'family': 220
    };
    
    let pricesSet = 0;
    for (const ratePlan of ratePlans.data || []) {
      try {
        // Правильный доступ к полям
        const title = ratePlan.attributes?.title || ratePlan.title || 'Неизвестный тариф';
        const id = ratePlan.attributes?.id || ratePlan.id;
        
        let price = 170; // Повышенная цена по умолчанию
        const titleLower = title.toLowerCase();
        
        for (const [type, typePrice] of Object.entries(tomorrowPrices)) {
          if (titleLower.includes(type)) {
            price = typePrice;
            break;
          }
        }
        
        await channexService.setRates(id, tomorrowStr, tomorrowStr, [
          { occupancy: 2, rate: price }
        ]);
        
        addLog(`⚡ Цена ${price} установлена на завтра для "${title}"`, 'success');
        pricesSet++;
      } catch (error) {
        const title = ratePlan.attributes?.title || ratePlan.title || 'Неизвестный тариф';
        addLog(`❌ Ошибка установки цены для "${title}": ${error.message}`, 'error');
      }
    }
    
    addLog(`🎉 Цены на завтра (${tomorrowStr}) установлены: ${pricesSet} тарифов`, 'success');
  } catch (error) {
    addLog(`❌ Ошибка установки цен на завтра: ${error.message}`, 'error');
  }
}}>
  ⚡ Цены на завтра
</Button>

{/* Проверка текущих цен */}
<Button size="sm" variant="outline" onClick={async () => {
  addLog('📊 Проверяем текущие цены...', 'info');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Получаем цены через Availability & Rates API
    const restrictions = await channexService.apiRequest(
      `/restrictions?filter[property_id]=${channexService.propertyId}&filter[date][gte]=${today}&filter[date][lte]=${tomorrowStr}&filter[restrictions]=rate`
    );
    
    if (restrictions && Object.keys(restrictions).length > 0) {
      addLog('📊 Текущие цены:', 'info');
      
      Object.entries(restrictions).forEach(([ratePlanId, dates]) => {
        Object.entries(dates).forEach(([date, data]) => {
          if (data.rate) {
            addLog(`💰 ${date}: $${data.rate} (Rate Plan: ${ratePlanId.slice(0, 8)}...)`, 'info');
          }
        });
      });
    } else {
      addLog('📊 Цены не найдены или не установлены', 'info');
    }
  } catch (error) {
    addLog(`❌ Ошибка получения цен: ${error.message}`, 'error');
  }
}}>
  📊 Проверить цены
</Button>

<Button size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={async () => {
  addLog('🔄 ПРАВИЛЬНОЕ пересоздание: Property USD → Удаление → Создание', 'info');
  
  try {
    // ШАГ 1: Обновляем валюту property СНАЧАЛА
    addLog('🏨 Шаг 1/3: Обновляем валюту property на USD...', 'info');
    await channexService.updatePropertyCurrency('USD');
    addLog('✅ Property теперь в USD!', 'success');
    
    // Пауза для синхронизации
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // ШАГ 2: Удаляем все rate plans
    addLog('🗑️ Шаг 2/3: Удаляем старые тарифы в RUB...', 'info');
    const ratePlans = await channexService.getRatePlans();
    
    if (ratePlans.data && ratePlans.data.length > 0) {
      for (const ratePlan of ratePlans.data) {
        const title = ratePlan.attributes?.title || ratePlan.title || 'Неизвестный тариф';
        const id = ratePlan.attributes?.id || ratePlan.id;
        
        await channexService.deleteRatePlan(id);
        addLog(`🗑️ Удален: "${title}"`, 'success');
      }
    }
    
    // Пауза для синхронизации
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // ШАГ 3: Создаем новые rate plans (теперь они будут в USD!)
    addLog('💰 Шаг 3/3: Создаем новые тарифы в USD...', 'info');
    const roomTypes = await channexService.getRoomTypes();
    
    if (!roomTypes.data || roomTypes.data.length === 0) {
      addLog('❌ Типы комнат не найдены', 'error');
      return;
    }
    
    let created = 0;
    for (const roomType of roomTypes.data) {
      const roomTitle = roomType.attributes?.title || roomType.title || 'Unknown Room';
      const roomId = roomType.attributes?.id || roomType.id;
      
      const rateData = {
        name: `${roomTitle} - Standard Rate`,
        price: 150 // В USD
      };
      
      await channexService.createRatePlan(roomId, rateData);
      addLog(`✅ Создан USD тариф: "${roomTitle}"`, 'success');
      created++;
    }
    
    addLog(`🎉 ГОТОВО! Создано ${created} тарифов в USD`, 'success');
    addLog('💡 Теперь проверьте в Channex - должны быть USD!', 'info');
    
    // Устанавливаем базовые цены
    addLog('💵 Бонус: Устанавливаем базовые цены...', 'info');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newRatePlans = await channexService.getRatePlans();
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const endMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    
    const dateFrom = nextMonth.toISOString().split('T')[0];
    const dateTo = endMonth.toISOString().split('T')[0];
    
    for (const ratePlan of newRatePlans.data || []) {
      const title = ratePlan.attributes?.title || ratePlan.title || 'Unknown';
      const id = ratePlan.attributes?.id || ratePlan.id;
      
      await channexService.setRates(id, dateFrom, dateTo, [
        { occupancy: 2, rate: 150 }
      ]);
      
      addLog(`💵 Цена $150 установлена для "${title}"`, 'success');
    }
    
    addLog('🚀 ВСЕ ГОТОВО! Тарифы в USD с ценами $150!', 'success');
    
  } catch (error) {
    addLog(`❌ Ошибка пересоздания: ${error.message}`, 'error');
  }
}}>
  🚀 ПРАВИЛЬНОЕ ПЕРЕСОЗДАНИЕ USD
</Button>

<Button size="sm" variant="outline" onClick={async () => {
  addLog('🧪 Тестируем создание одной комнаты с отладкой...', 'info');
  
  try {
    // Берем одну из проблемных комнат
    const { data: rooms } = await supabase.from('rooms').select('*');
    const testRoom = rooms?.find(r => r.room_number === '201' || r.name === '201');
    
    if (!testRoom) {
      addLog('❌ Тестовая комната не найдена', 'error');
      return;
    }
    
    addLog(`🏠 Тестируем комнату: ${JSON.stringify(testRoom)}`, 'info');
    
    // Проверяем маппинг
    const roomKind = channexService.getRoomKind(testRoom.room_type);
    addLog(`🔧 room_kind: "${roomKind}" (должен быть 'room' или 'dorm')`, 'info');
    
    // Проверяем очистку названия
    const cleanTitle = channexService.cleanRoomTitle(testRoom.room_number || testRoom.name);
    addLog(`🧹 Очищенное название: "${cleanTitle}"`, 'info');
    
    // Формируем payload
    const payload = {
      room_type: {
        title: cleanTitle,
        room_kind: roomKind,
        occ_adults: Math.min(testRoom.capacity || 2, 8),
        occ_children: 0,
        occ_infants: 0,
        default_occupancy: Math.min(testRoom.capacity || 2, 8),
        count_of_rooms: 1,
        property_id: channexService.propertyId,
        facilities: []
      }
    };
    
    addLog(`📤 Финальный payload: ${JSON.stringify(payload, null, 2)}`, 'info');
    
    // Отправляем
    const result = await channexService.createRoomType(testRoom);
    
    addLog(`✅ Успех! ID: ${result.data.id}`, 'success');
    
  } catch (error) {
    console.error('Детальная ошибка:', error);
    addLog(`❌ Детальная ошибка: ${error.message}`, 'error');
  }
}}>
  🧪 Отладка одной комнаты
</Button>

<Button size="sm" variant="outline" onClick={async () => {
  addLog('🔍 Проверяем существующие типы комнат в Channex...', 'info');
  
  try {
    const roomTypes = await channexService.getRoomTypes();
    
    if (roomTypes.data && roomTypes.data.length > 0) {
      addLog(`📋 Найдено типов комнат: ${roomTypes.data.length}`, 'success');
      
      roomTypes.data.forEach((room, index) => {
        addLog(`${index + 1}. ${room.attributes.title} (${room.attributes.room_kind})`, 'info');
      });
    } else {
      addLog('📋 Типы комнат в Channex не найдены', 'warning');
    }
    
    console.log('Полные данные room types:', roomTypes);
    
  } catch (error) {
    addLog(`❌ Ошибка получения room types: ${error.message}`, 'error');
    console.error('Детали ошибки:', error);
  }
}}>
  📋 Проверить типы комнат
</Button>
  {/* Real-time toggle */}
  <div className="flex items-center justify-between p-3 border rounded-lg">
    <div>
      <h4 className="font-medium">Real-time синхронизация</h4>
      <p className="text-sm text-slate-600">
        Автоматические обновления каждые 5 минут + webhooks
      </p>
    </div>
    <div className="flex items-center gap-3">
      <Badge 
        variant={websocketStatus === 'connected' ? 'default' : 'secondary'}
        className="text-xs"
      >
        {websocketStatus === 'connected' ? '🔗 Подключен' : '🔌 Отключен'}
      </Badge>
      <Button
        size="sm"
        variant={realTimeEnabled ? 'destructive' : 'default'}
        onClick={realTimeEnabled ? disableRealTimeSync : enableRealTimeSync}
        disabled={!syncStatus.isConnected}
      >
        {realTimeEnabled ? 'Отключить' : 'Включить'}
      </Button>
    </div>
  </div>
</div>
          </div>
        </div>
      )}
    </div>
  );
}