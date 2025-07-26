import React, { useState, useEffect, useRef } from 'react';
import { format, isSameDay, parseISO, differenceInDays, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { User, AlertTriangle } from 'lucide-react';
import BookingPopover from './BookingPopover';

const statusColors = {
  'confirmed': 'bg-green-500',
  'pending': 'bg-yellow-500', 
  'cancelled': 'bg-red-500',
  'checked_in': 'bg-purple-500', // Проживание
  'checked_out': 'bg-blue-500'   // Выезд
};

export default function BookingGrid({ 
  rooms = [],
  bookings = [], 
  days = [], 
  onCellClick, 
  onBookingClick,
  onSelectionEnd,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [startCell, setStartCell] = useState(null);
  const [endCell, setEndCell] = useState(null);
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, text: '' });
  const [hoveredBooking, setHoveredBooking] = useState(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });
  
  const gridRef = useRef(null);

  // Проверяем, что данные корректны
  if (!Array.isArray(rooms) || !Array.isArray(bookings) || !Array.isArray(days)) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Загрузка данных...</p>
        <p className="text-xs text-slate-400 mt-2">
          Rooms: {typeof rooms} ({Array.isArray(rooms) ? 'array' : 'not array'}), 
          Bookings: {typeof bookings} ({Array.isArray(bookings) ? 'array' : 'not array'})
        </p>
      </div>
    );
  }

  // Автоматическая прокрутка к дате (сегодня - 2 дня)
  useEffect(() => {
    if (gridRef.current && days.length > 0) {
        const today = new Date();
        const targetDate = subDays(today, 2);
        const targetIndex = days.findIndex(day => isSameDay(day, targetDate));
        const scrollPosition = Math.max(0, targetIndex) * 128; // 128px per day cell
        gridRef.current.scrollLeft = scrollPosition;
    }
  }, [days]);

  const getBookingForRoomAndDate = (roomId, date) => {
    return bookings.find(booking => 
      booking.room_id === roomId && date >= parseISO(booking.check_in) && date < parseISO(booking.check_out)
    );
  };

  const getBookingWidth = (booking, days) => {
    const checkIn = parseISO(booking.check_in);
    const checkOut = parseISO(booking.check_out);
    const startIndex = days.findIndex(day => isSameDay(day, checkIn));
    if (startIndex === -1) return 0;
    
    const duration = differenceInDays(checkOut, checkIn);
    return duration;
  };

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

    setTooltip({ show: true, x: event.clientX + 15, y: event.clientY + 15, text: `${dayCount} дн.` });
  };

  const handleMouseUp = () => {
    if (!isDragging || !startCell || !endCell || startCell.roomId !== endCell.roomId) {
        setIsDragging(false);
        setStartCell(null);
        setEndCell(null);
        setTooltip({ show: false, x: 0, y: 0, text: '' });
        return;
    };
    setIsDragging(false);
    setTooltip({ show: false, x: 0, y: 0, text: '' });
    
    const startDate = startCell.date < endCell.date ? startCell.date : endCell.date;
    const endDate = new Date(endCell.date > startCell.date ? endCell.date : startCell.date);
    endDate.setDate(endDate.getDate() + 1);
    
    onSelectionEnd(startCell.roomId, startDate, endDate); 
    setStartCell(null);
    setEndCell(null);
  };

  const handleBookingHover = (booking, e) => {
    setHoveredBooking(booking);
    setPopoverPos({ x: e.clientX, y: e.clientY });
  };

  const getCellClass = (roomId, date) => {
    if (!isDragging || !startCell || !endCell || roomId !== startCell.roomId) return '';
    const selStartDate = startCell.date < endCell.date ? startCell.date : endCell.date;
    const selEndDate = startCell.date > endCell.date ? startCell.date : endCell.date;
    if (date >= selStartDate && date <= selEndDate) return 'bg-blue-200/50';
    return '';
  };
  
  const getServiceIcon = (category) => ({ 
    food: '🍽️', 
    spa: '💆‍♀️', 
    cleaning: '🧹', 
    transport: '🚗' 
  }[category] || '🛎️');

  const hasUnpaidAmount = (booking) => {
    return (booking.total_amount || 0) > (booking.amount_paid || 0);
  };

  return (
    <div className="min-w-max relative" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        {tooltip.show && (
          <div 
            className="fixed z-50 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg pointer-events-none" 
            style={{ top: tooltip.y, left: tooltip.x }}
          >
            {tooltip.text}
          </div>
        )}
        
        {hoveredBooking && (
          <BookingPopover 
            booking={hoveredBooking} 
            position={popoverPos} 
            onClose={() => setHoveredBooking(null)} 
          />
        )}
      
      <div className="flex border-b border-slate-200">
        <div className="w-48 p-4 bg-slate-100 font-semibold text-slate-800 sticky left-0 z-20 shadow-sm opacity-50">
          Номера
        </div>
        <div className="flex" ref={gridRef}>
            {days.map(day => (
              <div key={day.toISOString()} className="w-32 p-2 text-center border-l border-slate-200 bg-slate-50 flex-shrink-0">
                <div className="font-semibold text-slate-800">{format(day, 'dd', { locale: ru })}</div>
                <div className="text-xs text-slate-600">{format(day, 'EE', { locale: ru })}</div>
              </div>
            ))}
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto relative">
         {rooms.map(room => (
          <div key={room.id} className="flex border-b border-slate-200">
            <div className="w-48 p-4 bg-white font-medium text-slate-800 sticky left-0 z-10 flex items-center shadow-sm opacity-50">
                <div>
                    <div className="font-semibold">{room.room_number}</div>
                    <div className="text-xs text-slate-600">{room.room_type}</div>
                </div>
            </div>
            <div className="flex">
                {days.map(day => {
                  const booking = getBookingForRoomAndDate(room.id, day);
                  const isFirstDay = booking && isSameDay(parseISO(booking.check_in), day);
                  
                  return (
                    <div 
                      key={day.toISOString()} 
                      className={`w-32 h-20 border-l border-slate-200 relative cursor-pointer flex-shrink-0 ${getCellClass(room.id, day)}`}
                      onMouseDown={() => handleMouseDown(room.id, day)} 
                      onMouseMove={(e) => handleMouseMove(room.id, day, e)} 
                      onClick={() => !booking && onCellClick(room.id, day)}
                    >
                      
                      {booking && isFirstDay && (
                        <div 
                          className={`absolute inset-1 rounded-lg ${statusColors[booking.status]} text-white p-2 booking-block cursor-pointer flex flex-col justify-center`}
                          style={{ width: `${getBookingWidth(booking, days) * 128 - 8}px`, zIndex: 10 }}
                          onClick={(e) => { e.stopPropagation(); onBookingClick(booking); }} 
                          onMouseEnter={(e) => handleBookingHover(booking, e)} 
                          onMouseLeave={() => setHoveredBooking(null)}
                        >
                          
                          {/* Строка с именем гостя и индикаторами */}
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-1 flex-1">
                              {hasUnpaidAmount(booking) && (
                                <AlertTriangle className="h-3 w-3 text-yellow-300 flex-shrink-0" />
                              )}
                              <div className="text-sm font-medium text-left truncate">
                                {booking.guests?.full_name || 'Гость'}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-1 ml-2">
                              {booking.booking_services?.slice(0, 3).map((bs, index) => (
                                <span key={bs.id || index} className="text-xs" title={bs.services?.name}>
                                  {getServiceIcon(bs.services?.category)}
                                </span>
                              ))}
                              {booking.booking_services?.length > 3 && (
                                <span className="text-xs">+{booking.booking_services.length - 3}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {!booking && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">+</span>
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
  );
}