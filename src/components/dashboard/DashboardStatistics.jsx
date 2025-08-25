import React, { useMemo } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { LogIn, LogOut, Home, Gift, CheckSquare } from 'lucide-react';

export default function DashboardStatistics({ bookings, onNavigate }) {
  const statistics = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // Фильтруем активные брони (не отменённые)
    const activeBookings = bookings.filter(booking => booking.status !== 'cancelled');
    
    // Заезды (check_in сегодня)
    const checkInsToday = activeBookings.filter(booking => 
      format(parseISO(booking.check_in), 'yyyy-MM-dd') === todayStr
    );
    
    // Выезды (check_out сегодня)  
    const checkOutsToday = activeBookings.filter(booking =>
      format(parseISO(booking.check_out), 'yyyy-MM-dd') === todayStr
    );
    
    // Проживания (гости, которые сейчас проживают)
    const currentStays = activeBookings.filter(booking => {
      const checkIn = parseISO(booking.check_in);
      const checkOut = parseISO(booking.check_out);
      return checkIn <= today && checkOut > today;
    });
    
    // Дни рождения (гости с днем рождения сегодня)
    const birthdaysToday = activeBookings.filter(booking => {
      if (booking.guests?.birthday) {
        const birthday = parseISO(booking.guests.birthday);
        return format(birthday, 'MM-dd') === format(today, 'MM-dd');
      }
      return false;
    });
    
    // Задачи - пример, нужно адаптировать под вашу логику
    const tasks = 0; // Заглушка
    
    // Общая статистика
    const totalRooms = 21; // Можно передать как пропс
    const occupiedRooms = currentStays.length;
    const freeRooms = totalRooms - occupiedRooms;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
    
    return {
      checkIns: checkInsToday.length,
      checkOuts: checkOutsToday.length,
      currentStays: currentStays.length,
      birthdays: birthdaysToday.length,
      tasks: tasks,
      totalRooms,
      freeRooms,
      occupiedRooms,
      occupancyRate
    };
  }, [bookings]);

  const handleStatClick = (type) => {
    // Навигируем к соответствующей странице
    const routes = {
      'checkins': '/Arrivals',
      'checkouts': '/Departures', 
      'stays': '/Stays',
      'birthdays': '/Birthdays',
      'tasks': '/Tasks'
    };
    
    const route = routes[type];
    if (route && onNavigate) {
      onNavigate(route);
    }
  };

  return (
    <div className="flex items-center justify-center gap-8 text-sm">
      {/* Первая колонка */}
      <div className="space-y-1">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
          onClick={() => handleStatClick('checkins')}
        >
          <LogIn className="h-4 w-4 text-green-500" />
          <span className="text-slate-600">Заезды</span>
          <span className="font-semibold text-green-500">{statistics.checkIns}</span>
        </div>
        
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
          onClick={() => handleStatClick('checkouts')}
        >
          <LogOut className="h-4 w-4 text-blue-500" />
          <span className="text-slate-600">Выезды</span>
          <span className="font-semibold text-blue-500">{statistics.checkOuts}</span>
        </div>
        
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
          onClick={() => handleStatClick('stays')}
        >
          <Home className="h-4 w-4 text-purple-500" />
          <span className="text-slate-600">Проживание</span>
          <span className="font-semibold text-purple-500">{statistics.currentStays}</span>
        </div>
      </div>
      
      {/* Вторая колонка */}
      <div className="space-y-1">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
          onClick={() => handleStatClick('birthdays')}
        >
          <Gift className="h-4 w-4 text-pink-500" />
          <span className="text-slate-600">Дни рождения</span>
          <span className="font-semibold text-pink-500">{statistics.birthdays}</span>
        </div>
        
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
          onClick={() => handleStatClick('tasks')}
        >
          <CheckSquare className="h-4 w-4 text-orange-500" />
          <span className="text-slate-600">Задачи</span>
          <span className="font-semibold text-orange-500">{statistics.tasks}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-slate-600">Свободно номеров</span>
          <span className="font-semibold text-green-500">{statistics.freeRooms} (0)</span>
        </div>
      </div>
      
      {/* Третья колонка */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-slate-600">Занято номеров</span>
          <span className="font-semibold text-red-500">{statistics.occupiedRooms} ({statistics.occupiedRooms})</span>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-slate-600">Загрузка</span>
            <span className="font-semibold text-blue-500">{statistics.occupancyRate}%</span>
          </div>
          {/* Прогресс бар */}
          <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(statistics.occupancyRate, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}