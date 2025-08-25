import React, { useState, useEffect, useRef } from 'react';
import { format, isSameDay, parseISO, differenceInDays, isToday, startOfDay, addDays } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { Home, AlertTriangle, CalendarDays, Users, DollarSign, Edit } from 'lucide-react';
import BookingPopover from './BookingPopover';
import SourceIcon from '@/components/SourceIcon';
import { useTranslation } from '@/hooks/useTranslation';

// Константы стилей
const statusColors = {
  'confirmed': 'from-emerald-400 to-green-500',
  'pending': 'from-amber-400 to-yellow-500',
  'cancelled': 'from-rose-400 to-red-500',
  'checked_in': 'from-violet-400 to-purple-500',
  'checked_out': 'from-sky-400 to-blue-500'
};
const statusBorders = {
  'confirmed': 'border-emerald-300',
  'pending': 'border-amber-300',
  'cancelled': 'border-rose-300',
  'checked_in': 'border-violet-300',
  'checked_out': 'border-sky-300'
};

export default function BookingGrid({
  rooms = [],
  bookings = [],
  days = [],
  onCellClick = () => {},
  onBookingClick = () => {},
  onSelectionEnd = () => {},
  onPriceChange = null,
}) {
  const { t, currentLanguage } = useTranslation('booking');
  const dateLocale = currentLanguage === 'ru' ? ru : enUS;
  
  // Состояния
  const [isDragging, setIsDragging] = useState(false);
  const [startCell, setStartCell] = useState(null);
  const [endCell, setEndCell] = useState(null);
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, text: '' });
  const [hoveredBooking, setHoveredBooking] = useState(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });
  const [roomPrices, setRoomPrices] = useState({});

  // Инициализация цен
  useEffect(() => {
    const prices = {};
    if (rooms.length > 0 && days.length > 0) {
      rooms.forEach(room => {
        days.forEach(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          prices[`${room.id}-${dateStr}`] = room.price_per_night || 150;
        });
      });
      setRoomPrices(prices);
    }
  }, [rooms, days]);

  // --- Функции-хелперы ---
  const getBookingsForRoomAndDate = (roomId, date) => {
    return bookings.filter(booking => {
        if (booking.status === 'cancelled') return false;
        const checkIn = startOfDay(parseISO(booking.check_in));
        const checkOut = startOfDay(parseISO(booking.check_out));
        const currentDate = startOfDay(date);
        return booking.room_id === roomId && currentDate >= checkIn && currentDate < checkOut;
    });
  };

  const getBookingWidth = (booking) => {
    const duration = differenceInDays(parseISO(booking.check_out), parseISO(booking.check_in));
    return duration > 0 ? duration : 1;
  };

  const getServiceIcon = (category) => ({ 'food': '🍽️', 'spa': '💆‍♀️', 'cleaning': '🧹', 'transport': '🚗' }[category] || '🛎️');

  // Функция для получения количества гостей
  const getGuestCount = (booking) => {
    // Сначала пробуем guests_count, потом guest_count, потом из объекта guests
    return booking.guests_count || 
           booking.guest_count || 
           booking.guests?.guest_count || 
           booking.guests?.guests_count ||
           1;
  };

  // --- Обработчики событий ---
  const handlePriceEdit = async (roomId, date, currentPrice) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const roomName = rooms.find(r => r.id === roomId)?.room_number || 'Room';
    const newPrice = prompt(`Цена за ${roomName} на ${format(date, 'dd.MM.yyyy')}:`, currentPrice);
    
    if (newPrice && !isNaN(newPrice) && parseFloat(newPrice) >= 0) {
      const price = parseFloat(newPrice);
      setRoomPrices(prev => ({ ...prev, [`${roomId}-${dateStr}`]: price }));
      if (onPriceChange) {
        try {
          await onPriceChange(roomId, dateStr, price);
        } catch (error) {
          console.error('Failed to update price:', error);
          setRoomPrices(prev => ({ ...prev, [`${roomId}-${dateStr}`]: currentPrice }));
        }
      }
    }
  };

  const handleMouseDown = (roomId, date) => {
    if (getBookingsForRoomAndDate(roomId, date).length > 0) return;
    setIsDragging(true);
    setStartCell({ roomId, date });
    setEndCell({ roomId, date });
  };

  const handleMouseMove = (roomId, date, event) => {
    if (!isDragging || !startCell || roomId !== startCell.roomId) return;
    setEndCell({ roomId, date });
    const startDate = startCell.date < date ? startCell.date : date;
    const endDate = startCell.date > date ? startCell.date : date;
    const dayCount = differenceInDays(endDate, startDate) + 1;
    const dayText = dayCount === 1 ? 'день' : (dayCount > 1 && dayCount < 5) ? 'дня' : 'дней';
    setTooltip({ show: true, x: event.clientX + 15, y: event.clientY - 35, text: `${dayCount} ${dayText}` });
  };

  const handleMouseUp = () => {
    if (!isDragging || !startCell || !endCell) { setIsDragging(false); return; };
    setIsDragging(false);
    setTooltip({ show: false, x: 0, y: 0, text: '' });
    const startDate = startCell.date < endCell.date ? startCell.date : endCell.date;
    const endDate = addDays(endCell.date > startCell.date ? endCell.date : startCell.date, 1);
    onSelectionEnd(startCell.roomId, startDate, endDate);
    setStartCell(null);
    setEndCell(null);
  };
  
  const handleBookingHover = (booking, e) => {
    setHoveredBooking(booking);
    setPopoverPos({ x: e.clientX, y: e.clientY });
  };

  const getCellClass = (roomId, date) => {
    if (isDragging && startCell && endCell && roomId === startCell.roomId) {
      const selStartDate = startCell.date < endCell.date ? startCell.date : endCell.date;
      const selEndDate = startCell.date > endCell.date ? startCell.date : endCell.date;
      if (date >= selStartDate && date <= selEndDate) return 'bg-blue-200/50';
    }
    return '';
  };

  return (
    <div className="relative border border-slate-200 rounded-lg overflow-hidden" onMouseLeave={handleMouseUp}>
      {tooltip.show && (
        <div 
          className="fixed z-50 px-3 py-1.5 bg-slate-800/90 text-white text-xs rounded-lg shadow-xl pointer-events-none flex items-center gap-1" 
          style={{ top: tooltip.y, left: tooltip.x }}
        >
          <CalendarDays className="h-3 w-3" /> {tooltip.text}
        </div>
      )}
      {hoveredBooking && (
        <BookingPopover 
          booking={hoveredBooking} 
          position={popoverPos} 
          onClose={() => setHoveredBooking(null)} 
        />
      )}

      <div className="overflow-x-auto">
        <div className="relative inline-block min-w-full align-middle">
          {/* Шапка с датами */}
          <div className="flex sticky top-0 z-30 bg-white/80 backdrop-blur-md">
            <div className="w-48 min-w-[192px] p-3 font-semibold text-slate-700 sticky left-0 z-40 border-r border-b border-slate-200 flex items-center bg-white">
              <Home className="h-4 w-4 mr-2 text-slate-500" /> {t('grid.rooms')}
            </div>
            <div className="flex">
              {days.map(day => (
                <div 
                  key={day.toISOString()} 
                  className={`w-24 min-w-[96px] p-2 text-center border-l border-b border-slate-200 ${ 
                    (day.getDay() === 0 || day.getDay() === 6) ? 'bg-slate-50/70' : ''
                  } ${isToday(day) ? 'bg-amber-50' : ''}`}
                >
                  <div className={`font-semibold text-sm ${isToday(day) ? 'text-amber-700' : 'text-slate-800'}`}>
                    {format(day, 'dd')}
                  </div>
                  <div className={`text-xs ${(day.getDay() === 0 || day.getDay() === 6) ? 'text-blue-600' : 'text-slate-500'}`}>
                    {format(day, 'EE', { locale: dateLocale })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Тело с номерами и бронями */}
          <div onMouseUp={handleMouseUp}>
            {rooms.map((room) => (
              <div key={room.id} className="flex border-t border-slate-200 relative">
                {/* Левая панель с номерами комнат - фиксированная с прозрачностью */}
                <div className="w-48 min-w-[192px] p-2 font-medium text-slate-800 sticky left-0 z-20 bg-white/80 backdrop-blur-sm border-r border-slate-200">
                  <div className="font-semibold text-sm">{room.room_number}</div>
                  <div className="text-xs text-slate-500 capitalize">{room.room_type}</div>
                </div>
                
                {/* Основная область с ячейками и бронями */}
                <div className="flex relative">
                  {days.map(day => {
                    const bookingsInCell = getBookingsForRoomAndDate(room.id, day);
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const price = roomPrices[`${room.id}-${dateStr}`] || room.price_per_night;
                    
                    return (
                      <div
                        key={day.toISOString()}
                        className={`w-24 min-w-[96px] h-14 border-l border-slate-200 relative group ${
                          bookingsInCell.length === 0 ? 'cursor-pointer hover:bg-blue-100/50' : ''
                        } ${getCellClass(room.id, day)}`}
                        onMouseDown={() => handleMouseDown(room.id, day)}
                        onMouseMove={(e) => handleMouseMove(room.id, day, e)}
                        onClick={() => bookingsInCell.length === 0 && onCellClick(room.id, day)}
                      >
                        {/* Отображение цены в пустых ячейках */}
                        {bookingsInCell.length === 0 && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                            {/* Цена всегда видна с прозрачностью 50% */}
                            <div className="text-xs text-slate-600 font-medium opacity-50">
                              ${price}
                            </div>
                            {/* Иконка редактирования при ховере */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                              <div 
                                className="flex items-center text-xs text-green-700 font-medium cursor-pointer bg-white/80 rounded px-1" 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  handlePriceEdit(room.id, day, price); 
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Отображение броней */}
                        {bookingsInCell.map(booking => {
                           const isFirstDay = isSameDay(parseISO(booking.check_in), day);
                           if (!isFirstDay) return null;
                           
                           const width = getBookingWidth(booking) * 96 - 4;
                           const guestCount = getGuestCount(booking);
                           
                           return (
                              <div
                                key={booking.id}
                                className={`absolute top-0.5 left-0.5 rounded-lg bg-gradient-to-r ${statusColors[booking.status]} text-white p-1.5 cursor-pointer flex items-center shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 border ${statusBorders[booking.status]}`}
                                style={{ 
                                  width: `${width}px`, 
                                  zIndex: 15, // Ниже левой панели
                                  height: 'calc(100% - 4px)' 
                                }}
                                onClick={(e) => { e.stopPropagation(); onBookingClick(booking); }}
                                onMouseEnter={(e) => handleBookingHover(booking, e)}
                                onMouseLeave={() => setHoveredBooking(null)}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {/* Иконка источника */}
                                  <div className="flex-shrink-0">
                                    <SourceIcon source={booking.source} />
                                  </div>
                                  
                                  {/* Количество гостей */}
                                  <div className="flex items-center text-xs bg-white/20 rounded px-1 flex-shrink-0">
                                    <Users className="h-3 w-3 mr-0.5" />
                                    {guestCount}
                                  </div>
                                  
                                  {/* ФИО гостя */}
                                  <div className="text-sm font-medium truncate flex-1" title={booking.guests?.full_name}>
                                    {booking.guests?.full_name || 'Гость'}
                                  </div>
                                  
                                  {/* Услуги */}
                                  <div className="flex items-center ml-auto flex-shrink-0">
                                    {booking.booking_services?.map(bs => (
                                      <span 
                                        key={bs.id} 
                                        className="text-xs" 
                                        title={bs.services?.name}
                                      >
                                        {getServiceIcon(bs.services?.category)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                           );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}