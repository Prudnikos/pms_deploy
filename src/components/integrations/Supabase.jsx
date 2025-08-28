import { supabase } from '@/lib/supabase'; // Импортируем наш настоящий клиент Supabase
import { format } from 'date-fns';

// --- ОБРАБОТЧИК ЗАПРОСОВ ---
// Обертка для обработки ошибок и возврата данных в едином формате
const handleSupabaseQuery = async (query) => {
  try {
    // Включаем .throwOnError(), чтобы любая ошибка Supabase вызвала исключение
    const { data, error } = await query.throwOnError();
    return { data, error: null };
  } catch (error) {
    console.error('Ошибка запроса Supabase:', error);
    // Возвращаем ошибку в том же формате для консистентности
    return { data: null, error };
  }
};

// --- ОСНОВНЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С ДАННЫМИ ---

// Получение бронирований
export const getBookings = async () => {
  return handleSupabaseQuery(
    supabase
      .from('bookings')
      .select(`
        *,
        guests ( * ),
        rooms ( id, room_number, room_type ),
        booking_services ( *, services ( * ) )
      `)
  );
};

// Получение бронирований для конкретного диапазона дат
export const getBookingsForRange = async (startDate, endDate) => {
  // Форматируем даты в строку YYYY-MM-DD для запроса
  const start = format(startDate, 'yyyy-MM-dd');
  const end = format(endDate, 'yyyy-MM-dd');

  console.log('🔍 getBookingsForRange: Загружаем бронирования для диапазона', { start, end });

  return handleSupabaseQuery(
    supabase
      .from('bookings')
      .select(`
        *,
        guests ( * ),
        rooms ( id, room_number, room_type ),
        booking_services ( *, services ( * ) )
      `)
      // Логика для получения всех броней, которые ПЕРЕСЕКАЮТСЯ с диапазоном
      .lt('check_in', end)   // Дата заезда должна быть ДО конца диапазона
      .gt('check_out', start) // Дата выезда должна быть ПОСЛЕ начала диапазона
      // Сортируем по дате создания
      .order('created_at', { ascending: false })
  );
};

// Получение полной информации о бронировании (для обновления данных после изменения услуг)
export const getBookingById = async (bookingId) => {
  return handleSupabaseQuery(
    supabase
      .from('bookings')
      .select(`
        *,
        guests ( * ),
        rooms ( id, room_number, room_type ),
        booking_services ( *, services ( * ) )
      `)
      .eq('id', bookingId)
      .single()
  );
};

// Получение комнат
export const getRooms = async () => {
  return handleSupabaseQuery(
    supabase
      .from('rooms')
      .select('*')
      .order('room_number', { ascending: true })
  );
};

// Получение услуг
export const getServices = async () => {
  return handleSupabaseQuery(
    supabase
      .from('services')
      .select('*')
  );
};

// Получение гостей
export const getGuests = async () => {
  return handleSupabaseQuery(
    supabase
      .from('guests')
      .select('*')
  );
};

// --- ФУНКЦИИ ДЛЯ СОЗДАНИЯ И ОБНОВЛЕНИЯ ---

// Создание нового бронирования
export const createBooking = async (bookingData) => {
  const { data, error } = await supabase.rpc('create_booking_with_guest', {
    guest_details: bookingData.guest_details,
    room_id_arg: bookingData.room_id,
    check_in_arg: bookingData.check_in,
    check_out_arg: bookingData.check_out,
    status_arg: bookingData.status,
    source_arg: bookingData.source,
    guests_count_arg: bookingData.guests_count,
    notes_arg: bookingData.notes,
    amount_paid_arg: bookingData.amount_paid,
    accommodation_total_arg: bookingData.accommodation_total,
    services_total_arg: bookingData.services_total,
    total_amount_arg: bookingData.total_amount
  });

  if (error) {
    console.error('Ошибка при создании бронирования:', error);
    throw error;
  }

  console.log('📋 Результат создания бронирования:', data);

  // 🚀 СИНХРОНИЗАЦИЯ С CHANNEX
  // Асинхронно отправляем бронирование в Channex (не блокируя UI)
  if (data && bookingData.syncToChannex !== false) {
    // Получаем правильный ID бронирования из ответа RPC функции
    // RPC функция может возвращать строку UUID, объект или массив
    const bookingId = typeof data === 'string' ? data : (data.id || data.booking_id || (Array.isArray(data) ? data[0]?.id : null));
    console.log('🔄 Начинаем синхронизацию с Channex для booking ID:', bookingId);
    
    // Небольшая задержка, чтобы убедиться что данные сохранились
    setTimeout(async () => {
      try {
        // Импортируем channexService динамически чтобы избежать циклических зависимостей
        const { default: channexService } = await import('@/services/channex/ChannexService.jsx');
        
        // Проверяем что у нас есть правильный ID
        if (!bookingId) {
          console.error('❌ Не удалось получить ID бронирования для синхронизации');
          return;
        }

        // Получаем полные данные бронирования для синхронизации
        const { data: fullBooking, error: fetchError } = await supabase
          .from('bookings')
          .select(`
            *,
            guests (*),
            rooms (*)
          `)
          .eq('id', bookingId)
          .single();

        if (fetchError) {
          console.error('❌ Ошибка получения данных бронирования для синхронизации:', fetchError);
          return;
        }

        if (!fullBooking) {
          console.error('❌ Данные бронирования не найдены для синхронизации');
          return;
        }

        console.log('📤 Автоматическая синхронизация бронирования с Channex...', fullBooking);
        
        // Отправляем в Channex
        const result = await channexService.createBookingInChannex(fullBooking);
        console.log('✅ Бронирование успешно синхронизировано с Channex!', result);
        
      } catch (error) {
        console.error('❌ Ошибка синхронизации с Channex:', error);
        
        // Логируем ошибку в консоль (таблица sync_errors не существует)
        console.error('❌ Детали ошибки синхронизации:', {
          booking_id: bookingId,
          service: 'channex',
          error_message: error.message,
          error_stack: error.stack,
          occurred_at: new Date().toISOString()
        });
      }
    }, 1000);
  }

  return data;
};

// Обновление существующего бронирования
export const updateBooking = async (id, updates) => {
  return handleSupabaseQuery(
    supabase
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .select() // .select() возвращает обновленную запись
  );
};

// Обновление данных гостя
export const updateGuest = async (id, updates) => {
  return handleSupabaseQuery(
    supabase
      .from('guests')
      .update(updates)
      .eq('id', id)
  );
};

// Удаление бронирования
export const deleteBooking = async (id) => {
  console.log('🗑️ Supabase: deleteBooking called with id:', id);
  
  const result = await handleSupabaseQuery(
    supabase
      .from('bookings')
      .delete()
      .eq('id', id)
  );
  
  if (result.error) {
    console.error('❌ Supabase: deleteBooking failed:', result.error);
  } else {
    console.log('✅ Supabase: deleteBooking successful for id:', id);
  }
  
  return result;
};

// --- ФУНКЦИИ ДЛЯ РАБОТЫ С УСЛУГАМИ ---

// Добавление услуг к бронированию (с fallback логикой)
export const addServicesToBooking = async (bookingId, servicesCart) => {
  try {
    console.log('🔄 Supabase: Adding services to booking', { bookingId, servicesCart });
    
    // Попробуем сначала через RPC
    const { data, error } = await supabase.rpc('add_services_to_booking', {
      booking_id_arg: bookingId,
      services_data: servicesCart
    });

    if (error) {
      console.warn('⚠️ RPC failed, trying direct insert:', error.message);
      
      // Если RPC не сработала, используем прямую вставку
      const servicesToInsert = servicesCart.map(service => ({
        booking_id: bookingId,
        service_id: service.service_id,
        quantity: service.quantity,
        price_at_booking: service.price_at_booking
      }));
      
      const { data: insertData, error: insertError } = await supabase
        .from('booking_services')
        .insert(servicesToInsert)
        .select();
        
      if (insertError) {
        console.error('❌ Direct insert also failed:', insertError);
        throw insertError;
      }
      
      console.log('✅ Supabase: Services added via direct insert', insertData);
      return { data: insertData, error: null };
    }
    
    console.log('✅ Supabase: Services added via RPC successfully', data);
    return { data, error: null };
    
  } catch (error) {
    console.error('❌ Error in addServicesToBooking:', error);
    return { data: null, error };
  }
};

// Удаление услуги из бронирования
export const removeServiceFromBooking = async (bookingServiceId) => {
  try {
    console.log('🔄 Supabase: Removing service from booking', bookingServiceId);
    
    const result = await handleSupabaseQuery(
      supabase
        .from('booking_services')
        .delete()
        .eq('id', bookingServiceId)
    );
    
    console.log('✅ Supabase: Service removed successfully');
    return result;
    
  } catch (error) {
    console.error('❌ Error in removeServiceFromBooking:', error);
    return { data: null, error };
  }
};

// --- ФУНКЦИИ ДЛЯ РАБОТЫ С ОТЧЕТАМИ ---

// Создание или обновление ежедневного отчета
export const saveDailyReport = async (reportDate, reportData) => {
  try {
    console.log('🔄 Supabase: Saving daily report', { reportDate, reportData });
    
    // Проверяем, существует ли отчет за эту дату
    const { data: existingReport, error: checkError } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('report_date', reportDate)
      .single();
    
    const reportPayload = {
      report_date: reportDate,
      income_data: reportData.manual.income,
      expenses_data: reportData.manual.expenses,
      auto_data: reportData.auto,
      updated_at: new Date().toISOString()
    };
    
    if (existingReport && !checkError) {
      // Обновляем существующий отчет
      const { data, error } = await supabase
        .from('daily_reports')
        .update(reportPayload)
        .eq('id', existingReport.id)
        .select()
        .single();
        
      if (error) throw error;
      
      // Сохраняем историю изменений
      await saveReportHistory(existingReport.id, existingReport, reportPayload, 'update');
      
      console.log('✅ Daily report updated successfully');
      return { data, error: null };
    } else {
      // Создаем новый отчет
      reportPayload.created_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('daily_reports')
        .insert(reportPayload)
        .select()
        .single();
        
      if (error) throw error;
      
      // Сохраняем историю создания
      await saveReportHistory(data.id, null, reportPayload, 'create');
      
      console.log('✅ Daily report created successfully');
      return { data, error: null };
    }
    
  } catch (error) {
    console.error('❌ Error saving daily report:', error);
    return { data: null, error };
  }
};

// Получение ежедневного отчета
export const getDailyReport = async (reportDate) => {
  try {
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('report_date', reportDate)
      .single();
      
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }
    
    return { data: data || null, error: null };
    
  } catch (error) {
    console.error('❌ Error getting daily report:', error);
    return { data: null, error };
  }
};

// Сохранение истории изменений отчета
const saveReportHistory = async (reportId, oldData, newData, action) => {
  try {
    const historyRecord = {
      report_id: reportId,
      action: action, // 'create', 'update', 'delete'
      old_data: oldData,
      new_data: newData,
      changed_at: new Date().toISOString(),
      // TODO: добавить user_id когда будет система пользователей
    };
    
    const { error } = await supabase
      .from('daily_reports_history')
      .insert(historyRecord);
      
    if (error) throw error;
    
    console.log('✅ Report history saved');
    
  } catch (error) {
    console.error('❌ Error saving report history:', error);
  }
};

// Получение истории изменений отчета
export const getReportHistory = async (reportId) => {
  try {
    const { data, error } = await supabase
      .from('daily_reports_history')
      .select('*')
      .eq('report_id', reportId)
      .order('changed_at', { ascending: false });
      
    if (error) throw error;
    
    return { data: data || [], error: null };
    
  } catch (error) {
    console.error('❌ Error getting report history:', error);
    return { data: [], error };
  }
};