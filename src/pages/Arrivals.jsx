import React, { useState, useEffect } from 'react';
import { format, isToday, parseISO, startOfDay } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, User, Phone, Mail, MapPin, Search, Filter, LogIn, CheckCircle } from 'lucide-react';
import { getBookingsForRange } from '@/components/integrations/Supabase';
import { useTranslation } from '@/hooks/useTranslation';
import NewBookingModal from '@/components/dashboard/NewBookingModal';

const statusColors = {
  'confirmed': 'bg-emerald-100 text-emerald-800',
  'pending': 'bg-amber-100 text-amber-800',
  'cancelled': 'bg-rose-100 text-rose-800',
  'checked_in': 'bg-violet-100 text-violet-800',
  'checked_out': 'bg-sky-100 text-sky-800'
};

export default function Arrivals() {
  const { t, currentLanguage, formatCurrency } = useTranslation('booking');
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [editingBooking, setEditingBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const dateLocale = currentLanguage === 'ru' ? ru : enUS;
  const currency = currentLanguage === 'ru' ? 'RUB' : 'USD';

  // Загрузка данных
  useEffect(() => {
    fetchArrivals();
  }, [selectedDate]);

  // Фильтрация по поиску
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredBookings(bookings);
    } else {
      const filtered = bookings.filter(booking => {
        const guestName = booking.guests?.full_name?.toLowerCase() || '';
        const roomNumber = booking.rooms?.room_number?.toLowerCase() || '';
        const phone = booking.guests?.phone?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        
        return guestName.includes(search) || 
               roomNumber.includes(search) || 
               phone.includes(search);
      });
      setFilteredBookings(filtered);
    }
  }, [searchTerm, bookings]);

  const fetchArrivals = async () => {
    setLoading(true);
    try {
      const startDate = new Date(selectedDate);
      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + 1);

      const result = await getBookingsForRange(startDate, endDate);
      if (result.error) throw result.error;

      // Фильтруем только заезды на выбранную дату
      const arrivals = (result.data || []).filter(booking => {
        if (booking.status === 'cancelled') return false;
        const checkIn = format(parseISO(booking.check_in), 'yyyy-MM-dd');
        return checkIn === selectedDate;
      });

      console.log('📅 Arrivals for', selectedDate, ':', arrivals);
      setBookings(arrivals);
    } catch (error) {
      console.error('Error loading arrivals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (booking) => {
    // Здесь будет логика отметки заезда
    console.log('✅ Check-in:', booking.guests?.full_name);
    // TODO: Обновить статус брони на 'checked_in'
  };

  const handleBookingClick = (booking) => {
    setEditingBooking(booking);
    setShowModal(true);
  };

  const handleBookingSaved = () => {
    setShowModal(false);
    setEditingBooking(null);
    fetchArrivals();
  };

  const renderBookingCard = (booking) => {
    return (
      <Card 
        key={booking.id} 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleBookingClick(booking)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <LogIn className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-slate-800">
                  {booking.guests?.full_name || 'Неизвестный гость'}
                </h3>
                <p className="text-sm text-slate-500">
                  Заезд: {format(parseISO(booking.check_in), 'HH:mm')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[booking.status] || 'bg-slate-100 text-slate-800'}>
                {t(`status.${booking.status}`)}
              </Badge>
              {booking.status === 'confirmed' && (
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCheckIn(booking);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Отметить заезд
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="h-3 w-3" />
                <span>Номер {booking.rooms?.room_number || 'N/A'} ({booking.rooms?.room_type || 'N/A'})</span>
              </div>
              
              <div className="flex items-center gap-2 text-slate-600">
                <User className="h-3 w-3" />
                <span>{booking.guests_count || 1} {(booking.guests_count || 1) === 1 ? 'гость' : 'гостя'}</span>
              </div>
            </div>

            <div className="space-y-2">
              {booking.guests?.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-3 w-3" />
                  <span>{booking.guests.phone}</span>
                </div>
              )}
              
              {booking.guests?.email && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{booking.guests.email}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Период:</span>
              <span className="font-medium text-slate-800">
                {format(parseISO(booking.check_in), 'dd MMM', { locale: dateLocale })} - 
                {format(parseISO(booking.check_out), 'dd MMM', { locale: dateLocale })}
              </span>
            </div>
            {booking.total_amount && (
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-slate-600">Сумма:</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(booking.total_amount, currency)}
                </span>
              </div>
            )}
          </div>

          {booking.notes && (
            <div className="mt-3 p-2 bg-slate-50 rounded text-sm text-slate-600">
              <strong>Комментарий:</strong> {booking.notes}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Заезды</h1>
          <p className="text-slate-600 mt-1">
            Управление заездами гостей
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-base px-3 py-1">
            Всего: {filteredBookings.length}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Поиск по имени, номеру или телефону..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-48">
              <Input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-slate-600">Загрузка заездов...</p>
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBookings.map(renderBookingCard)}
        </div>
      ) : (
        <Card className="p-8">
          <div className="text-center text-slate-500">
            <LogIn className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold mb-2">Нет заездов</h3>
            <p>На {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: dateLocale })} заездов нет</p>
          </div>
        </Card>
      )}

      {/* Modal */}
      {showModal && (
        <NewBookingModal 
          bookingToEdit={editingBooking}
          rooms={[]} // Передадите актуальные данные
          services={[]} // Передадите актуальные данные
          allBookings={bookings}
          onClose={() => {
            setShowModal(false);
            setEditingBooking(null);
          }}
          onBookingSaved={handleBookingSaved}
        />
      )}
    </div>
  );
}