import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
// ИЗМЕНЕНИЕ 1: Импортируем иконку выхода
import { ChevronLeft, ChevronRight, Plus, LogOut } from 'lucide-react';
import BookingGrid from '../components/dashboard/BookingGrid';
import NewBookingModal from '../components/dashboard/NewBookingModal';
import { getBookingsForRange, getRooms, getServices } from '@/components/integrations/Supabase';
import { useAuth } from '@/components/auth/AuthProvider'; // ИЗМЕНЕНИЕ 2: Импортируем useAuth

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
  
  // ИЗМЕНЕНИЕ 3: Получаем функцию signOut из AuthProvider
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // ... (весь ваш остальной код с fetchDataForRange, useEffect, handleBookingSaved и т.д. остается без изменений) ...
  const fetchDataForRange = useCallback(async (startDate, endDate) => {
    setLoading(true);
    setError('');
    try {
      const bookingsResult = await getBookingsForRange(startDate, endDate);
      if (bookingsResult.error) throw bookingsResult.error;
      setBookings(bookingsResult.data || []);
    } catch (err) {
      console.error('Error loading bookings:', err);
      setError(`Ошибка загрузки бронирований: ${err.message}.`);
    } finally {
      setLoading(false);
    }
  }, []);
  
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
        setRooms(roomsResult.data || []);
        setServices(servicesResult.data || []);
      } catch (err) {
        console.error('Error loading static data:', err);
        setError(`Ошибка загрузки комнат или услуг: ${err.message}.`);
      }
    };
    fetchStaticData();
  }, []);

  const handleBookingSaved = () => {
    setShowNewBookingModal(false);
    setSelectedCell(null);
    setEditingBooking(null);
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    fetchDataForRange(monthStart, monthEnd);
  };
  
  const handleCellClick = (roomId, date) => {
    setSelectedCell({ roomId, checkIn: date, checkOut: addMonths(date, 1) });
    setShowNewBookingModal(true);
  };
  const handleBookingClick = (booking) => {
    setEditingBooking(booking);
    setShowNewBookingModal(true);
  };
  const handleSelectionEnd = (roomId, checkIn, checkOut) => {
    setSelectedCell({ roomId, checkIn, checkOut });
    setShowNewBookingModal(true);
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(current => addMonths(current, direction));
  };
  
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });

  if (rooms.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center space-x-2"><Skeleton className="h-10 w-10" /><Skeleton className="h-10 w-32" /><Skeleton className="h-10 w-10" /></div>
        </div>
        <Card className="p-6"><Skeleton className="h-[60vh] w-full" /></Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Booking Calendar</h1>
          <p className="text-slate-600 mt-1">Manage your reservations</p>
        </div>
        <div className="flex items-center space-x-2"> {/* Изменил space-x-4 на space-x-2 */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="min-w-[160px] text-center"><span className="text-lg font-semibold text-slate-800">{format(currentMonth, 'LLLL yyyy', { locale: ru })}</span></div>
            <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Button onClick={() => setShowNewBookingModal(true)}><Plus className="h-4 w-4 mr-2" />New reservation</Button>
          
          {/* V-- ВОТ ВАША НОВАЯ КНОПКА ВЫХОДА --V */}
          <Button variant="outline" size="icon" onClick={handleSignOut} title="Выйти">
            <LogOut className="h-4 w-4 text-slate-600" />
          </Button>
          {/* A------------------------------------A */}

        </div>
      </div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      
      <Card className="booking-grid overflow-hidden">
        <BookingGrid 
          rooms={rooms} 
          bookings={bookings} 
          days={days} 
          onCellClick={handleCellClick} 
          onBookingClick={handleBookingClick} 
          onSelectionEnd={handleSelectionEnd} 
        />
      </Card>
      
      {showNewBookingModal && <NewBookingModal 
        bookingToEdit={editingBooking} 
        selectedCell={selectedCell} 
        allBookings={bookings}
        rooms={rooms} 
        services={services} 
        onClose={() => { setShowNewBookingModal(false); setSelectedCell(null); setEditingBooking(null); }} 
        onBookingSaved={handleBookingSaved} 
      />}
    </div>
  );
}