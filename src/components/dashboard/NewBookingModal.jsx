import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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

// Константы вынесены за пределы компонента
const sources = [
  { value: 'direct', label: 'Напрямую' },
  { value: 'booking', label: 'Booking.com' },
  { value: 'airbnb', label: 'AirBnB' }, // <-- Добавлено
  { value: 'site', label: 'Сайт' },       // <-- Добавлено
  { value: 'ai_agent', label: 'AI-agent' }, // <-- Добавлено
  { value: 'phone', label: 'Телефон' },
  { value: 'other', label: 'Другое' }
];

const statuses = [
  { value: 'pending', label: 'Не подтверждено' },
  { value: 'confirmed', label: 'Подтверждено' },
  { value: 'checked_in', label: 'Проживание' },
  { value: 'checked_out', label: 'Выезд' },
  { value: 'cancelled', label: 'Отменено' }
];

export default function NewBookingModal({ bookingToEdit, selectedCell, allBookings, rooms, services, onClose, onBookingSaved }) {
  // --- Состояние компонента ---
  const [formData, setFormData] = useState({});
  const [servicesInCart, setServicesInCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Инициализация формы при открытии ---
  useEffect(() => {
    const initialData = bookingToEdit ? {
        ...bookingToEdit,
        room_id: String(bookingToEdit.room_id),
        check_in: format(parseISO(bookingToEdit.check_in), 'yyyy-MM-dd'),
        check_out: format(parseISO(bookingToEdit.check_out), 'yyyy-MM-dd'),
        guest_name: bookingToEdit.guests?.full_name || '',
        guest_phone: bookingToEdit.guests?.phone || '',
        guest_email: bookingToEdit.guests?.email || '',
      } : {
        source: 'direct', status: 'pending', guests_count: 1, amount_paid: 0, notes: '',
        room_id: String(selectedCell?.roomId || (rooms.length > 0 ? rooms[0].id : '')),
        check_in: format(selectedCell?.checkIn || new Date(), 'yyyy-MM-dd'),
        check_out: format(selectedCell?.checkOut || new Date(), 'yyyy-MM-dd'),
        guest_name: '', guest_phone: '', guest_email: '', booking_services: []
      };
    setFormData(initialData);
  }, [bookingToEdit, selectedCell, rooms]);

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
    const servicesTotal = formData.booking_services?.reduce((sum, s) => sum + (s.price_at_booking || 0) * s.quantity, 0) || 0;
    const totalAmount = accommodationTotal + servicesTotal;
    return { accommodationTotal, servicesTotal, totalAmount, nights };
  }, [formData.check_in, formData.check_out, formData.room_id, formData.booking_services, rooms]);

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
  const handleInputChange = (field, value) => setFormData(p => ({ ...p, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.guest_name.trim()) throw new Error('Необходимо указать имя гостя');

      if (bookingToEdit) {
        const guestUpdates = {
          full_name: formData.guest_name.trim(),
          phone: formData.guest_phone.trim(),
          email: formData.guest_email.trim()
        };
        const bookingUpdates = {
          source: formData.source, check_in: formData.check_in, check_out: formData.check_out,
          room_id: formData.room_id, status: formData.status, guests_count: parseInt(formData.guests_count, 10),
          amount_paid: parseFloat(formData.amount_paid) || 0, notes: formData.notes,
          accommodation_total: accommodationTotal, services_total: servicesTotal, total_amount: totalAmount
        };
        const { error: guestError } = await updateGuest(bookingToEdit.guest_id, guestUpdates);
        if (guestError) throw guestError;
        const { error: bookingError } = await updateBooking(bookingToEdit.id, bookingUpdates);
        if (bookingError) throw bookingError;
      } else {
        const bookingPayload = {
          guest_details: {
            full_name: formData.guest_name.trim(),
            phone: formData.guest_phone.trim(),
            email: formData.guest_email.trim()
          },
          source: formData.source, check_in: formData.check_in, check_out: formData.check_out,
          room_id: formData.room_id, status: formData.status, guests_count: parseInt(formData.guests_count, 10),
          amount_paid: parseFloat(formData.amount_paid) || 0, notes: formData.notes,
          accommodation_total: accommodationTotal, services_total: servicesTotal, total_amount: totalAmount
        };
        await createBooking(bookingPayload);
      }
      onBookingSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить это бронирование? Это действие нельзя отменить.')) return;
    setLoading(true);
    setError('');
    try {
      const { error: deleteError } = await deleteBooking(bookingToEdit.id);
      if (deleteError) throw deleteError;
      onBookingSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Функции для работы с услугами
  const addServiceToCart = (service) => {
    if (servicesInCart.find(item => item.service_id === service.id)) return;
    setServicesInCart(cart => [...cart, { 
      service_id: service.id, name: service.name, quantity: 1, price_at_booking: service.price 
    }]);
  };
  const removeServiceFromCart = (serviceId) => setServicesInCart(cart => cart.filter(item => item.service_id !== serviceId));
  const handleServiceCartChange = (serviceId, field, value) => {
    setServicesInCart(cart => cart.map(item => 
      item.service_id === serviceId ? { ...item, [field]: value } : item
    ));
  };
  const saveServices = async () => {
    if (!bookingToEdit || servicesInCart.length === 0) return;
    setLoading(true);
    try {
        await addServicesToBooking(bookingToEdit.id, servicesInCart);
        setServicesInCart([]);
        onBookingSaved();
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  const removeBookedService = async (bookingServiceId) => {
    setLoading(true);
    try {
        await removeServiceFromBooking(bookingServiceId);
        onBookingSaved();
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  // --- JSX Разметка ---
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {bookingToEdit ? `Редактирование брони №${bookingToEdit.id?.substring(0, 8)}` : 'New reservation'}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="details">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Детали и Финансы</TabsTrigger>
            <TabsTrigger value="services" disabled={!bookingToEdit}>Услуги</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details">
            <form onSubmit={handleSubmit} className="space-y-6 p-1">
              {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Информация о госте */}
                <div className="md:col-span-1 space-y-4">
                  <Card>
                    <CardHeader><CardTitle className="flex items-center"><User className="mr-2 h-5 w-5"/>Информация о госте</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div><Label>ФИО</Label><Input value={formData.guest_name || ''} onChange={(e) => handleInputChange('guest_name', e.target.value)} /></div>
                      <div><Label>Телефон</Label><Input value={formData.guest_phone || ''} onChange={(e) => handleInputChange('guest_phone', e.target.value)} /></div>
                      <div><Label>Email</Label><Input type="email" value={formData.guest_email || ''} onChange={(e) => handleInputChange('guest_email', e.target.value)} /></div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Детали бронирования */}
                <div className="md:col-span-1 space-y-4">
                  <Card>
                    <CardHeader><CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5"/>Детали бронирования</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Номер</Label>
                        <Select value={formData.room_id || ''} onValueChange={(v) => handleInputChange('room_id', v)}>
                          <SelectTrigger><SelectValue placeholder="Выберите номер..." /></SelectTrigger>
                          <SelectContent>
                            {availableRooms.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.room_number} ({r.room_type})</SelectItem>)}
                            {availableRooms.length === 0 && <div className="p-2 text-sm text-slate-500">Свободных номеров на эти даты нет.</div>}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>Заезд</Label><Input type="date" value={formData.check_in || ''} onChange={(e) => handleInputChange('check_in', e.target.value)} /></div>
                        <div><Label>Выезд</Label><Input type="date" value={formData.check_out || ''} onChange={(e) => handleInputChange('check_out', e.target.value)} /></div>
                      </div>
                      <div><Label>Кол-во гостей</Label><Input type="number" min="1" value={formData.guests_count || 1} onChange={(e) => handleInputChange('guests_count', e.target.value)} /></div>
                      <div><Label>Статус</Label><Select value={formData.status || 'pending'} onValueChange={(v) => handleInputChange('status', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label>Источник</Label><Select value={formData.source || 'direct'} onValueChange={(v) => handleInputChange('source', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{sources.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label>Комментарий</Label><Textarea value={formData.notes || ''} onChange={(e) => handleInputChange('notes', e.target.value)} placeholder="Комментарий..."/></div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Финансы */}
                <div className="md:col-span-1 space-y-4">
                  <Card>
                    <CardHeader><CardTitle>Финансы</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-lg space-y-2 text-sm">
                        <div className="flex justify-between"><span>Проживание ({nights} дн.):</span><span className="font-medium">{accommodationTotal.toLocaleString()} ₽</span></div>
                        <div className="font-medium mt-2">Заказанные услуги:</div>
                        {formData.booking_services?.length > 0 ? (
                          formData.booking_services.map(bs => (
                            <div key={bs.id} className="flex justify-between pl-2"><span>{bs.services.name} x {bs.quantity}</span><span>{(bs.price_at_booking * bs.quantity).toLocaleString()} ₽</span></div>
                          ))
                        ) : (<p className="text-slate-500 pl-2">Нет</p>)}
                        <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2"><span>Итого:</span> <span>{totalAmount.toLocaleString()} ₽</span></div>
                      </div>
                      <div><Label>Оплачено</Label><Input type="number" value={formData.amount_paid || 0} onChange={(e) => handleInputChange('amount_paid', e.target.value)} placeholder="0 ₽"/></div>
                      <div className="p-4 bg-red-50 rounded-lg text-red-800">
                        <div className="flex justify-between font-bold text-lg"><span>К оплате:</span><span>{(totalAmount - (formData.amount_paid || 0)).toLocaleString()} ₽</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              <DialogFooter>
                {bookingToEdit && (<Button type="button" variant="destructive" onClick={handleDelete} disabled={loading} className="mr-auto"><Trash2 className="h-4 w-4 mr-2" />Удалить бронь</Button>)}
                <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Сохранение...' : 'Сохранить'}</Button>
              </DialogFooter>
            </form>
          </TabsContent>
          
          <TabsContent value="services">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle>Доступные услуги</CardTitle></CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  <Accordion type="multiple" defaultValue={Object.keys(groupedServices)}>
                    {Object.entries(groupedServices).map(([category, srvs]) => (
                      <AccordionItem value={category} key={category}><AccordionTrigger>{category}</AccordionTrigger><AccordionContent>
                          {srvs.map(service => (
                            <div key={service.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                              <div><p className="font-medium">{service.name}</p><p className="text-sm text-slate-500">{service.price} ₽</p></div>
                              <Button size="sm" variant="outline" onClick={() => addServiceToCart(service)} disabled={loading || servicesInCart.find(item => item.service_id === service.id)}><PlusCircle className="h-4 w-4 mr-2"/>В корзину</Button>
                            </div>
                          ))}
                      </AccordionContent></AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader><CardTitle>Корзина услуг</CardTitle></CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {servicesInCart.length > 0 ? (
                    servicesInCart.map(item => (
                      <div key={item.service_id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div><p className="font-medium">{item.name}</p><div className="flex items-center gap-2 mt-1"><Input type="number" value={item.quantity} onChange={(e) => handleServiceCartChange(item.service_id, 'quantity', parseInt(e.target.value))} className="w-16 h-8"/><Input value={item.price_at_booking} onChange={(e) => handleServiceCartChange(item.service_id, 'price_at_booking', parseFloat(e.target.value))} className="w-24 h-8"/></div></div>
                        <Button size="icon" variant="ghost" className="text-red-500" onClick={() => removeServiceFromCart(item.service_id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))
                  ) : (<p className="text-slate-500 text-center py-4">Корзина пуста.</p>)}
                  {servicesInCart.length > 0 && (<Button onClick={saveServices} disabled={loading} className="w-full mt-4">Добавить выбранные услуги</Button>)}
                </CardContent>
                <CardHeader><CardTitle>Заказанные услуги</CardTitle></CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {formData.booking_services?.length > 0 ? (
                    formData.booking_services.map(bs => (
                      <div key={bs.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div><p>{bs.services.name} x {bs.quantity}</p><p className="text-sm text-slate-500">{(bs.price_at_booking * bs.quantity).toLocaleString()} ₽</p></div>
                        <Button size="icon" variant="ghost" className="text-red-500" onClick={() => removeBookedService(bs.id)} disabled={loading}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                  ))) : (<p className="text-slate-500 text-center py-4">Услуги не добавлены.</p>)}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}