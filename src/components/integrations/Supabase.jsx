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
// Вставьте этот код в Supabase.jsx

// Обновление данных гостя
export const updateGuest = async (id, updates) => {
  return handleSupabaseQuery(
    supabase
      .from('guests')
      .update(updates)
      .eq('id', id)
  );
};
// --- ОСНОВНЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С ДАННЫМИ ---

// Получение бронирований
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
// Вставьте этот код в Supabase.jsx

// Удаление бронирования
export const deleteBooking = async (id) => {
  return handleSupabaseQuery(
    supabase
      .from('bookings')
      .delete()
      .eq('id', id)
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

// --- ФУНКЦИИ ДЛЯ СОЗДАНИЯ И ОБНОВЛЕНИЯ (недостающие) ---

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
  return data;
};

// ... остальные ваши функции (getBookings, updateBooking и т.д.)

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

// Добавление услуг к бронированию
export const addServicesToBooking = async (bookingId, servicesCart) => {
  const { error } = await supabase.rpc('add_services_to_booking', {
    booking_id_arg: bookingId,
    services_data: servicesCart
  });

  if (error) {
    console.error('Ошибка при добавлении услуг:', error);
    throw error;
  }
  return true;
};
// Вставьте этот код в Supabase.jsx

// Получение бронирований для конкретного диапазона дат
export const getBookingsForRange = async (startDate, endDate) => {
  // Форматируем даты в строку YYYY-MM-DD для запроса
  const start = format(startDate, 'yyyy-MM-dd');
  const end = format(endDate, 'yyyy-MM-dd');

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
  );
};
// Удаление услуги из бронирования
export const removeServiceFromBooking = async (bookingServiceId) => {
  return handleSupabaseQuery(
    supabase
      .from('booking_services')
      .delete()
      .eq('id', bookingServiceId)
  );
};