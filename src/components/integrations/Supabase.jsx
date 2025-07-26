import { supabase } from '@/lib/supabase'; // Импортируем наш настоящий клиент Supabase

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
export const createBooking = async (payload) => {
  return handleSupabaseQuery(
    supabase
      .from('bookings')
      .insert(payload)
      .select() // .select() возвращает созданную запись
  );
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

// Добавление услуг к бронированию
export const addServicesToBooking = async (services) => {
  // services должен быть массивом объектов, например [{ booking_id: ..., service_id: ... }]
  return handleSupabaseQuery(
    supabase
      .from('booking_services')
      .insert(services)
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