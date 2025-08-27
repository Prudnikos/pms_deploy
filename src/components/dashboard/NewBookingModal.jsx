import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, User, PlusCircle, Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { createBooking, updateBooking, updateGuest, addServicesToBooking, removeServiceFromBooking, deleteBooking } from '@/components/integrations/Supabase';
import { groupBy } from 'lodash';
import { useTranslation } from '@/hooks/useTranslation';

export default function NewBookingModal({ bookingToEdit, selectedCell, allBookings, rooms, services, onClose, onBookingSaved }) {
  const { t, currentLanguage, formatCurrency } = useTranslation('booking');
  
  // Источники бронирования и статусы с переводами
  const sources = [
    { value: 'Direct', label: t('sources.direct') },
    { value: 'Booking.com', label: 'Booking.com' },
    { value: 'Airbnb', label: 'Airbnb' },
    { value: 'site', label: t('sources.website') },
    { value: 'ai_agent', label: t('sources.aiAgent') },
    { value: 'phone', label: t('sources.phone') },
    { value: 'other', label: t('sources.other') },
    { value: 'Expedia', label: 'Expedia' },
    { value: 'Open Channel', label: 'Open Channel'}
  ];

  const statuses = [
    { value: 'pending', label: t('status.pending') },
    { value: 'confirmed', label: t('status.confirmed') },
    { value: 'checked_in', label: t('status.checkedIn') },
    { value: 'checked_out', label: t('status.checkedOut') },
    { value: 'cancelled', label: t('status.cancelled') }
  ];

  // --- Состояние компонента ---
  const [formData, setFormData] = useState({});
  const [servicesInCart, setServicesInCart] = useState([]);
  const [currentBookingServices, setCurrentBookingServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Инициализация формы при открытии ---
  useEffect(() => {
    console.log('🚀 Initializing modal with:', { bookingToEdit, selectedCell });
    
    const initialData = bookingToEdit ? {
        ...bookingToEdit,
        room_id: String(bookingToEdit.room_id),
        check_in: format(parseISO(bookingToEdit.check_in), 'yyyy-MM-dd'),
        check_out: format(parseISO(bookingToEdit.check_out), 'yyyy-MM-dd'),
        guest_name: bookingToEdit.guests?.full_name || '',
        guest_phone: bookingToEdit.guests?.phone || '',
        guest_email: bookingToEdit.guests?.email || '',
        guests_count: bookingToEdit.guests_count || bookingToEdit.guest_count || 1,
      } : {
        source: 'direct', 
        status: 'pending', 
        guests_count: 1, 
        amount_paid: 0, 
        notes: '',
        room_id: String(selectedCell?.roomId || (rooms.length > 0 ? rooms[0].id : '')),
        check_in: format(selectedCell?.checkIn || new Date(), 'yyyy-MM-dd'),
        check_out: format(selectedCell?.checkOut || new Date(), 'yyyy-MM-dd'),
        guest_name: '', 
        guest_phone: '', 
        guest_email: ''
      };
    
    setFormData(initialData);
    
    // Инициализируем услуги для существующей брони
    if (bookingToEdit?.booking_services) {
      console.log('📋 Loading existing services:', bookingToEdit.booking_services);
      setCurrentBookingServices(bookingToEdit.booking_services);
    } else {
      setCurrentBookingServices([]);
    }
    
    // Очищаем корзину услуг
    setServicesInCart([]);
    setError('');
  }, [bookingToEdit, selectedCell, rooms]);

  // Дополнительный эффект для обновления услуг при изменении formData
  useEffect(() => {
    if (bookingToEdit && formData.booking_services && 
        JSON.stringify(formData.booking_services) !== JSON.stringify(currentBookingServices)) {
      console.log('🔄 Updating services from formData:', formData.booking_services);
      setCurrentBookingServices(formData.booking_services);
    }
  }, [formData.booking_services, bookingToEdit, currentBookingServices]);

  // --- Вычисляемые значения ---
  const { accommodationTotal, servicesTotal, totalAmount, nights } = useMemo(() => {
    const room = rooms.find(r => r.id === formData.room_id);
    const pricePerNight = room?.price_per_night || 0;
    const checkInDate = formData.check_in ? new Date(formData.check_in) : null;
    const checkOutDate = formData.check_out ? new Date(formData.check_out) : null;
    
    const nights = (checkInDate && checkOutDate && checkOutDate > checkInDate) 
      ? differenceInCalendarDays(checkOutDate, checkInDate) 
      : 0;

    const accommodationTotal = nights * pricePerNight;
    
    // Считаем общую стоимость услуг из корзины и уже заказанных
    const cartServicesTotal = servicesInCart.reduce((sum, s) => sum + (s.price_at_booking || 0) * s.quantity, 0);
    const existingServicesTotal = currentBookingServices.reduce((sum, s) => sum + (s.price_at_booking || 0) * s.quantity, 0);
    const servicesTotal = cartServicesTotal + existingServicesTotal;
    
    const totalAmount = accommodationTotal + servicesTotal;
    
    return { accommodationTotal, servicesTotal, totalAmount, nights };
  }, [formData.check_in, formData.check_out, formData.room_id, servicesInCart, currentBookingServices, rooms]);

  const availableRooms = useMemo(() => {
    if (!formData.check_in || !formData.check_out) return rooms;
    
    const selectedStart = new Date(formData.check_in);
    const selectedEnd = new Date(formData.check_out);
    
    if (selectedEnd <= selectedStart) return rooms;

    const unavailableRoomIds = (allBookings || [])
      .filter(b => {
        if (bookingToEdit && b.id === bookingToEdit.id) return false;
        if (b.status === 'cancelled') return false;
        if (!b.check_in || !b.check_out) return false;

        const existingStart = new Date(b.check_in);
        const existingEnd = new Date(b.check_out);
        return selectedStart < existingEnd && selectedEnd > existingStart;
      })
      .map(b => b.room_id);

    return rooms.filter(r => !unavailableRoomIds.includes(r.id));
  }, [formData.check_in, formData.check_out, allBookings, rooms, bookingToEdit]);
  
  const groupedServices = useMemo(() => groupBy(services, 'category'), [services]);

  // --- Обработчики событий ---
  const handleInputChange = (field, value) => {
    console.log(`📝 Field changed: ${field} = ${value}`);
    setFormData(p => ({ ...p, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.guest_name.trim()) {
        throw new Error(t('errors.guestNameRequired'));
      }

      console.log('💾 Saving booking with data:', formData);

      if (bookingToEdit) {
        // Обновление существующей брони
        const guestUpdates = {
          full_name: formData.guest_name.trim(),
          phone: formData.guest_phone.trim(),
          email: formData.guest_email.trim()
        };
        
        const bookingUpdates = {
          source: formData.source, 
          check_in: formData.check_in, 
          check_out: formData.check_out,
          room_id: formData.room_id, 
          status: formData.status, 
          guests_count: parseInt(formData.guests_count, 10),
          amount_paid: parseFloat(formData.amount_paid) || 0, 
          notes: formData.notes,
          accommodation_total: accommodationTotal, 
          services_total: currentBookingServices.reduce((sum, s) => sum + (s.price_at_booking || 0) * s.quantity, 0), 
          total_amount: accommodationTotal + currentBookingServices.reduce((sum, s) => sum + (s.price_at_booking || 0) * s.quantity, 0)
        };
        
        console.log('🔄 Updating guest:', guestUpdates);
        const { error: guestError } = await updateGuest(bookingToEdit.guest_id, guestUpdates);
        if (guestError) throw guestError;
        
        console.log('🔄 Updating booking:', bookingUpdates);
        const { error: bookingError } = await updateBooking(bookingToEdit.id, bookingUpdates);
        if (bookingError) throw bookingError;
        
      } else {
        // Создание новой брони
        const bookingPayload = {
          guest_details: {
            full_name: formData.guest_name.trim(),
            phone: formData.guest_phone.trim(),
            email: formData.guest_email.trim()
          },
          source: formData.source, 
          check_in: formData.check_in, 
          check_out: formData.check_out,
          room_id: formData.room_id, 
          status: formData.status, 
          guests_count: parseInt(formData.guests_count, 10),
          amount_paid: parseFloat(formData.amount_paid) || 0, 
          notes: formData.notes,
          accommodation_total: accommodationTotal, 
          services_total: 0, // Для новой брони услуг пока нет
          total_amount: accommodationTotal
        };
        
        console.log('🆕 Creating booking:', bookingPayload);
        const result = await createBooking(bookingPayload);
        if (result.error) throw result.error;
      }
      
      console.log('✅ Booking saved successfully');
      onBookingSaved();
    } catch (err) {
      console.error('❌ Error saving booking:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('messages.confirmDelete'))) return;
    setLoading(true);
    setError('');
    try {
      console.log('🗑️ Deleting booking:', bookingToEdit.id);
      const { error: deleteError } = await deleteBooking(bookingToEdit.id);
      if (deleteError) throw deleteError;
      console.log('✅ Booking deleted successfully');
      onBookingSaved();
    } catch (err) {
      console.error('❌ Error deleting booking:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Функции для работы с услугами
  const addServiceToCart = (service) => {
    console.log('🛒 Adding service to cart:', service);
    if (servicesInCart.find(item => item.service_id === service.id)) {
      console.log('⚠️ Service already in cart');
      return;
    }
    
    setServicesInCart(cart => [...cart, { 
      service_id: service.id, 
      name: service.name, 
      quantity: 1, 
      price_at_booking: service.price 
    }]);
  };

  const removeServiceFromCart = (serviceId) => {
    console.log('🗑️ Removing service from cart:', serviceId);
    setServicesInCart(cart => cart.filter(item => item.service_id !== serviceId));
  };

  const handleServiceCartChange = (serviceId, field, value) => {
    console.log(`📝 Cart service changed: ${serviceId}.${field} = ${value}`);
    setServicesInCart(cart => cart.map(item => 
      item.service_id === serviceId ? { ...item, [field]: value } : item
    ));
  };

  const saveServices = async () => {
    if (!bookingToEdit || servicesInCart.length === 0) {
      console.log('⚠️ No booking to edit or empty cart');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log('💾 Adding services to booking:', { bookingId: bookingToEdit.id, services: servicesInCart });
      
      // Вызываем функцию из Supabase
      await addServicesToBooking(bookingToEdit.id, servicesInCart);
      
      console.log('✅ Services added successfully');
      
      // Очищаем корзину
      setServicesInCart([]);
      
      // Обновляем данные через родительский компонент
      onBookingSaved();
      
    } catch (err) {
      console.error('❌ Error adding services:', err);
      setError(err.message || 'Ошибка при добавлении услуг');
    } finally {
      setLoading(false);
    }
  };

  const removeBookedService = async (bookingServiceId) => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🗑️ Removing booked service:', bookingServiceId);
      
      const result = await removeServiceFromBooking(bookingServiceId);
      if (result.error) throw result.error;
      
      console.log('✅ Service removed successfully');
      
      // Обновляем данные через родительский компонент
      onBookingSaved();
      
    } catch (err) {
      console.error('❌ Error removing service:', err);
      setError(err.message || 'Ошибка при удалении услуги');
    } finally {
      setLoading(false);
    }
  };

  const currency = currentLanguage === 'ru' ? 'RUB' : 'USD';

  // --- JSX Разметка ---
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {bookingToEdit 
              ? `${t('editTitle')} №${bookingToEdit.id?.substring(0, 8)}` 
              : t('title')}
          </DialogTitle>
          <DialogDescription>
            {bookingToEdit ? 'Редактирование существующей брони' : 'Создание новой брони'}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="details">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">{t('tabs.details')}</TabsTrigger>
            <TabsTrigger value="services" disabled={!bookingToEdit}>{t('tabs.services')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details">
            <form onSubmit={handleSubmit} className="space-y-6 p-1">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Информация о госте */}
                <div className="md:col-span-1 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <User className="mr-2 h-5 w-5"/>
                        {t('guest.title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>{t('guest.fullName')}</Label>
                        <Input 
                          value={formData.guest_name || ''} 
                          onChange={(e) => handleInputChange('guest_name', e.target.value)} 
                          required
                        />
                      </div>
                      <div>
                        <Label>{t('guest.phone')}</Label>
                        <Input 
                          value={formData.guest_phone || ''} 
                          onChange={(e) => handleInputChange('guest_phone', e.target.value)} 
                        />
                      </div>
                      <div>
                        <Label>{t('guest.email')}</Label>
                        <Input 
                          type="email" 
                          value={formData.guest_email || ''} 
                          onChange={(e) => handleInputChange('guest_email', e.target.value)} 
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Детали бронирования */}
                <div className="md:col-span-1 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <FileText className="mr-2 h-5 w-5"/>
                        {t('details.title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>{t('details.room')}</Label>
                        <Select value={formData.room_id || ''} onValueChange={(v) => handleInputChange('room_id', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('details.selectRoom')} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRooms.map(r => (
                              <SelectItem key={r.id} value={String(r.id)}>
                                {r.room_number} ({r.room_type})
                              </SelectItem>
                            ))}
                            {availableRooms.length === 0 && (
                              <div className="p-2 text-sm text-slate-500">
                                {t('details.noAvailableRooms')}
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{t('details.checkIn')}</Label>
                          <Input 
                            type="date" 
                            value={formData.check_in || ''} 
                            onChange={(e) => handleInputChange('check_in', e.target.value)} 
                          />
                        </div>
                        <div>
                          <Label>{t('details.checkOut')}</Label>
                          <Input 
                            type="date" 
                            value={formData.check_out || ''} 
                            onChange={(e) => handleInputChange('check_out', e.target.value)} 
                          />
                        </div>
                      </div>
                      <div>
                        <Label>{t('details.guestCount')}</Label>
                        <Input 
                          type="number" 
                          min="1" 
                          value={formData.guests_count || 1} 
                          onChange={(e) => handleInputChange('guests_count', e.target.value)} 
                        />
                      </div>
                      <div>
                        <Label>{t('details.status')}</Label>
                        <Select value={formData.status || 'pending'} onValueChange={(v) => handleInputChange('status', v)}>
                          <SelectTrigger><SelectValue/></SelectTrigger>
                          <SelectContent>
                            {statuses.map(s => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t('details.source')}</Label>
                        <Select value={formData.source || 'direct'} onValueChange={(v) => handleInputChange('source', v)}>
                          <SelectTrigger><SelectValue/></SelectTrigger>
                          <SelectContent>
                            {sources.map(s => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t('details.notes')}</Label>
                        <Textarea 
                          value={formData.notes || ''} 
                          onChange={(e) => handleInputChange('notes', e.target.value)} 
                          placeholder={t('details.notesPlaceholder')}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Финансы */}
                <div className="md:col-span-1 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('finance.title')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-lg space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>{t('finance.accommodation', { nights })}</span>
                          <span className="font-medium">{formatCurrency(accommodationTotal, currency)}</span>
                        </div>
                        
                        <div className="font-medium mt-2">{t('finance.orderedServices')}</div>
                        
                        {/* Существующие услуги */}
                        {currentBookingServices.length > 0 ? (
                          currentBookingServices.map(bs => (
                            <div key={bs.id} className="flex justify-between pl-2">
                              <span>{bs.services?.name || bs.name} x {bs.quantity}</span>
                              <span>{formatCurrency(bs.price_at_booking * bs.quantity, currency)}</span>
                            </div>
                          ))
                        ) : null}
                        
                        {/* Услуги в корзине */}
                        {servicesInCart.length > 0 && (
                          <>
                            <div className="text-xs text-blue-600 font-medium mt-2">В корзине:</div>
                            {servicesInCart.map(item => (
                              <div key={item.service_id} className="flex justify-between pl-2 text-blue-600">
                                <span>{item.name} x {item.quantity}</span>
                                <span>{formatCurrency(item.price_at_booking * item.quantity, currency)}</span>
                              </div>
                            ))}
                          </>
                        )}
                        
                        {(currentBookingServices.length === 0 && servicesInCart.length === 0) && (
                          <p className="text-slate-500 pl-2">{t('finance.noServices')}</p>
                        )}
                        
                        <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                          <span>{t('finance.total')}</span>
                          <span>{formatCurrency(totalAmount, currency)}</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label>{t('finance.paid')}</Label>
                        <Input 
                          type="number" 
                          value={formData.amount_paid || 0} 
                          onChange={(e) => handleInputChange('amount_paid', e.target.value)} 
                          placeholder="0"
                        />
                      </div>
                      
                      <div className="p-4 bg-red-50 rounded-lg text-red-800">
                        <div className="flex justify-between font-bold text-lg">
                          <span>{t('finance.balance')}</span>
                          <span>{formatCurrency(totalAmount - (formData.amount_paid || 0), currency)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              <DialogFooter>
                {bookingToEdit && (
                  <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading} className="mr-auto">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('actions.delete')}
                  </Button>
                )}
                <Button type="button" variant="ghost" onClick={onClose}>
                  {t('actions.cancel')}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? t('actions.saving') : t('actions.save')}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          
          <TabsContent value="services">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('services.available')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  <Accordion type="multiple" defaultValue={Object.keys(groupedServices)}>
                    {Object.entries(groupedServices).map(([category, srvs]) => (
                      <AccordionItem value={category} key={category}>
                        <AccordionTrigger>{category}</AccordionTrigger>
                        <AccordionContent>
                          {srvs.map(service => (
                            <div key={service.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                              <div>
                                <p className="font-medium">{service.name}</p>
                                <p className="text-sm text-slate-500">{formatCurrency(service.price, currency)}</p>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => addServiceToCart(service)} 
                                disabled={loading || servicesInCart.find(item => item.service_id === service.id)}
                              >
                                <PlusCircle className="h-4 w-4 mr-2"/>
                                {t('services.addToCart')}
                              </Button>
                            </div>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>{t('services.cart')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {servicesInCart.length > 0 ? (
                    servicesInCart.map(item => (
                      <div key={item.service_id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Input 
                              type="number" 
                              min="1"
                              value={item.quantity} 
                              onChange={(e) => handleServiceCartChange(item.service_id, 'quantity', parseInt(e.target.value) || 1)} 
                              className="w-16 h-8"
                            />
                            <Input 
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price_at_booking} 
                              onChange={(e) => handleServiceCartChange(item.service_id, 'price_at_booking', parseFloat(e.target.value) || 0)} 
                              className="w-24 h-8"
                            />
                          </div>
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-red-500" 
                          onClick={() => removeServiceFromCart(item.service_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-center py-4">{t('services.cartEmpty')}</p>
                  )}
                  
                  {servicesInCart.length > 0 && (
                    <Button onClick={saveServices} disabled={loading} className="w-full mt-4">
                      {loading ? t('actions.saving') : t('services.addSelected')}
                    </Button>
                  )}
                </CardContent>
                
                <CardHeader>
                  <CardTitle>{t('services.ordered')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {currentBookingServices.length > 0 ? (
                    currentBookingServices.map(bs => (
                      <div key={bs.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div>
                          <p>{bs.services?.name || bs.name} x {bs.quantity}</p>
                          <p className="text-sm text-slate-500">
                            {formatCurrency(bs.price_at_booking * bs.quantity, currency)}
                          </p>
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-red-500" 
                          onClick={() => removeBookedService(bs.id)} 
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                  ))) : (
                    <p className="text-slate-500 text-center py-4">{t('services.noOrdered')}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}