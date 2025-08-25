import React, { useEffect, useState } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, MessageCircle, CreditCard, Package, Clock, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const statusGradients = {
  'confirmed': 'from-emerald-400 to-green-500',
  'pending': 'from-amber-400 to-yellow-500',
  'cancelled': 'from-rose-400 to-red-500',
  'checked_in': 'from-violet-400 to-purple-500',
  'checked_out': 'from-sky-400 to-blue-500'
};

const statusIcons = {
  'confirmed': '✅',
  'pending': '⏳',
  'cancelled': '❌',
  'checked_in': '🏠',
  'checked_out': '✈️'
};

export default function BookingPopover({ booking, position, onClose }) {
  const { t, currentLanguage, formatCurrency } = useTranslation('booking');
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0, showBelow: false });
  
  if (!booking) return null;

  const dateLocale = currentLanguage === 'ru' ? ru : enUS;
  const currency = currentLanguage === 'ru' ? 'RUB' : 'USD';
  
  const accommodationTotal = booking.total_amount - (booking.services_total || 0);
  const unpaidAmount = booking.total_amount - (booking.amount_paid || 0);
  const duration = differenceInDays(parseISO(booking.check_out), parseISO(booking.check_in));

  // Вычисляем оптимальную позицию попапа
  useEffect(() => {
    const popoverHeight = 400; // Примерная высота попапа
    const popoverWidth = 350;
    const margin = 20;

    let x = position.x + 10;
    let y = position.y;
    let showBelow = false;

    // Проверяем, помещается ли попап справа
    if (x + popoverWidth > window.innerWidth - margin) {
      x = position.x - popoverWidth - 10;
    }

    // Проверяем, помещается ли попап сверху (обычное положение)
    if (y - popoverHeight < margin) {
      // Если не помещается сверху, показываем снизу
      showBelow = true;
      y = position.y + 10;
    } else {
      // Если помещается сверху, сдвигаем вверх
      y = position.y - popoverHeight - 10;
    }

    // Проверяем, что попап не выходит за нижний край экрана
    if (showBelow && y + popoverHeight > window.innerHeight - margin) {
      y = window.innerHeight - popoverHeight - margin;
    }

    // Убеждаемся, что попап не выходит за левый край
    if (x < margin) {
      x = margin;
    }

    setPopoverPosition({ x, y, showBelow });
  }, [position]);

  // Функция для правильного склонения дней
  const getDaysText = (days) => {
    if (currentLanguage === 'en') {
      return `${days} ${days === 1 ? 'day' : 'days'}`;
    }
    // Русское склонение
    if (days === 1) return '1 день';
    if (days >= 2 && days <= 4) return `${days} дня`;
    return `${days} дней`;
  };

  // Функция для правильного склонения гостей
  const getGuestsText = (count) => {
    if (currentLanguage === 'en') {
      return `${count} ${count === 1 ? 'guest' : 'guests'}`;
    }
    // Русское склонение
    if (count === 1) return '1 гость';
    if (count >= 2 && count <= 4) return `${count} гостя`;
    return `${count} гостей`;
  };

  return (
    <div 
      className="fixed z-50 pointer-events-none" 
      style={{ 
        left: `${popoverPosition.x}px`, 
        top: `${popoverPosition.y}px`
      }}
    >
      <Card className="w-80 shadow-2xl border-0 bg-white/95 backdrop-blur-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Градиентный хедер */}
        <div className={`h-1 bg-gradient-to-r ${statusGradients[booking.status]}`} />
        
        <CardHeader className="pb-3 bg-gradient-to-br from-slate-50 to-blue-50/50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                {booking.guests?.full_name || t('popover.unknownGuest')}
              </CardTitle>
            </div>
            <div className={`
              px-2.5 py-1 rounded-full text-xs font-medium text-white
              bg-gradient-to-r ${statusGradients[booking.status]} shadow-md
              flex items-center gap-1
            `}>
              <span>{statusIcons[booking.status]}</span>
              <span>{t(`status.${booking.status}`)}</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 pt-3">
          {/* Даты проживания */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Calendar className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{t('popover.stayPeriod')}</p>
                <p className="text-sm font-semibold text-slate-800">
                  {format(parseISO(booking.check_in), 'dd MMM', { locale: dateLocale })} — 
                  {format(parseISO(booking.check_out), 'dd MMM', { locale: dateLocale })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">{t('popover.duration')}</p>
              <p className="text-sm font-bold text-blue-600">{getDaysText(duration)}</p>
            </div>
          </div>
          
          {/* Количество гостей */}
          <div className="flex items-center gap-3 px-3">
            <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
              <User className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500">{t('popover.guestCount')}</p>
              <p className="text-sm font-semibold text-slate-800">
                {getGuestsText(booking.guests_count || booking.guest_count || booking.guests?.guests_count || booking.guests?.guest_count || 1)}
              </p>
            </div>
          </div>

          {/* Комментарий к брони */}
          {booking.notes && (
            <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
              <div className="flex items-start gap-2">
                <MessageCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-orange-700 mb-1">{t('popover.comment')}</p>
                  <p className="text-sm text-slate-600">{booking.notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Список заказанных услуг */}
          {booking.booking_services && booking.booking_services.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3">
                <Package className="h-4 w-4 text-purple-600" />
                <p className="text-sm font-semibold text-slate-700">{t('popover.additionalServices')}</p>
              </div>
              <div className="space-y-1 px-3">
                {booking.booking_services.map((bs) => (
                  <div key={bs.id} className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <span className="text-sm text-slate-600">
                      {bs.services?.name} 
                      <span className="text-xs text-slate-400 ml-1">×{bs.quantity}</span>
                    </span>
                    <span className="text-sm font-medium text-slate-800">
                      {formatCurrency(bs.price_at_booking * bs.quantity, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Финансовая сводка */}
          <div className="border-t border-slate-200/50 pt-3 mt-3 space-y-2">
            <div className="space-y-1.5 px-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">{t('popover.accommodation')}</span> 
                <span className="text-sm font-medium">{formatCurrency(accommodationTotal, currency)}</span>
              </div>
              {booking.services_total > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">{t('popover.services')}</span> 
                  <span className="text-sm font-medium">{formatCurrency(booking.services_total || 0, currency)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t border-slate-200/50">
                <span className="text-sm font-semibold text-slate-700">{t('popover.total')}</span> 
                <span className="text-sm font-bold text-slate-800">{formatCurrency(booking.total_amount, currency)}</span>
              </div>
            </div>
            
            {/* Статус оплаты */}
            <div className={`
              mx-3 p-3 rounded-xl
              ${unpaidAmount > 0 
                ? 'bg-gradient-to-r from-amber-100 to-orange-100 border border-orange-200' 
                : 'bg-gradient-to-r from-emerald-100 to-green-100 border border-green-200'
              }
            `}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {unpaidAmount > 0 ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-700">{t('popover.toPay')}</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">{t('popover.paidFully')}</span>
                    </>
                  )}
                </div>
                <span className={`text-lg font-bold ${unpaidAmount > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                  {unpaidAmount > 0 ? formatCurrency(unpaidAmount, currency) : '✓'}
                </span>
              </div>
              
              {booking.amount_paid > 0 && unpaidAmount > 0 && (
                <div className="mt-2 pt-2 border-t border-orange-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">{t('popover.alreadyPaid')}</span>
                    <span className="text-xs font-medium text-green-600">
                      {formatCurrency(booking.amount_paid, currency)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}