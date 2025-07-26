import React, { useState, useEffect } from 'react';
import { getBookings, getRooms, getServices } from '@/components/integrations/Supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import NewBookingModal from '../components/dashboard/NewBookingModal';

export default function UnpaidPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [services, setServices] = useState([]);
  
  useEffect(() => { 
    fetchData(); 
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: bookingsData } = await getBookings();
    
    if (bookingsData?.bookings) {
        // Показываем все брони с задолженностью, независимо от статуса
        const unpaid = bookingsData.bookings.filter(b => (b.total_amount || 0) > (b.amount_paid || 0));
        setBookings(unpaid);
    }
    
    const [{data: roomsData}, {data: servicesData}] = await Promise.all([getRooms(), getServices()]);
    setRooms(roomsData?.rooms || []);
    setServices(servicesData?.services || []);
    setLoading(false);
  };

  const handleRowClick = (booking) => { 
    setSelectedBooking(booking); 
    setShowModal(true); 
  };
  
  const handleModalClose = () => { 
    setShowModal(false); 
    setSelectedBooking(null); 
    fetchData(); 
  };

  const totalDebt = bookings.reduce((sum, b) => sum + ((b.total_amount || 0) - (b.amount_paid || 0)), 0);

  const getServicesString = (booking) => {
    if (!booking.booking_services || booking.booking_services.length === 0) return 'Нет';
    return booking.booking_services.map(bs => bs.services?.name).join(', ');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Общая задолженность</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{totalDebt.toLocaleString()} ₽</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle>Количество должников</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{bookings.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileWarning className="mr-2 text-red-500" />
            Список задолженностей
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" /> 
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Гость</TableHead>
                  <TableHead>Номер</TableHead>
                  <TableHead>Заезд/Выезд</TableHead>
                  <TableHead>Услуги</TableHead>
                  <TableHead>Общая сумма</TableHead>
                  <TableHead>Частичная оплата</TableHead>
                  <TableHead>Долг</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                    <TableRow 
                      key={booking.id} 
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <TableCell 
                        className="font-medium text-blue-600 hover:underline cursor-pointer"
                        onClick={() => handleRowClick(booking)}
                      >
                        {booking.guests?.full_name}
                      </TableCell>
                      <TableCell>{booking.rooms?.room_number}</TableCell>
                      <TableCell>
                        {format(parseISO(booking.check_in), 'dd.MM')} - {format(parseISO(booking.check_out), 'dd.MM.yy')}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={getServicesString(booking)}>
                        {getServicesString(booking)}
                      </TableCell>
                      <TableCell>{(booking.total_amount || 0).toLocaleString()} ₽</TableCell>
                      <TableCell className="text-green-600">
                        {(booking.amount_paid || 0).toLocaleString()} ₽
                      </TableCell>
                      <TableCell className="font-bold text-red-600">
                        {((booking.total_amount || 0) - (booking.amount_paid || 0)).toLocaleString()} ₽
                      </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {showModal && (
        <NewBookingModal 
          bookingToEdit={selectedBooking} 
          rooms={rooms} 
          services={services} 
          onClose={handleModalClose} 
          onBookingSaved={handleModalClose}
        />
      )}
    </div>
  );
}