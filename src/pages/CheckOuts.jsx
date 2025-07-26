import React, { useState, useEffect } from 'react';
import { getBookings, updateBooking } from '@/components/integrations/Supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut, Clock, User, Bed, Phone, CreditCard } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function CheckOutsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayCheckOuts();
  }, []);

  const fetchTodayCheckOuts = async () => {
    setLoading(true);
    try {
      const { data } = await getBookings();
      
      console.log('Полученные данные в CheckOuts:', data);
      
      // Правильная обработка данных - извлекаем массив bookings
      const bookingsArray = data?.bookings || data || [];
      
      // Фильтруем выезды на сегодня
      const todayCheckOuts = Array.isArray(bookingsArray) 
        ? bookingsArray.filter(booking => 
            isToday(parseISO(booking.check_out)) && 
            booking.status === 'checked_in'
          )
        : [];
      
      console.log('Выезды на сегодня:', todayCheckOuts);
      setBookings(todayCheckOuts);
    } catch (error) {
      console.error('Ошибка получения данных:', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (bookingId) => {
    try {
      await updateBooking(bookingId, { status: 'checked_out' });
      fetchTodayCheckOuts(); // Refresh the list
    } catch (error) {
      console.error('Ошибка при выселении:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <style>{`
        .checkout-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(226,232,240,0.6);
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
        }
        .checkout-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.12);
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Выезды на сегодня</h1>
          <p className="text-slate-600 mt-1">{format(new Date(), 'dd MMMM yyyy', { locale: ru })}</p>
        </div>
        <div className="flex items-center space-x-2 text-2xl font-bold text-orange-600">
          <LogOut className="h-8 w-8" />
          <span>{bookings.length}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="checkout-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Всего выездов</p>
                <p className="text-2xl font-bold text-slate-900">{bookings.length}</p>
              </div>
              <LogOut className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="checkout-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Заселены</p>
                <p className="text-2xl font-bold text-blue-600">
                  {bookings.filter(b => b.status === 'checked_in').length}
                </p>
              </div>
              <User className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="checkout-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Общий доход</p>
                <p className="text-2xl font-bold text-green-600">
                  {bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0).toLocaleString()} ₽
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Check-outs List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="checkout-card">
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : bookings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.map((booking) => (
            <Card key={booking.id} className="checkout-card">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    {booking.guests?.full_name || 'Гость'}
                  </CardTitle>
                  <Badge className={'bg-blue-100 text-blue-800'}>
                    Заселен
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3 text-slate-600">
                  <Bed className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{booking.rooms?.room_number}</p>
                    <p className="text-sm">{booking.rooms?.room_type}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-slate-600">
                  <Phone className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{booking.guests?.phone || 'Не указан'}</p>
                    <p className="text-sm">Контактный телефон</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-slate-600">
                  <User className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{booking.guests_count} гост{booking.guests_count === 1 ? 'ь' : 'ей'}</p>
                    <p className="text-sm">Количество гостей</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-slate-600">
                  <Clock className="h-5 w-5" />
                  <div>
                    <p className="font-medium">
                      {format(parseISO(booking.check_in), 'dd MMM yyyy', { locale: ru })}
                    </p>
                    <p className="text-sm">Дата заезда</p>
                  </div>
                </div>

                {booking.notes && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-sm text-slate-600">{booking.notes}</p>
                  </div>
                )}

                <div className="pt-4 space-y-2">
                  <Button 
                    onClick={() => handleCheckOut(booking.id)}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Выселить гостя
                  </Button>
                  <Button variant="outline" className="w-full">
                    Связаться с гостем
                  </Button>
                </div>

                {booking.total_amount && (
                  <div className="text-center pt-2 border-t">
                    <p className="text-lg font-bold text-slate-800">
                      {booking.total_amount.toLocaleString()} ₽
                    </p>
                    <p className="text-sm text-slate-500">Оплачено</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="checkout-card">
          <CardContent className="p-12 text-center">
            <LogOut className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-600 mb-2">Нет выездов на сегодня</h3>
            <p className="text-slate-500">Все спокойно! Выездов на сегодня не запланировано.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}