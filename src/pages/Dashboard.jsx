import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ChevronRight, Plus, LogOut, Globe, FileText } from 'lucide-react';
import BookingGrid from '../components/dashboard/BookingGrid';
import NewBookingModal from '../components/dashboard/NewBookingModal';
import DashboardStatistics from '../components/dashboard/DashboardStatistics';
import ReportsModal from '../components/dashboard/ReportsModal';
import { getBookingsForRange, getRooms, getServices } from '@/components/integrations/Supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTranslation } from '@/hooks/useTranslation';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
// Импортируем Channex сервис для обновления цен
import channexService from '@/services/channex/ChannexService.jsx';

export default function Dashboard() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [services, setServices] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [showReportsModal, setShowReportsModal] = useState(false);
  
  const { signOut } = useAuth();
  const { t, i18n, currentLanguage } = useTranslation('dashboard');
  const navigate = useNavigate(); // Хук для навигации
  
  // Определяем локаль для date-fns
  const dateLocale = currentLanguage === 'ru' ? ru : enUS;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const fetchDataForRange = useCallback(async (startDate, endDate) => {
    setLoading(true);
    setError('');
    try {
      console.log('🔄 Fetching bookings for range:', { startDate, endDate });
      
      // Получаем брони с полной информацией о гостях и услугах
      const bookingsResult = await getBookingsForRange(startDate, endDate);
      if (bookingsResult.error) throw bookingsResult.error;
      
      // Убеждаемся, что у нас есть полная информация о бронях
      const bookingsWithFullData = bookingsResult.data || [];
      console.log('📊 Loaded bookings with services:', bookingsWithFullData.map(b => ({
        id: b.id.substring(0, 8),
        guest: b.guests?.full_name,
        services: b.booking_services?.length || 0
      })));
      
      setBookings(bookingsWithFullData);
    } catch (err) {
      console.error('❌ Error loading bookings:', err);
      setError(t('errors.loadingBookings', { error: err.message }));
    } finally {
      setLoading(false);
    }
  }, [t]);
  
  useEffect(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    fetchDataForRange(monthStart, monthEnd);
  }, [currentMonth, fetchDataForRange]);

  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const [roomsResult, servicesResult] = await Promise.all([getRooms(), getServices()]);
        
        if (roomsResult.error) throw roomsResult.error;
        if (servicesResult.error) throw servicesResult.error;
        
        const roomsData = roomsResult.data || [];
        const servicesData = servicesResult.data || [];
        
        console.log('🏨 Loaded rooms:', roomsData);
        console.log('🛎️ Loaded services:', servicesData);
        
        setRooms(roomsData);
        setServices(servicesData);
      } catch (err) {
        console.error('Error loading static data:', err);
        setError(t('errors.loadingData', { error: err.message }));
      }
    };
    fetchStaticData();
  }, [t]);

  // Обработчик изменения цены через Channex
  const handlePriceChange = async (roomId, date, newPrice) => {
    try {
      console.log(`🔄 Обновляем цену: комната ${roomId}, дата ${date}, цена $${newPrice}`);
      
      // Найдем соответствующий rate plan для комнаты
      const room = rooms.find(r => r.id === roomId);
      
      if (!room) {
        throw new Error(`Room with id ${roomId} not found`);
      }
      
      // Получаем rate plans для этой комнаты
      const ratePlans = await channexService.getRatePlans();
      
      if (!ratePlans.data || ratePlans.data.length === 0) {
        console.warn('⚠️ No rate plans found in Channex, updating local price only');
        return; // Обновляем только локальную цену
      }
      
      // Находим rate plan по названию комнаты или ID
      const ratePlan = ratePlans.data.find(rp => {
        const title = rp.attributes?.title || rp.title || '';
        const roomName = room.room_number || room.name || '';
        const roomType = room.room_type || '';
        
        // Ищем по названию комнаты, типу или ID
        return title.includes(roomName) || 
               title.includes(roomType) || 
               (rp.attributes?.room_type_id && rp.attributes.room_type_id === room.channex_room_type_id);
      });
      
      if (!ratePlan) {
        console.warn(`⚠️ Rate plan not found for room ${room.room_number}, updating local price only`);
        return; // Обновляем только локальную цену
      }
      
      const ratePlanId = ratePlan.attributes?.id || ratePlan.id;
      
      // Обновляем цену в Channex на конкретную дату
      await channexService.setRates(ratePlanId, date, date, [
        { occupancy: 1, rate: newPrice }, // Для 1 гостя
        { occupancy: 2, rate: newPrice }  // Для 2 гостей
      ]);
      
      console.log(`✅ Цена успешно обновлена в Channex для rate plan ${ratePlanId}`);
      
    } catch (error) {
      console.error('❌ Ошибка обновления цены в Channex:', error);
      
      // Показываем ошибку пользователю, но не блокируем локальное обновление
      const errorMessage = error.message || 'Неизвестная ошибка';
      console.warn(`⚠️ Channex update failed: ${errorMessage}. Price updated locally only.`);
      
      // Не перебрасываем ошибку, чтобы локальное обновление цены сработало
    }
  };

  const handleBookingSaved = useCallback(() => {
    console.log('📝 Booking saved, refreshing data...');
    setShowNewBookingModal(false);
    setSelectedCell(null);
    setEditingBooking(null);
    
    // Обновляем данные после сохранения брони
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    fetchDataForRange(monthStart, monthEnd);
  }, [currentMonth, fetchDataForRange]);
  
  const handleCellClick = useCallback((roomId, date) => {
    console.log('🎯 Cell clicked:', { roomId, date });
    setSelectedCell({ roomId, checkIn: date, checkOut: addMonths(date, 1) });
    setEditingBooking(null); // Очищаем редактируемую бронь
    setShowNewBookingModal(true);
  }, []);
  
  const handleBookingClick = useCallback((booking) => {
    console.log('📋 Booking clicked:', booking);
    setEditingBooking(booking);
    setSelectedCell(null); // Очищаем выбранную ячейку
    setShowNewBookingModal(true);
  }, []);
  
  const handleSelectionEnd = useCallback((roomId, checkIn, checkOut) => {
    console.log('🎯 Selection ended:', { roomId, checkIn, checkOut });
    setSelectedCell({ roomId, checkIn, checkOut });
    setEditingBooking(null); // Очищаем редактируемую бронь
    setShowNewBookingModal(true);
  }, []);

  const navigateMonth = (direction) => {
    setCurrentMonth(current => addMonths(current, direction));
  };

  // Функция навигации из статистики к спискам
  const handleStatisticsNavigation = (route) => {
    console.log('📊 Statistics navigation to:', route);
    navigate(route);
  };
  
  const days = eachDayOfInterval({ 
    start: startOfMonth(currentMonth), 
    end: endOfMonth(currentMonth) 
  });

  // Показываем скелетон пока загружаются данные
  if (loading && rooms.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
        <Card className="p-6">
          <Skeleton className="h-[60vh] w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{t('title')}</h1>
          <p className="text-slate-600 mt-1">{t('subtitle')}</p>
        </div>
        
        {/* Переключатель языка справа */}
        <LanguageSwitcher />
      </div>

      {/* Панель навигации и статистики */}
      <div className="flex items-center justify-between">
        {/* Левая группа - навигация и новая бронь */}
        <div className="flex items-center space-x-4">
          {/* Month Navigation */}
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigateMonth(-1)}
              title={t('navigation.previousMonth')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[160px] text-center">
              <span className="text-lg font-semibold text-slate-800">
                {format(currentMonth, 'LLLL yyyy', { locale: dateLocale })}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigateMonth(1)}
              title={t('navigation.nextMonth')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* New Booking Button */}
          <Button onClick={() => {
            setEditingBooking(null);
            setSelectedCell(null);
            setShowNewBookingModal(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            {t('actions.newReservation')}
          </Button>
          
          {/* Reports Button */}
          <Button 
            variant="outline"
            onClick={() => setShowReportsModal(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Отчет
          </Button>
        </div>

        {/* Центральный блок статистики */}
        <DashboardStatistics 
          bookings={bookings} 
          onNavigate={handleStatisticsNavigation}
        />

        {/* Правая группа - системные кнопки */}
        <div className="flex items-center space-x-2">
          {/* Sign Out Button */}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleSignOut} 
            title={t('actions.signOut')}
          >
            <LogOut className="h-4 w-4 text-slate-600" />
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card className="booking-grid overflow-hidden">
        {rooms.length > 0 ? (
          <BookingGrid 
            rooms={rooms} 
            bookings={bookings} 
            days={days} 
            onCellClick={handleCellClick} 
            onBookingClick={handleBookingClick} 
            onSelectionEnd={handleSelectionEnd}
            onPriceChange={handlePriceChange}
          />
        ) : (
          <div className="p-8 text-center text-slate-500">
            {loading ? 'Загрузка...' : 'Нет доступных комнат'}
          </div>
        )}
      </Card>
      
      {showNewBookingModal && (
        <NewBookingModal 
          bookingToEdit={editingBooking} 
          selectedCell={selectedCell} 
          allBookings={bookings}
          rooms={rooms} 
          services={services} 
          onClose={() => { 
            setShowNewBookingModal(false); 
            setSelectedCell(null); 
            setEditingBooking(null); 
          }} 
          onBookingSaved={handleBookingSaved} 
        />
      )}
      
      {showReportsModal && (
        <ReportsModal 
          isOpen={showReportsModal}
          onClose={() => setShowReportsModal(false)}
          bookings={bookings}
        />
      )}
    </div>
  );
}