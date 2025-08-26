import { supabase } from '@/lib/supabase';

class ChannexService {
  constructor() {
    this.baseURL = import.meta.env.VITE_CHANNEX_API_URL || 'https://api.channex.io/api/v1';
    this.apiKey = import.meta.env.VITE_CHANNEX_API_KEY;
    this.propertyId = import.meta.env.VITE_CHANNEX_PROPERTY_ID;
    
    // Определяем режим работы: если нет API ключа - MOCK режим
    // ВАЖНО: API ключ из .env валидный, не сравниваем его с "тестовым"
    this.useMockData = !this.apiKey || this.apiKey === '' || this.apiKey === 'your-api-key-here';
    
    // Для production - используем HTTPS API endpoint
    if (!this.useMockData && this.baseURL.includes('staging')) {
      this.baseURL = 'https://api.channex.io/api/v1';
      console.log('🚀 Переключились на production API: https://api.channex.io/api/v1');
    }
    
    if (this.useMockData) {
      console.log('🎭 Channex работает в режиме MOCK данных');
      console.log('📝 Для production установите VITE_CHANNEX_API_KEY в .env.local');
    } else {
      console.log('✅ Channex работает в режиме PRODUCTION');
      console.log(`🏨 Property ID: ${this.propertyId}`);
      console.log(`🔗 API URL: ${this.baseURL}`);
    }
  }

// Синхронизировать бронирование из Channex в PMS
async syncBookingToPMS(channexBooking) {
  console.log('📥 Синхронизация бронирования из Channex в PMS:', channexBooking.id);
  
  // Маппим данные из Channex в формат вашей БД
  const pmsBooking = this.mapChannexToPMSBooking(channexBooking);
  
  // Проверяем, существует ли уже это бронирование
  const { data: existingBooking } = await supabase
    .from('bookings')
    .select('id')
    .eq('external_booking_id', channexBooking.id)
    .single();

  if (existingBooking) {
    // Обновляем существующее
    const { data, error } = await supabase
      .from('bookings')
      .update(pmsBooking)
      .eq('id', existingBooking.id)
      .select()
      .single();
      
    return { data, error, action: 'updated' };
  } else {
    // Создаем новое
    const { data, error } = await supabase
      .from('bookings')
      .insert(pmsBooking)
      .select()
      .single();
      
    return { data, error, action: 'created' };
  }
}

// Маппинг бронирования из Channex в формат PMS
mapChannexToPMSBooking(channexBooking) {
  return {
    external_booking_id: channexBooking.id,
    source: this.getBookingSource(channexBooking.ota_name),
    check_in: channexBooking.arrival_date,
    check_out: channexBooking.departure_date,
    guest_details: channexBooking.customer?.name || 'Guest', // Используем guest_details вместо guest_name
    total_amount: channexBooking.total_price || 0,
    status: this.mapBookingStatus(channexBooking.status),
    guests_count: (channexBooking.occupancy?.adults || 0) + (channexBooking.occupancy?.children || 0),
    notes: channexBooking.notes || '',
    channex_data: channexBooking // Сохраняем оригинальные данные
  };
}

// Вспомогательные методы для маппинга
getBookingSource(otaName) {
  const mapping = {
    'Booking.com': 'booking',
    'Airbnb': 'airbnb',
    'Expedia': 'expedia',
    'Direct': 'direct'
  };
  return mapping[otaName] || 'other';
}

mapBookingStatus(channexStatus) {
  const mapping = {
    'new': 'pending',
    'confirmed': 'confirmed',
    'cancelled': 'cancelled',
    'modified': 'confirmed'
  };
  return mapping[channexStatus] || 'pending';
}

getRoomKind(roomType) {
  // ВАЖНО: Channex API принимает только 'room' или 'dorm'
  // Все типы комнат маппим на 'room', кроме общих спальных мест (hostel)
  
  const mapping = {
    'single': 'room',
    'double': 'room', 
    'suite': 'room',        // ← ИСПРАВЛЕНО: было 'suite', стало 'room'
    'apartment': 'room',    // ← ИСПРАВЛЕНО: было 'apartment', стало 'room'
    'standard': 'room',
    'deluxe': 'room',
    'family': 'room',
    'luxe': 'room',         // ← ИСПРАВЛЕНО: было 'suite', стало 'room'
    'premium': 'room',
    'dorm': 'dorm',         // Только для хостелов
    'hostel': 'dorm'
  };
  
  const result = mapping[roomType?.toLowerCase()] || 'room';
  
  console.log(`🔧 Маппинг типа комнаты: "${roomType}" → "${result}"`);
  
  // Двойная проверка - всегда возвращаем только допустимые значения
  if (result !== 'room' && result !== 'dorm') {
    console.warn('⚠️ Недопустимый room_kind, используем "room"');
    return 'room';
  }
  
  return result;
}
  // --- ОСНОВНЫЕ МЕТОДЫ ---

  mockDelay() {
    return new Promise(resolve => setTimeout(resolve, 500));
  }

  async apiRequest(endpoint, options = {}) {
  if (this.useMockData) {
    console.log('🎭 Mock режим - возвращаем тестовые данные для:', endpoint);
    return this.getMockResponse(endpoint, options);
  }

  const url = `${this.baseURL}${endpoint}`;
  
  console.log(`🌐 API запрос: ${options.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'user-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    console.log(`📡 Ответ API: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
        console.error('📄 Полный ответ ошибки:', errorText);
        
        // Пытаемся парсить JSON ошибку
        let errorData;
        try {
          errorData = JSON.parse(errorText);
          console.error('🔍 Детали ошибки:', errorData);
        } catch (jsonError) {
          // Если это не JSON, создаем структуру ошибки
          console.warn('⚠️ Ответ не в JSON формате, создаем структуру ошибки');
          errorData = {
            errors: {
              code: 'api_error',
              title: `HTTP ${response.status}`,
              details: { message: errorText }
            }
          };
        }
        
        // Формируем подробное сообщение ошибки
        let detailedError = `${response.status} ${response.statusText}`;
        
        if (errorData.errors) {
          if (errorData.errors.details) {
            const details = Object.entries(errorData.errors.details)
              .map(([field, errors]) => {
                if (Array.isArray(errors)) {
                  return `${field}: ${errors.join(', ')}`;
                } else {
                  return `${field}: ${errors}`;
                }
              })
              .join('; ');
            detailedError += ` - ${details}`;
          } else if (errorData.errors.title) {
            detailedError += ` - ${errorData.errors.title}`;
          }
        }
        
        throw new Error(`Channex API Error: ${detailedError}`);
        
      } catch (parseError) {
        // Если произошла ошибка при чтении ответа
        if (parseError.message.includes('Channex API Error:')) {
          throw parseError; // Это наша ошибка, передаем дальше
        } else {
          console.error('Ошибка обработки ответа:', parseError);
          throw new Error(`Channex API Error: ${response.status} ${response.statusText}`);
        }
      }
    }

    const data = await response.json();
    console.log('📊 Данные от API:', data);
    return data;
    
  } catch (error) {
    console.error('Channex API Request Error:', error);
    throw error;
  }
}

// УЛУЧШЕННЫЙ метод createRoomType
async createRoomType(roomData) {
    console.log('🏠 Создаем тип комнаты в Channex:', roomData);
  
  // Очищаем название комнаты
  const cleanTitle = this.cleanRoomTitle(roomData.room_number || roomData.name);
  
  const channexRoomData = {
    room_type: {
      title: cleanTitle,
      room_kind: this.getRoomKind(roomData.room_type || 'room'),
      occ_adults: Math.min(roomData.capacity || 2, 8), // Максимум 8
      occ_children: 0,
      occ_infants: 0,
      default_occupancy: Math.min(roomData.capacity || 2, 8),
      count_of_rooms: 1,
      property_id: this.propertyId,
      facilities: []
    }
  };
  
  console.log('📤 Отправляем room_type в Channex:', channexRoomData);
  
  return this.apiRequest('/room_types', {
    method: 'POST',
    body: JSON.stringify(channexRoomData)
  });
}

// Функция для очистки названия комнаты
cleanRoomTitle(title) {
  if (!title) return 'Room';
  
  // Транслитерация русских символов
  const translitMap = {
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E',
    'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch',
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  
  // Транслитерируем русские символы
  let cleaned = title.split('').map(char => translitMap[char] || char).join('');
  
  // Убираем специальные символы, оставляем только буквы, цифры, пробелы и дефисы
  cleaned = cleaned.replace(/[^a-zA-Z0-9\s\-]/g, '');
  
  // Ограничиваем длину до 50 символов
  cleaned = cleaned.substring(0, 50);
  
  // Убираем лишние пробелы
  cleaned = cleaned.trim().replace(/\s+/g, ' ');
  
  console.log(`🧹 Очистка названия: "${title}" → "${cleaned}"`);
  
  return cleaned || 'Room';
}

// Также добавьте метод для получения room types (если его нет):
async getRoomTypes(propertyId = null) {
  const propId = propertyId || this.propertyId;
  console.log('🏠 Получаем типы комнат для property:', propId);
  
  // ПРАВИЛЬНЫЙ endpoint с фильтром
  return this.apiRequest(`/room_types?filter[property_id]=${propId}`);
}

async createRatePlan(roomTypeId, rateData) {
  console.log('💰 Создаем тарифный план в Channex:', rateData);
  console.log('🏠 Для room type ID:', roomTypeId);
  
  // Правильный формат данных для Channex API
  const channexRateData = {
    rate_plan: {
      title: rateData.name || 'Standard Rate',
      room_type_id: roomTypeId,
      currency: 'USD',
      sell_mode: 'per_room', // per_room или per_person
      rate_mode: 'manual', // Manual - цена указывается в options.rate
      property_id: this.propertyId, // ВАЖНО: добавляем property_id
      
      // ОБЯЗАТЕЛЬНОЕ поле options с occupancy options
      options: [
        {
          occupancy: 2, // Максимальная вместимость для per_room тарифа
          is_primary: true, // Основная опция
          rate: parseFloat(rateData.price || 5000) // Цена в рублях
        }
      ],
      
      // Настройки по умолчанию
      children_fee: 0,
      infant_fee: 0,
      min_stay_arrival: 1,
      min_stay_through: 1,
      max_stay: 365,
      closed_to_arrival: false,
      closed_to_departure: false,
      stop_sell: false
    }
  };
  
  console.log('📤 Отправляем rate_plan в Channex:', channexRateData);
  
  // ПРАВИЛЬНЫЙ endpoint - просто /rate_plans (без property в пути)
  const endpoint = `/rate_plans`;
  console.log('🌐 Endpoint:', endpoint);
  
  return this.apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(channexRateData)
  });
}

// Также добавьте метод для получения rate plans:
async getRatePlans(propertyId = null) {
  const propId = propertyId || this.propertyId;
  console.log('💰 Получаем тарифные планы для property:', propId);
  
  // Правильный endpoint с фильтром
  return this.apiRequest(`/rate_plans?filter[property_id]=${propId}`);
}
// Обновление валюты property
async updatePropertyCurrency(newCurrency = 'USD') {
  console.log('🏨 Обновляем валюту property на:', newCurrency);
  
  const updateData = {
    property: {
      currency: newCurrency
    }
  };
  
  return this.apiRequest(`/properties/${this.propertyId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });
}

// Удаление rate plan
async deleteRatePlan(ratePlanId) {
  console.log('🗑️ Удаляем rate plan:', ratePlanId);
  
  return this.apiRequest(`/rate_plans/${ratePlanId}`, {
    method: 'DELETE'
  });
}
// Метод для установки цен (Availability & Rates API)
async setRates(ratePlanId, dateFrom, dateTo, rates) {
  console.log('💵 Устанавливаем цены для rate plan:', ratePlanId);
  console.log('📅 Период:', dateFrom, 'до', dateTo);
  console.log('💰 Цены:', rates);
  
  // Правильный формат для Channex Restrictions API
  const ratesData = {
    values: [
      {
        property_id: this.propertyId,
        rate_plan_id: ratePlanId,
        date_from: dateFrom,
        date_to: dateTo,
        // Конвертируем цену в центы для USD (150.00 -> 15000)
        rate: Math.round(rates[0].rate * 100) // Channex требует цену в центах
      }
    ]
  };
  
  console.log('📤 Отправляем цены в Channex:', ratesData);
  
  // ПРАВИЛЬНЫЙ endpoint: /restrictions, НЕ /rates
  return this.apiRequest('/restrictions', {
    method: 'POST',
    body: JSON.stringify(ratesData)
  });
}

// Метод для установки availability
async setAvailability(roomTypeId, dateFrom, dateTo, availability) {
  console.log('🏠 Устанавливаем availability для room type:', roomTypeId);
  
  const availabilityData = {
    values: [
      {
        property_id: this.propertyId,
        room_type_id: roomTypeId,
        date_from: dateFrom,
        date_to: dateTo,
        availability: availability
      }
    ]
  };
  
  return this.apiRequest('/availability', {
    method: 'POST',
    body: JSON.stringify(availabilityData)
  });
}

// Метод для обновления валюты существующих rate plans
async updateRatePlanCurrency(ratePlanId, newCurrency = 'USD') {
  console.log('💱 Обновляем валюту rate plan:', ratePlanId, 'на', newCurrency);
  
  const updateData = {
    rate_plan: {
      currency: newCurrency
    }
  };
  
  return this.apiRequest(`/rate_plans/${ratePlanId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });
}

// Новый метод для создания вебхука
async createWebhook() {
  console.log('🔔 Создаем webhook для real-time уведомлений');
  
  const webhookData = {
    webhook: {
      url: `${window.location.origin}/api/channex/webhook`,
      event: 'booking', // Уведомления о бронированиях
      active: true,
      headers: {
        'Authorization': 'Bearer your-webhook-secret'
      }
    }
  };
  
  return this.apiRequest(`/properties/${this.propertyId}/webhooks`, {
    method: 'POST',
    body: JSON.stringify(webhookData)
  });
}

// Метод для полной настройки property
async setupProperty() {
  console.log('🏨 Настраиваем отель в Channex...');
  
  try {
    // 1. Получаем данные отеля из вашей БД
    const { data: hotelData } = await supabase
      .from('hotel_settings')
      .select('*')
      .single();
    
    if (!hotelData) {
      throw new Error('Данные отеля не найдены в БД');
    }
    
    // 2. Обновляем property в Channex
    const propertyUpdate = {
      property: {
        title: hotelData.name,
        timezone: 'Europe/Moscow',
        currency: 'RUB',
        email: hotelData.email,
        phone: hotelData.phone
      }
    };
    
    await this.apiRequest(`/properties/${this.propertyId}`, {
      method: 'PUT',
      body: JSON.stringify(propertyUpdate)
    });
    
    // 3. Создаем типы комнат
    const { data: rooms } = await supabase
      .from('rooms')
      .select('*');
    
    if (rooms) {
      for (const room of rooms) {
        try {
          const roomType = await this.createRoomType(room);
          
          // Создаем базовый rate plan для каждой комнаты
          await this.createRatePlan(roomType.data.id, {
            name: `${room.name || room.room_number} - Standard Rate`,
            price: room.price_per_night
          });
          
          console.log(`✅ Комната ${room.name} настроена в Channex`);
          
        } catch (error) {
          console.error(`❌ Ошибка настройки комнаты ${room.name}:`, error);
        }
      }
    }
    
    // 4. Создаем webhook
    try {
      await this.createWebhook();
      console.log('✅ Webhook создан');
    } catch (error) {
      console.error('❌ Ошибка создания webhook:', error);
    }
    
    return { success: true, message: 'Отель настроен в Channex' };
    
  } catch (error) {
    console.error('Ошибка настройки property:', error);
    throw error;
  }
}

  // --- PROPERTIES ---
  async getProperties() { return this.apiRequest('/properties'); }
  async getProperty(propertyId) { return this.apiRequest(`/properties/${propertyId}`); }
  async createProperty(propertyData) {
    return this.apiRequest('/properties', {
      method: 'POST',
      body: JSON.stringify(propertyData),
    });
  }
  async updateProperty(propertyId, propertyData) {
  console.log('🏨 Обновляем property в Channex:', propertyId, propertyData);
  
  // ПРАВИЛЬНЫЙ плоский формат для Channex API (без вложенного address объекта)
  const channexData = {
    property: {
      title: propertyData.name || propertyData.title,
      timezone: 'Europe/Moscow',
      currency: 'RUB',
      email: propertyData.email,
      phone: propertyData.phone,
      // Плоские поля адреса (НЕ вложенные!)
      country: 'RU',
      state: propertyData.state || 'Moscow',
      city: propertyData.city || 'Moscow', 
      address: propertyData.address,
      zip_code: propertyData.zip || '101000'
    }
  };
  
  console.log('📤 Отправляем в Channex API (правильный формат):', channexData);
  
  return this.apiRequest(`/properties/${propertyId}`, {
    method: 'PUT',
    body: JSON.stringify(channexData)
  });
}
  
   // --- ROOMS ---
  async getRooms(propertyId) { return this.apiRequest(`/properties/${propertyId}/room_types`); }
  async syncRooms() {
    console.log('🔄 Синхронизация комнат с Channex...');
    if (this.useMockData) {
      const scenarios = [{ synced: 5, errors: 0 }, { synced: 3, errors: 2 }];
      const result = scenarios[Math.floor(Math.random() * scenarios.length)];
      console.log('🎭 Mock результат синхронизации:', result);
      return { success: true, ...result };
    }
    // ... реальная логика ...
    return { success: true, synced: 0, errors: 0 };
  }
  
  // --- BOOKINGS ---
  async getBookings(params = {}) { return this.apiRequest('/bookings', { params }); }
  async getBooking(bookingId) { return this.apiRequest(`/bookings/${bookingId}`); }
  async confirmBooking(bookingId) { return this.apiRequest(`/bookings/${bookingId}/confirm`, { method: 'POST' }); }
  async cancelBooking(bookingId, reason = '') {
    return this.apiRequest(`/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }
  
  // ... Другие методы API ...
  
  // --- MOCK DATA (раздел с моковыми данными) ---

  getMockResponse(endpoint) {
    console.log('🎭 Mock режим - возвращаем тестовые данные для:', endpoint);
    if (endpoint.includes('/properties')) return this.getMockProperties();
    if (endpoint.includes('/bookings')) return this.getMockBookings();
    if (endpoint.includes('/room_types')) return this.getMockRooms(); // Этот вызов теперь корректен
    return { data: [] };
  }

  getMockProperties() {
    return {
      data: [{ id: 'prop-1', title: 'Voda Hotel', status: 'active' }],
    };
  }

  getMockBookings() {
    return {
      data: [
        /* ... моковые данные бронирований ... */
      ],
    };
  }
  
  // ИСПРАВЛЕНИЕ: Эта функция теперь находится внутри класса
  getMockRooms() {
    return {
      data: [{
        id: 'room-type-1',
        title: 'Standard Double Room',
        room_kind: 'room',
        capacity: 2,
        base_rate: 5000,
        currency: 'RUB'
      }, {
        id: 'room-type-2',
        title: 'Deluxe Suite',
        room_kind: 'suite',
        capacity: 4,
        base_rate: 10000,
        currency: 'RUB'
      }]
    };
  }

  // ========================
  // СИНХРОНИЗАЦИЯ БРОНИРОВАНИЙ В CHANNEX
  // ========================

  /**
   * Отправка нового бронирования В Channex
   */
  async createBookingInChannex(pmsBooking) {
    console.log('📤 Отправляем бронирование В Channex:', pmsBooking);
    
    try {
      // Маппим данные из PMS в формат Channex
      const channexBooking = this.mapPMSToChannexBooking(pmsBooking);
      console.log('🔄 Данные для Channex:', channexBooking);
      
      // Отправляем через booking_revisions API
      const response = await this.apiRequest('/booking_revisions', {
        method: 'POST',
        body: JSON.stringify({ booking_revision: channexBooking })
      });
      
      if (response?.data) {
        console.log('✅ Бронирование создано в Channex:', response.data.id);
        
        // Сохраняем external_booking_id в нашу БД
        await supabase
          .from('bookings')
          .update({ 
            external_booking_id: response.data.id,
            channex_data: response.data 
          })
          .eq('id', pmsBooking.id);
          
        return response.data;
      }
      
      throw new Error('Нет данных в ответе от Channex');
      
    } catch (error) {
      console.error('❌ Ошибка отправки бронирования в Channex:', error);
      throw error;
    }
  }

  /**
   * Обновление бронирования в Channex
   */
  async updateBookingInChannex(pmsBooking) {
    if (!pmsBooking.external_booking_id) {
      throw new Error('Нет external_booking_id для обновления в Channex');
    }
    
    console.log('📝 Обновляем бронирование в Channex:', pmsBooking.external_booking_id);
    
    try {
      const channexBooking = this.mapPMSToChannexBooking(pmsBooking);
      
      const response = await this.apiRequest(`/booking_revisions/${pmsBooking.external_booking_id}`, {
        method: 'PUT',
        body: JSON.stringify({ booking_revision: channexBooking })
      });
      
      if (response?.data) {
        console.log('✅ Бронирование обновлено в Channex');
        
        // Обновляем channex_data в БД
        await supabase
          .from('bookings')
          .update({ channex_data: response.data })
          .eq('id', pmsBooking.id);
          
        return response.data;
      }
      
    } catch (error) {
      console.error('❌ Ошибка обновления бронирования в Channex:', error);
      throw error;
    }
  }

  /**
   * Отмена бронирования в Channex
   */
  async cancelBookingInChannex(pmsBooking) {
    if (!pmsBooking.external_booking_id) {
      throw new Error('Нет external_booking_id для отмены в Channex');
    }
    
    console.log('❌ Отменяем бронирование в Channex:', pmsBooking.external_booking_id);
    
    try {
      const response = await this.apiRequest(`/booking_revisions/${pmsBooking.external_booking_id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          booking_revision: { status: 'cancelled' } 
        })
      });
      
      if (response) {
        console.log('✅ Бронирование отменено в Channex');
        
        await supabase
          .from('bookings')
          .update({ 
            status: 'cancelled',
            channex_data: response.data 
          })
          .eq('id', pmsBooking.id);
          
        return response.data;
      }
      
    } catch (error) {
      console.error('❌ Ошибка отмены бронирования в Channex:', error);
      throw error;
    }
  }

  /**
   * Маппинг данных из PMS в формат Channex
   */
  mapPMSToChannexBooking(pmsBooking) {
    return {
      // Основная информация
      arrival_date: pmsBooking.check_in,
      departure_date: pmsBooking.check_out,
      status: this.mapPMSStatusToChannex(pmsBooking.status),
      
      // Информация о госте
      customer: {
        name: pmsBooking.guests?.full_name || pmsBooking.guest_details || 'Guest',
        email: pmsBooking.guests?.email || '',
        phone: pmsBooking.guests?.phone || ''
      },
      
      // Финансы
      total_price: parseFloat(pmsBooking.total_amount || 0),
      currency: 'RUB',
      
      // Размещение
      occupancy: {
        adults: pmsBooking.guests_count || 1,
        children: 0,
        infants: 0
      },
      
      // Дополнительно
      notes: pmsBooking.notes || '',
      
      // Комната (если есть)
      room_type_id: pmsBooking.room_type || null,
      
      // Источник
      ota_name: 'Direct'
    };
  }

  /**
   * Маппинг статусов из PMS в Channex
   */
  mapPMSStatusToChannex(pmsStatus) {
    const mapping = {
      'pending': 'new',
      'confirmed': 'confirmed', 
      'checked_in': 'confirmed',
      'checked_out': 'confirmed',
      'cancelled': 'cancelled'
    };
    
    return mapping[pmsStatus] || 'new';
  }

  /**
   * Синхронизация ВСЕХ бронирований из PMS в Channex
   */
  async syncAllBookingsToChannex() {
    console.log('🔄 Синхронизируем все бронирования В Channex...');
    
    try {
      // Получаем все активные бронирования без external_booking_id
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          guests (*),
          rooms (*)
        `)
        .is('external_booking_id', null)
        .in('status', ['pending', 'confirmed', 'checked_in']);
        
      if (error) throw error;
      
      let synced = 0;
      let failed = 0;
      
      for (const booking of bookings || []) {
        try {
          await this.createBookingInChannex(booking);
          synced++;
        } catch (error) {
          console.error(`❌ Не удалось синхронизировать бронирование ${booking.id}:`, error);
          failed++;
        }
      }
      
      console.log(`✅ Синхронизация завершена: ${synced} успешно, ${failed} ошибок`);
      return { synced, failed, total: bookings?.length || 0 };
      
    } catch (error) {
      console.error('❌ Ошибка массовой синхронизации:', error);
      throw error;
    }
  }
}

// Создаем и экспортируем единственный экземпляр
const channexService = new ChannexService();
export default channexService;