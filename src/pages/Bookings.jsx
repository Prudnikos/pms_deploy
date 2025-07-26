import React, { useState, useEffect } from 'react';
import { getBookings, getRooms, getServices } from '@/components/integrations/Supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import NewBookingModal from '../components/dashboard/NewBookingModal';

const statusColors = { 
  'confirmed': 'bg-green-100 text-green-800', 
  'pending': 'bg-yellow-100 text-yellow-800', 
  'cancelled': 'bg-red-100 text-red-800', 
  'checked_in': 'bg-purple-100 text-purple-800', 
  'checked_out': 'bg-blue-100 text-blue-800' 
};

const statusLabels = { 
  'confirmed': 'Подтверждено', 
  'pending': 'Не подтверждено', 
  'cancelled': 'Отменено',
  'checked_in': 'Проживание', 
  'checked_out': 'Выезд' 
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [services, setServices] = useState([]);

  useEffect(() => { 
    fetchData(); 
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: bookingsData }, { data: roomsData }, { data: servicesData }] = await Promise.all([ 
      getBookings(), 
      getRooms(), 
      getServices() 
    ]);
    setBookings(bookingsData?.bookings || []);
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

  const filteredBookings = bookings.filter(b => 
    (b.guests?.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) && 
    (filterStatus === 'all' || b.status === filterStatus)
  );

  const calculateAccommodation = (booking) => {
    return (booking.total_amount || 0) - (booking.services_total || 0);
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Поиск по имени гостя..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-10"
              />
            </div>
            
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Все статусы</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Бронирования ({filteredBookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Гость</TableHead>
                <TableHead>Номер</TableHead>
                <TableHead>Даты</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Проживание</TableHead>
                <TableHead>Услуги</TableHead>
                <TableHead>Оплата</TableHead>
                <TableHead>К Оплате</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan="8"><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : (
                filteredBookings.map((booking) => {
                  const accommodation = calculateAccommodation(booking);
                  const toPay = (booking.total_amount || 0) - (booking.amount_paid || 0);
                  
                  return (
                    <TableRow 
                      key={booking.id} 
                      onClick={() => handleRowClick(booking)} 
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <TableCell className="font-medium">{booking.guests?.full_name}</TableCell>
                      <TableCell>{booking.rooms?.room_number}</TableCell>
                      <TableCell>
                        {format(parseISO(booking.check_in), 'dd.MM')} - {format(parseISO(booking.check_out), 'dd.MM.yy')}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[booking.status]}>
                          {statusLabels[booking.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{accommodation.toLocaleString()} ₽</TableCell>
                      <TableCell>{(booking.services_total || 0).toLocaleString()} ₽</TableCell>
                      <TableCell className="text-green-600">
                        {(booking.amount_paid || 0).toLocaleString()} ₽
                      </TableCell>
                      <TableCell className={`font-bold ${toPay > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {toPay.toLocaleString()} ₽
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
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