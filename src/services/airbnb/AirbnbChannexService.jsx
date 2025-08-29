import { supabase, supabaseAdmin } from '@/lib/supabase';
import airbnbMapping from '@/config/airbnb-mapping.json';

class AirbnbChannexService {
  constructor() {
    this.baseURL = import.meta.env.VITE_CHANNEX_API_URL || 'https://staging.channex.io/api/v1';
    this.apiKey = import.meta.env.VITE_CHANNEX_API_KEY;
    this.propertyId = import.meta.env.VITE_CHANNEX_PROPERTY_ID;
    this.airbnbConfig = airbnbMapping.airbnb_integration;
    
    console.log('🏠 AirbnbChannexService инициализирован');
    console.log(`📍 Property ID: ${this.propertyId}`);
    
    // Получаем названия всех Airbnb комнат из конфига
    const roomTitles = Object.values(this.airbnbConfig.room_mapping).map(room => room.airbnb_room_title);
    console.log(`🌏 Airbnb комнаты: ${roomTitles.join(', ')}`);
  }

  /**
   * API запрос к Channex
   */
  async apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${this.baseURL}${endpoint}`;
    console.log(`🌐 Airbnb API запрос: ${method} ${url}`);

    try {
      const options = {
        method,
        headers: {
          'user-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      };

      if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      const responseText = await response.text();

      if (!response.ok) {
        console.error('❌ Airbnb API ошибка:', responseText);
        throw new Error(`API Error: ${response.status}`);
      }

      return responseText ? JSON.parse(responseText) : { success: true };
    } catch (error) {
      console.error('💥 Airbnb API Request Error:', error);
      throw error;
    }
  }

  /**
   * Получить маппинг комнаты по типу
   */
  getRoomMapping(roomType) {
    const mapping = this.airbnbConfig.room_mapping[roomType];
    if (!mapping) {
      throw new Error(`Неизвестный тип комнаты для Airbnb: ${roomType}`);
    }
    return mapping;
  }

  /**
   * Преобразовать PMS бронирование в формат Channex для Airbnb
   */
  convertToChannexFormat(pmsBooking) {
    console.log('🔄 Конвертация PMS → Channex (Airbnb)');
    
    const roomMapping = this.getRoomMapping(pmsBooking.room_type || 'standard_apartment');
    
    // Вычисляем стоимость по дням
    const checkIn = new Date(pmsBooking.check_in);
    const checkOut = new Date(pmsBooking.check_out);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    const days = {};
    for (let i = 0; i < nights; i++) {
      const currentDate = new Date(checkIn);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      days[dateStr] = roomMapping.base_price;
    }

    const channexBooking = {
      booking: {
        property_id: this.propertyId,
        ota_reservation_code: `AIRBNB-${pmsBooking.id || Date.now()}`,
        ota_name: 'Airbnb',
        arrival_date: pmsBooking.check_in,
        departure_date: pmsBooking.check_out,
        currency: this.airbnbConfig.base_currency,
        arrival_hour: this.airbnbConfig.airbnb_settings.check_in_time,
        
        customer: {
          name: pmsBooking.guest_first_name || 'Guest',
          surname: pmsBooking.guest_last_name || 'User',
          mail: pmsBooking.guest_email || 'guest@airbnb.com',
          phone: pmsBooking.guest_phone || '+1234567890',
          country: 'US',
          language: 'en'
        },
        
        rooms: [{
          room_type_id: roomMapping.channex_room_type_id,
          rate_plan_id: roomMapping.channex_rate_plan_id,
          days: days,
          occupancy: {
            adults: pmsBooking.adults || 2,
            children: pmsBooking.children || 0,
            infants: 0
          },
          guests: [{
            name: pmsBooking.guest_first_name || 'Guest',
            surname: pmsBooking.guest_last_name || 'User'
          }]
        }],
        
        services: [],
        notes: `Airbnb бронирование - ${roomMapping.airbnb_room_title}`,
        
        meta: {
          source: 'Airbnb',
          airbnb_room_title: roomMapping.airbnb_room_title,
          pms_room_number: roomMapping.pms_room_number,
          test: pmsBooking.test || false
        }
      }
    };

    console.log('✅ Конвертация завершена:', {
      room: roomMapping.airbnb_room_title,
      guest: `${pmsBooking.guest_first_name} ${pmsBooking.guest_last_name}`,
      dates: `${pmsBooking.check_in} - ${pmsBooking.check_out}`,
      total: `$${parseInt(roomMapping.base_price) * nights}`
    });

    return channexBooking;
  }

  /**
   * Получить room_id по номеру комнаты из PMS
   */
  async getRoomIdByNumber(roomNumber) {
    console.log('🏠 Ищем room_id для номера:', roomNumber);
    
    try {
      // Сначала пробуем найти по точному совпадению room_number
      const { data: exactMatch, error: exactError } = await supabase
        .from('rooms')
        .select('id, room_number, room_type')
        .eq('room_number', roomNumber)
        .single();
      
      if (!exactError && exactMatch) {
        console.log('✅ Найдено точное совпадение:', exactMatch.room_number, 'ID:', exactMatch.id);
        return exactMatch.id;
      }
      
      // Если roomNumber это "Standard Room", "Deluxe Room" или "Suite"
      // Ищем по room_type
      let roomType = null;
      if (roomNumber === 'Standard Room') {
        roomType = 'Standard';
      } else if (roomNumber === 'Deluxe Room') {
        roomType = 'Deluxe';
      } else if (roomNumber === 'Suite') {
        roomType = 'Suite';
      }
      
      if (roomType) {
        const { data: typeMatch, error: typeError } = await supabase
          .from('rooms')
          .select('id, room_number, room_type')
          .eq('room_type', roomType)
          .single();
        
        if (!typeError && typeMatch) {
          console.log('✅ Найдено по типу:', typeMatch.room_type, 'Номер:', typeMatch.room_number, 'ID:', typeMatch.id);
          return typeMatch.id;
        }
      }
      
      console.log('❌ Комната не найдена для:', roomNumber);
      return null;
    } catch (error) {
      console.error('❌ Ошибка поиска комнаты:', error);
      return null;
    }
  }

  /**
   * Преобразовать Channex бронирование в формат PMS
   */
  async convertToPMSFormat(channexBooking, originalBooking = null) {
    console.log('🔄 Конвертация Channex → PMS (Airbnb)');
    console.log('📋 Channex данные:', channexBooking);
    
    const attrs = channexBooking.attributes;
    const room = attrs.rooms?.[0];
    
    // Получаем даты из разных возможных источников
    let arrival = attrs.arrival_date || room?.checkin_date || room?.days ? Object.keys(room.days)[0] : null;
    let departure = attrs.departure_date || room?.checkout_date;
    
    // Если нет departure, вычисляем из room.days (добавляем один день к последней дате)
    if (!departure && room?.days) {
      const dayKeys = Object.keys(room.days).sort();
      if (dayKeys.length > 0) {
        const lastDay = new Date(dayKeys[dayKeys.length - 1]);
        lastDay.setDate(lastDay.getDate() + 1);
        departure = lastDay.toISOString().split('T')[0];
      }
    }
    
    // Fallback на оригинальные данные формы если Channex не предоставил даты
    if (!arrival && originalBooking?.check_in) {
      arrival = originalBooking.check_in;
      console.log('🔄 Используем дату заезда из оригинальной формы:', arrival);
    }
    if (!departure && originalBooking?.check_out) {
      departure = originalBooking.check_out;
      console.log('🔄 Используем дату выезда из оригинальной формы:', departure);
    }
    
    console.log('📅 Даты:', { 
      arrival: arrival, 
      departure: departure,
      from_attrs: { arrival_date: attrs.arrival_date, departure_date: attrs.departure_date },
      from_room: { checkin_date: room?.checkin_date, checkout_date: room?.checkout_date },
      room_days: room?.days ? Object.keys(room.days) : null
    });
    
    // Определяем тип комнаты с приоритетом originalBooking.room_type
    let roomType = originalBooking?.room_type || 'standard_room';
    
    // Проверяем, есть ли такой ключ в маппинге
    if (!this.airbnbConfig.room_mapping[roomType]) {
      console.log('⚠️ Тип комнаты не найден в маппинге:', roomType);
      console.log('   Доступные типы:', Object.keys(this.airbnbConfig.room_mapping));
      // Fallback на standard_room
      roomType = 'standard_room';
    }
    
    let roomMapping = this.airbnbConfig.room_mapping[roomType];
    
    console.log('🏠 Определение типа комнаты:', {
      original_room_type: originalBooking?.room_type,
      room_type_id: room?.room_type_id,
      selected_room_type: roomType,
      pms_room_number: roomMapping.pms_room_number,
      channex_room_type_id: roomMapping.channex_room_type_id
    });
    
    // Если нет originalBooking.room_type, ищем по room_type_id
    if (!originalBooking?.room_type) {
      for (const [type, mapping] of Object.entries(this.airbnbConfig.room_mapping)) {
        if (room?.room_type_id === mapping.channex_room_type_id) {
          roomType = type;
          roomMapping = mapping;
          break;
        }
      }
    }

    // Получаем room_id из базы данных по номеру комнаты
    const roomId = await this.getRoomIdByNumber(roomMapping.pms_room_number);

    const pmsBooking = {
      id: channexBooking.id,
      channel: 'airbnb',
      source: 'Airbnb', // Изменено на Airbnb с большой буквы для единообразия
      ota_reservation_code: attrs.ota_reservation_code,
      
      check_in: arrival,
      check_out: departure,
      
      // Детальное логирование данных гостя для отладки
      guest_first_name: (() => {
        const original = originalBooking?.guest_first_name;
        const channex = attrs.customer?.name;
        const result = original || channex || 'Guest';
        console.log('👤 guest_first_name:', { original, channex, result });
        return result;
      })(),
      guest_last_name: (() => {
        const original = originalBooking?.guest_last_name; 
        const channex = attrs.customer?.surname;
        const result = original || channex || 'User';
        console.log('👤 guest_last_name:', { original, channex, result });
        return result;
      })(),
      guest_email: (() => {
        const original = originalBooking?.guest_email;
        const channex = attrs.customer?.mail;
        const result = original || channex || '';
        console.log('📧 guest_email:', { original, channex, result });
        return result;
      })(),
      guest_phone: (() => {
        const original = originalBooking?.guest_phone;
        const channex = attrs.customer?.phone;  
        const result = original || channex || '';
        console.log('📞 guest_phone:', { original, channex, result });
        return result;
      })(),
      
      room_id: roomId, // ✨ Добавляем правильный room_id
      room_type: roomType,
      room_number: roomMapping.pms_room_number,
      room_title: roomMapping.airbnb_room_title,
      
      adults: room?.occupancy?.adults || 2,
      children: room?.occupancy?.children || 0,
      
      // Детальное логирование стоимости для отладки
      total_amount: (() => {
        const roomAmount = room?.amount;
        const attrsAmount = attrs.amount;
        const totalPrice = attrs.total_price; 
        const originalAmount = originalBooking?.total_amount;
        const originalTotalPrice = originalBooking?.total_price;
        
        // Вычисляем базовую стоимость если нет других источников
        const nights = Math.ceil((new Date(departure) - new Date(arrival)) / (1000 * 60 * 60 * 24));
        const calculatedAmount = parseFloat(roomMapping.base_price) * nights;
        
        const result = parseFloat(originalAmount || originalTotalPrice || roomAmount || attrsAmount || totalPrice || calculatedAmount || '0');
        console.log('💰 total_amount:', { 
          originalAmount,
          originalTotalPrice,
          roomAmount, 
          attrsAmount, 
          totalPrice,
          calculatedAmount,
          nights,
          base_price: roomMapping.base_price,
          result 
        });
        return result;
      })(),
      currency: (() => {
        const result = attrs.currency || 'USD';
        console.log('💱 currency:', { attrs_currency: attrs.currency, result });
        return result;
      })(),
      status: 'confirmed',
      
      notes: attrs.notes || '',
      airbnb_meta: attrs.meta || {},

      // Добавляем guests объект для совместимости с UI
      guests: {
        full_name: `${originalBooking?.guest_first_name || attrs.customer?.name || 'Guest'} ${originalBooking?.guest_last_name || attrs.customer?.surname || 'User'}`.trim(),
        email: originalBooking?.guest_email || attrs.customer?.mail || '',
        phone: originalBooking?.guest_phone || attrs.customer?.phone || '',
        address: ''
      }
    };

    // Теперь можем использовать pmsBooking после его полного определения
    console.log('✅ PMS формат:', {
      id: pmsBooking.id,
      guest: `${pmsBooking.guest_first_name} ${pmsBooking.guest_last_name}`,
      guests_full_name: pmsBooking.guests.full_name,
      room: pmsBooking.room_title,
      dates: `${pmsBooking.check_in} - ${pmsBooking.check_out}`
    });

    return pmsBooking;
  }

  /**
   * Создать бронирование в Airbnb через Channex
   */
  async createAirbnbBooking(pmsBooking) {
    console.log('🏠 Создание Airbnb бронирования');
    console.log('📝 Данные:', pmsBooking);

    try {
      const channexBooking = this.convertToChannexFormat(pmsBooking);
      const result = await this.apiRequest('/bookings', 'POST', channexBooking);
      
      console.log('✅ Airbnb бронирование создано через Channex:', result.data?.id);
      
      // 🚫 ОБНОВЛЕНИЕ AVAILABILITY ДЛЯ ПРЕДОТВРАЩЕНИЯ ОВЕРБУКИНГА
      if (result.data) {
        try {
          // Получаем маппинг комнаты для определения room_type_id
          const roomMapping = this.getRoomMapping(pmsBooking.room_type || 'standard_room');
          await this.updateAvailabilityAfterBooking(
            roomMapping.channex_room_type_id, 
            pmsBooking.check_in, 
            pmsBooking.check_out
          );
          console.log('✅ Airbnb Availability обновлен для предотвращения овербукинга');
        } catch (availabilityError) {
          console.error('⚠️ Не удалось обновить Airbnb availability (бронь создана, но овербукинг возможен):', availabilityError);
          // Не бросаем ошибку, так как основная задача (создание брони) выполнена
        }
        
        // Сохраняем в нашу БД
        const pmsFormatted = await this.convertToPMSFormat(result.data, pmsBooking); // передаем оригинальные данные
        await this.saveToPMS(pmsFormatted);
        console.log('💾 Бронирование сохранено в PMS БД:', result.data.id);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Ошибка создания Airbnb бронирования:', error);
      throw error;
    }
  }

  /**
   * Синхронизация с Airbnb через Channex
   */
  async syncWithAirbnb() {
    console.log('🔄 Синхронизация с Airbnb');

    try {
      const response = await this.apiRequest(
        `/bookings?filter[property_id]=${this.propertyId}&filter[ota_name]=Airbnb&per_page=50`
      );
      
      const bookings = response.data || [];
      console.log(`📥 Получено ${bookings.length} Airbnb бронирований`);

      let synced = 0;
      let errors = [];

      for (const booking of bookings) {
        try {
          const pmsBooking = await this.convertToPMSFormat(booking);
          await this.saveToPMS(pmsBooking);
          synced++;
        } catch (error) {
          console.error('❌ Ошибка синхронизации бронирования:', booking.id, error);
          errors.push({ booking_id: booking.id, error: error.message });
        }
      }

      console.log(`✅ Синхронизировано: ${synced}/${bookings.length}`);
      return { total: bookings.length, synced, errors };
    } catch (error) {
      console.error('❌ Ошибка синхронизации Airbnb:', error);
      throw error;
    }
  }

  /**
   * Обновить availability для Airbnb
   */
  async updateAirbnbAvailability(roomType, dates, count) {
    console.log(`📅 Обновление Airbnb availability: ${roomType}`);
    
    try {
      const roomMapping = this.getRoomMapping(roomType);
      
      const availabilityData = {
        property_id: this.propertyId,
        room_type_id: roomMapping.channex_room_type_id,
        availability: {}
      };

      // Формируем данные для каждой даты
      if (Array.isArray(dates)) {
        dates.forEach(date => {
          availabilityData.availability[date] = count;
        });
      } else {
        availabilityData.availability[dates] = count;
      }

      const result = await this.apiRequest('/availability', 'PUT', availabilityData);
      console.log('✅ Airbnb availability обновлен');
      return result;
    } catch (error) {
      console.error('❌ Ошибка обновления Airbnb availability:', error);
      throw error;
    }
  }

  /**
   * Обновить цены для Airbnb
   */
  async updateAirbnbPrices(roomType, dates, price) {
    console.log(`💰 Обновление Airbnb цен: ${roomType}`);
    
    try {
      const roomMapping = this.getRoomMapping(roomType);
      
      const rateData = {
        property_id: this.propertyId,
        rate_plan_id: roomMapping.channex_rate_plan_id,
        rates: {}
      };

      // Формируем данные для каждой даты
      if (Array.isArray(dates)) {
        dates.forEach(date => {
          rateData.rates[date] = { rate: price };
        });
      } else {
        rateData.rates[dates] = { rate: price };
      }

      const result = await this.apiRequest('/rates', 'PUT', rateData);
      console.log('✅ Airbnb цены обновлены');
      return result;
    } catch (error) {
      console.error('❌ Ошибка обновления Airbnb цен:', error);
      throw error;
    }
  }

  /**
   * Сохранить бронирование в PMS БД
   */
  async saveToPMS(pmsBooking) {
    try {
      // Сначала создаем или находим гостя
      let guestId = pmsBooking.guest_id;
      
      if (!guestId && pmsBooking.guests) {
        // Создаем нового гостя
        const { data: guestData, error: guestError } = await supabase
          .from('guests')
          .upsert({
            full_name: pmsBooking.guests.full_name || `${pmsBooking.guest_first_name} ${pmsBooking.guest_last_name}`.trim(),
            email: pmsBooking.guests.email || pmsBooking.guest_email,
            phone: pmsBooking.guests.phone || pmsBooking.guest_phone,
            address: pmsBooking.guests.address || ''
          }, {
            onConflict: 'email',
            ignoreDuplicates: false
          })
          .select()
          .single();
          
        if (guestError) {
          console.error('⚠️ Ошибка создания гостя:', guestError);
          // Если гость уже существует, пытаемся его найти
          const { data: existingGuest } = await supabase
            .from('guests')
            .select('id')
            .eq('email', pmsBooking.guests.email || pmsBooking.guest_email)
            .single();
            
          guestId = existingGuest?.id;
        } else {
          guestId = guestData?.id;
        }
      }
      
      // Подготавливаем данные для сохранения бронирования
      const bookingData = {
        ...pmsBooking,
        guest_id: guestId,
        // Удаляем поле guests, так как его нет в таблице bookings
        guests: undefined,
        // Убеждаемся что поля source и channel установлены
        source: pmsBooking.source || 'Airbnb',
        channel: pmsBooking.channel || 'airbnb'
      };
      
      // Удаляем undefined поля
      Object.keys(bookingData).forEach(key => {
        if (bookingData[key] === undefined) {
          delete bookingData[key];
        }
      });
      
      // Логируем данные для отладки
      console.log('💾 Данные для сохранения в БД:', {
        id: bookingData.id,
        source: bookingData.source,
        channel: bookingData.channel,
        guest_id: bookingData.guest_id,
        check_in: bookingData.check_in,
        check_out: bookingData.check_out
      });
      
      const { data, error } = await supabase
        .from('bookings')
        .upsert(bookingData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error('❌ Ошибка сохранения в PMS БД:', error);
        throw error;
      }

      console.log('💾 Сохранено в PMS БД:', bookingData.id);
      return data;
    } catch (error) {
      console.error('❌ Критическая ошибка сохранения:', error);
      throw error;
    }
  }

  /**
   * Синхронизировать конкретное бронирование по ID из Channex в PMS
   */
  async syncBookingById(channexBookingId) {
    console.log('🔄 Синхронизация бронирования из Channex:', channexBookingId);

    try {
      const response = await this.apiRequest(`/bookings/${channexBookingId}`);
      const booking = response.data;
      
      if (!booking) {
        throw new Error('Бронирование не найдено в Channex');
      }
      
      console.log('📥 Получено бронирование из Channex:', booking.id);
      
      const pmsBooking = await this.convertToPMSFormat(booking);
      const result = await this.saveToPMS(pmsBooking);
      
      console.log('✅ Бронирование синхронизировано в PMS:', pmsBooking.id);
      return result;
    } catch (error) {
      console.error('❌ Ошибка синхронизации бронирования:', error);
      throw error;
    }
  }

  /**
   * Получить статистику Airbnb бронирований
   */
  async getAirbnbStats() {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('channel', 'airbnb');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        confirmed: data?.filter(b => b.status === 'confirmed').length || 0,
        cancelled: data?.filter(b => b.status === 'cancelled').length || 0,
        revenue: data?.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0) || 0
      };

      console.log('📊 Airbnb статистика:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Ошибка получения статистики:', error);
      throw error;
    }
  }

  /**
   * Обновить availability в Channex после создания Airbnb бронирования
   * Уменьшает доступность на 1 для всех дат бронирования
   */
  async updateAvailabilityAfterBooking(roomTypeId, checkIn, checkOut) {
    console.log(`🚫 Обновление Airbnb availability после бронирования`);
    console.log(`📅 Room Type ID: ${roomTypeId}`);
    console.log(`📅 Даты: ${checkIn} - ${checkOut}`);

    try {
      // 1. Получаем текущее состояние availability для диапазона дат
      const startDate = checkIn;
      const endDate = checkOut;
      
      console.log(`🔍 Получаем текущий Airbnb availability для ${roomTypeId}`);
      
      // Формируем массив дат для запроса
      const dates = [];
      const tempDate = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      while (tempDate < endDateObj) {
        dates.push(tempDate.toISOString().split('T')[0]);
        tempDate.setDate(tempDate.getDate() + 1);
      }
      
      // Channex API требует передачи дат в специальном формате
      const dateFilter = dates.join(',');
      
      const currentAvailability = await this.apiRequest(
        `/availability?filter[property_id]=${this.propertyId}&filter[room_type_id]=${roomTypeId}&filter[date]=${dateFilter}`
      );
      
      if (!currentAvailability?.data) {
        console.warn('⚠️ Не удалось получить текущий Airbnb availability, применяем значения по умолчанию');
      }
      
      // 2. Генерируем список дат бронирования (исключая дату выезда)
      const bookingDates = [];
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      
      for (let date = new Date(start); date < end; date.setDate(date.getDate() + 1)) {
        bookingDates.push(date.toISOString().split('T')[0]);
      }
      
      console.log(`📋 Даты для обновления Airbnb availability:`, bookingDates);
      
      // 3. Подготавливаем данные для обновления (уменьшаем availability на 1)
      const availabilityUpdates = {};
      
      bookingDates.forEach(date => {
        // Проверяем, что currentAvailability это массив или объект с data
        let availabilityData = currentAvailability;
        
        // Если это объект с полем data, используем data
        if (currentAvailability && !Array.isArray(currentAvailability) && currentAvailability.data) {
          availabilityData = currentAvailability.data;
        }
        
        // Если это массив, ищем данные для нужной даты
        let currentForDate = null;
        if (Array.isArray(availabilityData)) {
          currentForDate = availabilityData.find(
            av => av.attributes && av.attributes.date === date
          );
        }
        
        // Берем из конфига количество доступных номеров для этого типа
        const roomMapping = Object.values(this.airbnbConfig.room_mapping).find(
          room => room.channex_room_type_id === roomTypeId
        );
        const defaultCount = roomMapping?.availability_count || 1;
        
        const currentCount = currentForDate?.attributes?.availability || defaultCount;
        const newCount = Math.max(0, currentCount - 1); // Не меньше 0
        
        availabilityUpdates[date] = newCount;
        console.log(`📅 ${date}: ${currentCount} → ${newCount}`);
      });
      
      // 4. Отправляем обновление в Channex
      const updatePayload = {
        property_id: this.propertyId,
        room_type_id: roomTypeId,
        availability: availabilityUpdates
      };
      
      console.log(`📤 Отправляем обновление Airbnb availability:`, updatePayload);
      
      const result = await this.apiRequest('/availability', 'PUT', updatePayload);
      
      console.log(`✅ Airbnb Availability успешно обновлен. Предотвращен овербукинг для ${bookingDates.length} дат`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Ошибка обновления Airbnb availability:', error);
      throw error;
    }
  }
}

export default new AirbnbChannexService();