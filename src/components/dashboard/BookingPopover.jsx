import React from 'react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, MessageCircle } from 'lucide-react';

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

export default function BookingPopover({ booking, position, onClose }) {
  if (!booking) return null;

  const accommodationTotal = booking.total_amount - (booking.services_total || 0);

  return (
    <div 
      className="fixed z-50 pointer-events-none" 
      style={{ 
        left: position.x + 10, 
        top: position.y - 10, 
        transform: 'translateY(-100%)' 
      }}
    >
      <Card className="w-80 shadow-xl border-0 bg-white/95 backdrop-blur-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-800">
              {booking.guests?.full_name || 'Гость'}
            </CardTitle>
            <Badge className={statusColors[booking.status]}>
              {statusLabels[booking.status]}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <Calendar className="h-4 w-4" />
            <span>
              {format(parseISO(booking.check_in), 'dd MMMM', { locale: ru })} - {format(parseISO(booking.check_out), 'dd MMMM', { locale: ru })}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <User className="h-4 w-4" />
            <span>{booking.guests_count || 1} гост{booking.guests_count === 1 ? 'ь' : 'ей'}</span>
          </div>

          {/* Комментарий к брони */}
          {booking.notes && (
            <div className="flex items-start space-x-2 text-sm text-slate-600">
              <MessageCircle className="h-4 w-4 mt-0.5" />
              <div>
                <p className="font-medium">Комментарий:</p>
                <p className="text-slate-500">{booking.notes}</p>
              </div>
            </div>
          )}

          {/* Список заказанных услуг */}
          {booking.booking_services && booking.booking_services.length > 0 && (
            <div className="text-sm">
              <p className="font-medium text-slate-700 mb-1">Заказанные услуги:</p>
              <div className="space-y-1">
                {booking.booking_services.map((bs) => (
                  <div key={bs.id} className="flex justify-between text-slate-600">
                    <span>{bs.services?.name} x {bs.quantity}</span>
                    <span>{(bs.price_at_booking * bs.quantity).toLocaleString()} ₽</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Финансовая сводка */}
          <div className="border-t pt-3 mt-3 space-y-1 text-xs">
             <div className="flex justify-between">
               <span>Проживание:</span> 
               <span>{accommodationTotal.toLocaleString()} ₽</span>
             </div>
             <div className="flex justify-between">
               <span>Услуги:</span> 
               <span>{(booking.services_total || 0).toLocaleString()} ₽</span>
             </div>
             <div className="flex justify-between text-green-600">
               <span className="font-medium">Оплачено:</span> 
               <span className="font-medium">{(booking.amount_paid || 0).toLocaleString()} ₽</span>
             </div>
             <div className="flex justify-between font-bold text-sm text-slate-800">
               <span>К оплате:</span> 
               <span>{(booking.total_amount - (booking.amount_paid || 0)).toLocaleString()} ₽</span>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}