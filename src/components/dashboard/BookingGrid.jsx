import React, { useState, useRef } from 'react';
import { format, isSameDay, parseISO, differenceInDays, isToday, startOfDay, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Home, AlertTriangle, CalendarDays } from 'lucide-react';
import BookingPopover from './BookingPopover';
import SourceIcon from '@/components/SourceIcon';

// Константы стилей (без изменений)
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
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [startCell, setStartCell] = useState(null);
  const [endCell, setEndCell] = useState(null);
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, text: '' });
  const [hoveredBooking, setHoveredBooking] = useState(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });

  if (!Array.isArray(rooms) || !Array.isArray(bookings) || !Array.isArray(days) || days.length === 0) {
    return <div>Загрузка...</div>;
  }

  // --- Функции-хелперы ---
  const getBookingForRoomAndDate = (roomId, date) => {
    return bookings.find(booking =>
      booking.room_id === roomId &&
      booking.status !== 'cancelled' &&
      startOfDay(date) >= startOfDay(parseISO(booking.check_in)) &&
      startOfDay(date) < startOfDay(parseISO(booking.check_out))
    );
  };
  const getBookingWidth = (booking) => {
    const duration = differenceInDays(parseISO(booking.check_out), parseISO(booking.check_in));
    return duration > 0 ? duration : 1;
  };
  const getServiceIcon = (category) => ({ 'food': '🍽️', 'spa': '💆‍♀️', 'cleaning': '🧹', 'transport': '🚗' }[category] || '🛎️');

  // --- Обработчики мыши ---
  const handleMouseDown = (roomId, date) => {
    if (getBookingForRoomAndDate(roomId, date)) return;
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
    if (!isDragging || !startCell || !endCell) {
        setIsDragging(false); return;
    };
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
    <div className="relative border border-slate-200 rounded-lg" onMouseLeave={handleMouseUp}>
      {tooltip.show && (
        <div className="fixed z-50 px-3 py-1.5 bg-slate-800/90 text-white text-xs rounded-lg shadow-xl pointer-events-none flex items-center gap-1" style={{ top: tooltip.y, left: tooltip.x }}>
          <CalendarDays className="h-3 w-3" /> {tooltip.text}
        </div>
      )}
      {hoveredBooking && <BookingPopover booking={hoveredBooking} position={popoverPos} onClose={() => setHoveredBooking(null)} />}

      <div className="overflow-x-auto">
        <div className="relative inline-block min-w-full align-middle">
          {/* --- Шапка с датами (Sticky) --- */}
          <div className="flex sticky top-0 z-20 bg-white/80 backdrop-blur-md">
            <div className="w-48 min-w-[192px] p-3 font-semibold text-slate-700 sticky left-0 z-10 border-r border-b border-slate-200 flex items-center bg-white">
              <Home className="h-4 w-4 mr-2 text-slate-500" /> Номера
            </div>
            <div className="flex">
              {days.map(day => {
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div key={day.toISOString()} className={`w-24 min-w-[96px] p-2 text-center border-l border-b border-slate-200 ${isWeekend ? 'bg-slate-50/70' : ''} ${isToday(day) ? 'bg-amber-50' : ''}`}>
                    <div className={`font-semibold text-sm ${isToday(day) ? 'text-amber-700' : 'text-slate-800'}`}>{format(day, 'dd')}</div>
                    <div className={`text-xs ${isWeekend ? 'text-blue-600' : 'text-slate-500'}`}>{format(day, 'EE', { locale: ru })}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* --- Тело с номерами и бронями --- */}
          <div onMouseUp={handleMouseUp}>
            {rooms.map((room) => (
              <div key={room.id} className="flex border-t border-slate-200">
                <div className="w-48 min-w-[192px] p-2 font-medium text-slate-800 sticky left-0 z-10 bg-white/95 border-r border-slate-200">
                  <div className="font-semibold text-sm">{room.room_number}</div>
                  <div className="text-xs text-slate-500 capitalize">{room.room_type}</div>
                </div>
                {/* ИЗМЕНЕНИЕ: Объединяем сетку и брони в один слой */}
                <div className="flex relative">
                  {days.map(day => {
                    const booking = getBookingForRoomAndDate(room.id, day);
                    const isFirstDay = booking && isSameDay(parseISO(booking.check_in), day);
                    return (
                      <div
                        key={day.toISOString()}
                        className={`w-24 min-w-[96px] h-14 border-l border-slate-200 relative cursor-pointer hover:bg-blue-100/50 ${getCellClass(room.id, day)}`}
                        onMouseDown={() => handleMouseDown(room.id, day)}
                        onMouseMove={(e) => handleMouseMove(room.id, day, e)}
                        onClick={() => !booking && onCellClick(room.id, day)}
                      >
                        {isFirstDay && (
                          <div
                            className={`absolute top-0.5 left-0.5 rounded-lg bg-gradient-to-r ${statusColors[booking.status]} text-white p-1.5 cursor-pointer flex items-center shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 border ${statusBorders[booking.status]}`}
                            style={{ width: `${getBookingWidth(booking) * 96 - 4}px`, zIndex: 10, height: 'calc(100% - 4px)' }}
                            onClick={(e) => { e.stopPropagation(); onBookingClick(booking); }}
                            onMouseEnter={(e) => handleBookingHover(booking, e)}
                            onMouseLeave={() => setHoveredBooking(null)}
                          >
                             <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="flex-shrink-0"><SourceIcon source={booking.source} /></div>
                                {((booking.total_amount || 0) > (booking.amount_paid || 0)) && <div className="flex-shrink-0"><AlertTriangle className="h-3 w-3 text-yellow-300" title="Есть долг" /></div>}
                                <div className="text-sm font-medium truncate" title={booking.guests?.full_name}>{booking.guests?.full_name || 'Гость'}</div>
                                <div className="flex items-center ml-auto flex-shrink-0">
                                  {booking.booking_services?.slice(0, 2).map((bs) => (
                                    <span key={bs.id} className="text-xs" title={bs.services?.name}>{getServiceIcon(bs.services?.category)}</span>
                                  ))}
                                  {booking.booking_services?.length > 2 && (<span className="text-xs ml-0.5">+{booking.booking_services.length - 2}</span>)}
                                </div>
                              </div>
                          </div>
                        )}
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