import React, { useState, useEffect } from 'react';
import { getBookings, getRooms, getServices } from '@/components/integrations/Supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import NewBookingModal from '../components/dashboard/NewBookingModal';
import SourceIcon from '@/components/SourceIcon';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [services, setServices] = useState([]);
  
  const { t, currentLanguage, formatCurrency } = useTranslation('bookings');
  const dateLocale = currentLanguage === 'ru' ? ru : enUS;

  // Status colors remain the same
  const statusColors = { 
    'confirmed': 'bg-green-100 text-green-800', 
    'pending': 'bg-yellow-100 text-yellow-800', 
    'cancelled': 'bg-red-100 text-red-800', 
    'checked_in': 'bg-purple-100 text-purple-800', 
    'checked_out': 'bg-blue-100 text-blue-800' 
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const handleNewBookingClick = () => {
    setSelectedBooking(null);
    setShowModal(true);
  };

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
                placeholder={t('search.placeholder')}
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
              <option value="all">{t('filter.allStatuses')}</option>
              {Object.entries(['confirmed', 'pending', 'cancelled', 'checked_in', 'checked_out']).map(([_, status]) => (
                <option key={status} value={status}>
                  {t(`status.${status}`)}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {t('title')} ({filteredBookings.length})
          </CardTitle>
          <Button 
            onClick={handleNewBookingClick}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('actions.newBooking')}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.guest')}</TableHead>
                <TableHead>{t('table.source')}</TableHead>
                <TableHead>{t('table.room')}</TableHead>
                <TableHead>{t('table.dates')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead>{t('table.accommodation')}</TableHead>
                <TableHead>{t('table.services')}</TableHead>
                <TableHead>{t('table.paid')}</TableHead>
                <TableHead>{t('table.balance')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan="9">
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="9" className="text-center text-slate-500 py-8">
                    {t('table.noResults')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((booking) => {
                  const accommodation = calculateAccommodation(booking);
                  const toPay = (booking.total_amount || 0) - (booking.amount_paid || 0);
                  const currency = currentLanguage === 'ru' ? 'RUB' : 'USD';
                  
                  return (
                    <TableRow 
                      key={booking.id} 
                      onClick={() => handleRowClick(booking)} 
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <TableCell className="font-medium">
                        {booking.guests?.full_name || t('table.unknownGuest')}
                      </TableCell>
                      <TableCell>
                        <SourceIcon source={booking.source} />
                      </TableCell>
                      <TableCell>{booking.rooms?.room_number}</TableCell>
                      <TableCell>
                        {format(parseISO(booking.check_in), 'dd.MM', { locale: dateLocale })} - 
                        {format(parseISO(booking.check_out), 'dd.MM.yy', { locale: dateLocale })}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[booking.status]}>
                          {t(`status.${booking.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(accommodation, currency)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(booking.services_total || 0, currency)}
                      </TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(booking.amount_paid || 0, currency)}
                      </TableCell>
                      <TableCell className={`font-bold ${toPay > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(toPay, currency)}
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
          allBookings={bookings}
          rooms={rooms} 
          services={services} 
          onClose={handleModalClose} 
          onBookingSaved={handleModalClose}
        />
      )}
    </div>
  );
}