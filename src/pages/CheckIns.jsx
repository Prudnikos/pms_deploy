import React, { useState, useEffect } from 'react';
import { getBookings, updateBooking } from '@/components/integrations/Supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LogIn, Clock, User, Bed, Phone } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function CheckInsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    fetchTodayCheckIns(); 
  }, []);

  const fetchTodayCheckIns = async () => {
    setLoading(true);
    const { data } = await getBookings();
    const todayCheckIns = (data?.bookings || []).filter(booking => 
      isToday(parseISO(booking.check_in)) && booking.status === 'confirmed'
    );
    setBookings(todayCheckIns);
    setLoading(false);
  };

  const handleCheckIn = async (bookingId) => {
    await updateBooking(bookingId, { status: 'checked_in' }); // Проживание
    fetchTodayCheckIns(); // Refresh the list
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Заезды на сегодня</h1>
          <p className="text-slate-600 mt-1">{format(new Date(), 'dd MMMM yyyy', { locale: ru })}</p>
        </div>
        <div className="flex items-center space-x-2 text-2xl font-bold text-blue-600">
          <LogIn className="h-8 w-8" />
          <span>{bookings.length}</span>
        </div>
      </div>
      
      {loading ? ( 
        <Skeleton className="h-96 w-full" /> 
      ) : bookings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{booking.guests?.full_name}</CardTitle>
                  <Badge className={'bg-green-100 text-green-800'}>Подтверждено</Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3 text-slate-600">
                  <Bed className="h-5 w-5" />
                  <p>{booking.rooms?.room_number} ({booking.rooms?.room_type})</p>
                </div>
                
                <div className="flex items-center space-x-3 text-slate-600">
                  <Phone className="h-5 w-5" />
                  <p>{booking.guests?.phone || 'Не указан'}</p>
                </div>
                
                <div className="flex items-center space-x-3 text-slate-600">
                  <User className="h-5 w-5" />
                  <p>{booking.guests_count} гостя(ей)</p>
                </div>
                
                <div className="pt-4">
                  <Button 
                    onClick={() => handleCheckIn(booking.id)} 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Заселить гостя
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <LogIn className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-600 mb-2">Нет заездов на сегодня</h3>
          </CardContent>
        </Card>
      )}
    </div>
  );
}