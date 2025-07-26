
import { supabaseHandler } from '@/api/functions';

// Клиент для взаимодействия с нашим Supabase API
class SupabaseClient {
  /**
   * Инициализирует SupabaseClient.
   * @param {string} [baseUrl=''] - Базовый URL для запросов API.
   *   По умолчанию используется пустая строка,
   *   что позволяет использовать относительные пути для запросов к тому же источнику (например, к API-маршрутам Next.js).
   */
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Отправляет запрос через supabaseHandler.
   * @param {string} endpoint - Конечная точка API.
   * @param {object} options - Опции запроса (метод, тело и т.д.).
   * @returns {Promise<any>} - Результат запроса в формате JSON.
   * @throws {Error} - Если запрос не удался.
   */
  async request(endpoint, options = {}) {
    try {
      const response = await supabaseHandler({
        url: `${this.baseUrl}${endpoint}`,
        method: options.method || 'GET',
        ...options
      });

      if (!response.ok) {
        // Попытка получить сообщение об ошибке из тела ответа, если доступно
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorMessage += ` - ${errorData.message}`;
          }
        } catch (jsonError) {
          // Игнорируем ошибки при парсинге JSON, если тело не JSON
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Supabase request error:', error);
      throw error;
    }
  }

  // Authentication functions
  /**
   * Вход пользователя в систему.
   * @param {string} email - Email пользователя.
   * @param {string} password - Пароль пользователя.
   * @returns {Promise<{data: any | null, error: {message: string} | null}>}
   */
  signIn = async (email, password) => {
    try {
      const response = await this.request('/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      return { data: response, error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  };

  /**
   * Регистрация нового пользователя.
   * @param {string} email - Email пользователя.
   * @param {string} password - Пароль пользователя.
   * @returns {Promise<{data: any | null, error: {message: string} | null}>}
   */
  signUp = async (email, password) => {
    try {
      const response = await this.request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      return { data: response, error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  };

  /**
   * Выход пользователя из системы.
   * @returns {Promise<{error: {message: string} | null}>}
   */
  signOut = async () => {
    try {
      await this.request('/auth/signout', { method: 'POST' });
      return { error: null };
    } catch (error) {
      return { error: { message: error.message } };
    }
  };

  /**
   * Получение информации о текущем пользователе.
   * @returns {Promise<any | null>} - Объект пользователя или null, если не авторизован.
   */
  getCurrentUser = async () => {
    try {
      const response = await this.request('/auth/user');
      return response.user;
    } catch (error) {
      return null;
    }
  };

  // Database functions
  /**
   * Получение списка бронирований.
   * @returns {Promise<{data: any[] | null, error: {message: string} | null}>}
   */
  getBookings = async () => {
    try {
      const response = await this.request('/bookings');
      return { data: response.bookings, error: null };
    } catch (error) {
      return { data: [], error: { message: error.message } };
    }
  };

  /**
   * Создание нового бронирования.
   * @param {object} booking - Объект бронирования.
   * @returns {Promise<{data: any[] | null, error: {message: string} | null}>}
   */
  createBooking = async (booking) => {
    try {
      const response = await this.request('/bookings', {
        method: 'POST',
        body: JSON.stringify(booking)
      });
      return { data: [response.booking], error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  };

  /**
   * Обновление существующего бронирования.
   * @param {string | number} id - ID бронирования.
   * @param {object} updates - Объект с обновляемыми полями.
   * @returns {Promise<{data: any[] | null, error: {message: string} | null}>}
   */
  updateBooking = async (id, updates) => {
    try {
      const response = await this.request(`/bookings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return { data: [response.booking], error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  };

  /**
   * Получение списка комнат.
   * @returns {Promise<{data: any[] | null, error: {message: string} | null}>}
   */
  getRooms = async () => {
    try {
      const response = await this.request('/rooms');
      return { data: response.rooms, error: null };
    } catch (error) {
      return { data: [], error: { message: error.message } };
    }
  };

  /**
   * Создание новой комнаты.
   * @param {object} room - Объект комнаты.
   * @returns {Promise<{data: any[] | null, error: {message: string} | null}>}
   */
  createRoom = async (room) => {
    try {
      const response = await this.request('/rooms', {
        method: 'POST',
        body: JSON.stringify(room)
      });
      return { data: [response.room], error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  };

  /**
   * Получение списка гостей.
   * @returns {Promise<{data: any[] | null, error: {message: string} | null}>}
   */
  getGuests = async () => {
    try {
      const response = await this.request('/guests');
      return { data: response.guests, error: null };
    } catch (error) {
      return { data: [], error: { message: error.message } };
    }
  };

  /**
   * Создание нового гостя.
   * @param {object} guest - Объект гостя.
   * @returns {Promise<{data: any[] | null, error: {message: string} | null}>}
   */
  createGuest = async (guest) => {
    try {
      const response = await this.request('/guests', {
        method: 'POST',
        body: JSON.stringify(guest)
      });
      return { data: [response.guest], error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  };

  /**
   * Обновление информации о госте.
   * @param {string | number} id - ID гостя.
   * @param {object} updates - Объект с обновляемыми полями.
   * @returns {Promise<{data: any[] | null, error: {message: string} | null}>}
   */
  updateGuest = async (id, updates) => {
    try {
      const response = await this.request(`/guests/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return { data: [response.guest], error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  };

  /**
   * Получение сообщений чата персонала.
   * @returns {Promise<{data: any[] | null, error: {message: string} | null}>}
   */
  getStaffChat = async () => {
    try {
      const response = await this.request('/staff-chat');
      return { data: response.messages, error: null };
    } catch (error) {
      return { data: [], error: { message: error.message } };
    }
  };

  /**
   * Отправка сообщения в чат персонала.
   * @param {object} message - Объект сообщения.
   * @returns {Promise<{data: any[] | null, error: {message: string} | null}>}
   */
  sendStaffMessage = async (message) => {
    try {
      const response = await this.request('/staff-chat', {
        method: 'POST',
        body: JSON.stringify(message)
      });
      return { data: [response.message], error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  };

  /**
   * Получение списка жалоб.
   * @returns {Promise<{data: any[] | null, error: {message: string} | null}>}
   */
  getComplaints = async () => {
    try {
      const response = await this.request('/complaints');
      return { data: response.complaints, error: null };
    } catch (error) {
      return { data: [], error: { message: error.message } };
    }
  };

  /**
   * Создание новой жалобы.
   * @param {object} complaint - Объект жалобы.
   * @returns {Promise<{data: any[] | null, error: {message: string} | null}>}
   */
  createComplaint = async (complaint) => {
    try {
      const response = await this.request('/complaints', {
        method: 'POST',
        body: JSON.stringify(complaint)
      });
      return { data: [response.complaint], error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  };

  /**
   * Получение списка платежей.
   * @returns {Promise<{data: any[] | null, error: {message: string} | null}>}
   */
  getPayments = async () => {
    try {
      const response = await this.request('/payments');
      return { data: response.payments, error: null };
    } catch (error) {
      return { data: [], error: { message: error.message } };
    }
  };

  /**
   * Создание нового платежа.
   * @param {object} payment - Объект платежа.
   * @returns {Promise<{data: any[] | null, error: {message: string} | null}>}
   */
  createPayment = async (payment) => {
    try {
      const response = await this.request('/payments', {
        method: 'POST',
        body: JSON.stringify(payment)
      });
      return { data: [response.payment], error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  };
}

export const supabaseClient = new SupabaseClient();

// Экспорт функций для совместимости.
// Методы класса определены как стрелочные функции-свойства,
// чтобы корректно сохранять контекст `this` при деструктуризации.
export const {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  getBookings,
  createBooking,
  updateBooking,
  getRooms,
  createRoom,
  getGuests,
  createGuest,
  updateGuest,
  getStaffChat,
  sendStaffMessage,
  getComplaints,
  createComplaint,
  getPayments,
  createPayment
} = supabaseClient;
