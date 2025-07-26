import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import BookingGrid from '../components/dashboard/BookingGrid';
import NewBookingModal from '../components/dashboard/NewBookingModal';
import { getBookings, getRooms, getServices } from '@/components/integrations/Supabase';

export default function Dashboard() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [services, setServices] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [bookingsResult, roomsResult, servicesResult] = await Promise.all([
        getBookings(), getRooms(), getServices()
      ]);
      if (bookingsResult.error) throw bookingsResult.error;
      if (roomsResult.error) throw roomsResult.error;
      if (servicesResult.error) throw servicesResult.error;
      setBookings(bookingsResult.data || []);
      setRooms(roomsResult.data || []);
      setServices(servicesResult.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(`Ошибка загрузки данных: ${err.message}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingSaved = () => {
    loadData();
    setShowNewBookingModal(false);
    setSelectedCell(null);
    setEditingBooking(null);
  };
  const handleCellClick = (roomId, date) => {
    setSelectedCell({ roomId, checkIn: date, checkOut: new Date(date.getTime() + 86400000) });
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

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  if (loading) {
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
          <h1 className="text-3xl font-bold text-slate-800">Шахматка</h1>
          <p className="text-slate-600 mt-1">Управление бронированиями</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="min-w-[160px] text-center"><span className="text-lg font-semibold text-slate-800">{format(currentDate, 'LLLL yyyy', { locale: ru })}</span></div>
            <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Button onClick={() => setShowNewBookingModal(true)}><Plus className="h-4 w-4 mr-2" />Новое бронирование</Button>
        </div>
      </div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <Card className="booking-grid overflow-hidden"><BookingGrid rooms={rooms} bookings={bookings} days={days} onCellClick={handleCellClick} onBookingClick={handleBookingClick} onSelectionEnd={handleSelectionEnd} /></Card>
      {showNewBookingModal && <NewBookingModal bookingToEdit={editingBooking} selectedCell={selectedCell} rooms={rooms} services={services} onClose={() => { setShowNewBookingModal(false); setSelectedCell(null); setEditingBooking(null); }} onBookingSaved={handleBookingSaved} />}
    </div>
  );
}