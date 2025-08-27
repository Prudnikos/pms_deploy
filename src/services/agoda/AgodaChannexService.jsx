import { supabase } from '@/lib/supabase';
import agodaMapping from '@/config/agoda-mapping.json';

class AgodaChannexService {
  constructor() {
    this.baseURL = import.meta.env.VITE_CHANNEX_API_URL || 'https://staging.channex.io/api/v1';
    this.apiKey = import.meta.env.VITE_CHANNEX_API_KEY;
    this.propertyId = import.meta.env.VITE_CHANNEX_PROPERTY_ID;
    this.agodaConfig = agodaMapping.agoda_integration;
    
    console.log('🏨 AgodaChannexService инициализирован');
    console.log(`📍 Property ID: ${this.propertyId}`);
    console.log(`🌏 Agoda комнаты: Двухместный (${this.agodaConfig.room_mapping.double_room.availability_count}), Бунгало (${this.agodaConfig.room_mapping.bungalow.availability_count})`);
  }

  /**
   * API запрос к Channex
   */
  async apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${this.baseURL}${endpoint}`;
    console.log(`🌐 Agoda API запрос: ${method} ${url}`);

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
        console.error('❌ Agoda API ошибка:', responseText);
        throw new Error(`API Error: ${response.status}`);
      }

      return responseText ? JSON.parse(responseText) : { success: true };
    } catch (error) {
      console.error('💥 Agoda API Request Error:', error);
      throw error;
    }
  }

  /**
   * Маппинг PMS бронирования в формат Agoda/Channex
   */
  mapPMSToAgodaBooking(pmsBooking) {
    // Определяем тип комнаты по номеру
    let roomType = null;
    let agodaRoomId = null;
    
    const roomNumber = pmsBooking.room_number || '';
    
    if (roomNumber.startsWith('1')) {
      // Двухместный номер (101-103)
      roomType = this.agodaConfig.room_mapping.double_room;
      agodaRoomId = roomType.agoda_room_id;
    } else if (roomNumber.startsWith('2')) {
      // Бунгало (201-206)
      roomType = this.agodaConfig.room_mapping.bungalow;
      agodaRoomId = roomType.agoda_room_id;
    }

    if (!roomType) {
      throw new Error(`Не найден маппинг для комнаты ${roomNumber}`);
    }

    const checkIn = new Date(pmsBooking.check_in);
    const checkOut = new Date(pmsBooking.check_out);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    // Создаем структуру цен по дням
    const dayRates = {};
    for (let i = 0; i < nights; i++) {
      const date = new Date(checkIn);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dayRates[dateStr] = String(roomType.base_price);
    }

    return {
      booking: {
        property_id: this.propertyId,
        ota_reservation_code: `AGODA-${pmsBooking.id}-${Date.now()}`,
        ota_name: 'Agoda',
        arrival_date: pmsBooking.check_in,
        departure_date: pmsBooking.check_out,
        currency: roomType.currency,
        arrival_hour: this.agodaConfig.agoda_settings.check_in_time,
        
        customer: {
          name: pmsBooking.guest_first_name || 'Guest',
          surname: pmsBooking.guest_last_name || 'Guest',
          mail: pmsBooking.guest_email || 'guest@agoda.com',
          phone: pmsBooking.guest_phone || '',
          country: pmsBooking.guest_country || 'RU',
          language: pmsBooking.guest_language || 'en'
        },
        
        rooms: [{
          room_type_id: roomType.channex_room_type_id,
          rate_plan_id: roomType.channex_rate_plan_id,
          days: dayRates,
          occupancy: {
            adults: pmsBooking.adults || 2,
            children: pmsBooking.children || 0,
            infants: pmsBooking.infants || 0
          },
          guests: [{
            name: pmsBooking.guest_first_name || 'Guest',
            surname: pmsBooking.guest_last_name || 'Guest'
          }]
        }],
        
        services: [],
        notes: pmsBooking.notes || `Agoda booking via PMS. Room: ${roomNumber}`,
        
        meta: {
          source: 'PMS',
          agoda_room_id: agodaRoomId,
          agoda_room_name: roomType.agoda_room_name,
          pms_room_number: roomNumber,
          sync_timestamp: new Date().toISOString()
        }
      }
    };
  }

  /**
   * Конвертация Agoda бронирования из Channex в PMS формат
   */
  mapAgodaToPMSBooking(agodaBooking) {
    const attributes = agodaBooking.attributes || agodaBooking;
    const room = (attributes.rooms || [])[0] || {};
    const customer = attributes.customer || {};
    
    // Определяем номер комнаты по meta данным или типу
    let assignedRoom = null;
    if (attributes.meta?.agoda_room_id) {
      // Ищем по Agoda room ID
      if (attributes.meta.agoda_room_id === '762233577') {
        assignedRoom = '101'; // Двухместный
      } else if (attributes.meta.agoda_room_id === '763269496') {
        assignedRoom = '201'; // Бунгало
      }
    }

    // Считаем общую стоимость
    let totalAmount = 0;
    if (room.days) {
      totalAmount = Object.values(room.days).reduce((sum, price) => 
        sum + parseFloat(price || 0), 0
      );
    }

    return {
      external_booking_id: agodaBooking.id,
      channel: 'agoda',
      source: 'agoda',
      
      // Даты
      check_in: attributes.arrival_date,
      check_out: attributes.departure_date,
      
      // Гость
      guest_first_name: customer.name || 'Unknown',
      guest_last_name: customer.surname || 'Guest',
      guest_email: customer.mail || customer.email || '',
      guest_phone: customer.phone || '',
      guest_country: customer.country || 'Unknown',
      guest_language: customer.language || 'en',
      
      // Размещение
      room_number: assignedRoom,
      room_type: attributes.meta?.agoda_room_name || 'Standard',
      adults: room.occupancy?.adults || 2,
      children: room.occupancy?.children || 0,
      infants: room.occupancy?.infants || 0,
      
      // Финансы
      total_amount: totalAmount,
      currency: attributes.currency || 'USD',
      payment_status: 'pending',
      
      // Статус
      status: this.mapAgodaStatus(attributes.status),
      
      // Мета
      notes: attributes.notes || `Agoda booking #${attributes.ota_reservation_code}`,
      agoda_reservation_code: attributes.ota_reservation_code,
      agoda_data: JSON.stringify(agodaBooking),
      
      // Синхронизация
      sync_status: 'synced',
      last_sync_at: new Date().toISOString(),
      
      // Временные метки
      created_at: attributes.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Маппинг статусов Agoda
   */
  mapAgodaStatus(agodaStatus) {
    const statusMap = {
      'new': 'pending',
      'confirmed': 'confirmed',
      'modified': 'confirmed',
      'cancelled': 'cancelled',
      'checked_in': 'checked_in',
      'checked_out': 'checked_out',
      'no_show': 'cancelled'
    };
    
    return statusMap[agodaStatus] || 'pending';
  }

  /**
   * Создание бронирования в Agoda через Channex
   */
  async createAgodaBooking(pmsBooking) {
    console.log('📤 Отправляем бронирование в Agoda через Channex:', pmsBooking.id);
    
    try {
      const channexBooking = this.mapPMSToAgodaBooking(pmsBooking);
      console.log('📋 Подготовленные данные:', JSON.stringify(channexBooking, null, 2));
      
      const response = await this.apiRequest('/bookings', 'POST', channexBooking);
      
      if (response?.data) {
        console.log('✅ Бронирование создано в Agoda:', response.data.id);
        
        // Обновляем запись в БД
        await supabase
          .from('bookings')
          .update({
            external_booking_id: response.data.id,
            agoda_reservation_code: response.data.attributes?.ota_reservation_code,
            sync_status: 'synced',
            last_sync_at: new Date().toISOString(),
            agoda_data: JSON.stringify(response.data)
          })
          .eq('id', pmsBooking.id);
        
        return response.data;
      }
      
      throw new Error('Нет данных в ответе от Channex');
    } catch (error) {
      console.error('❌ Ошибка создания Agoda бронирования:', error);
      
      // Логируем ошибку
      await supabase
        .from('sync_errors')
        .insert({
          booking_id: pmsBooking.id,
          channel: 'agoda',
          error_type: 'create_booking',
          error_message: error.message,
          error_details: error.stack,
          occurred_at: new Date().toISOString()
        });
      
      throw error;
    }
  }

  /**
   * Обновление availability в Agoda
   */
  async updateAgodaAvailability(roomType, dates, availability) {
    console.log(`📅 Обновляем availability для ${roomType} на ${dates.length} дней`);
    
    try {
      const roomConfig = roomType === 'double' 
        ? this.agodaConfig.room_mapping.double_room
        : this.agodaConfig.room_mapping.bungalow;
      
      const availabilityData = {
        room_type_id: roomConfig.channex_room_type_id,
        availability_updates: dates.map(date => ({
          date: date,
          availability: availability
        }))
      };
      
      const response = await this.apiRequest(
        `/properties/${this.propertyId}/availability`,
        'POST',
        availabilityData
      );
      
      console.log('✅ Availability обновлен в Agoda');
      return response;
      
    } catch (error) {
      console.error('❌ Ошибка обновления availability:', error);
      throw error;
    }
  }

  /**
   * Обновление цен в Agoda
   */
  async updateAgodaPrices(roomType, dates, price) {
    console.log(`💰 Обновляем цены для ${roomType} на ${dates.length} дней: $${price}`);
    
    try {
      const roomConfig = roomType === 'double'
        ? this.agodaConfig.room_mapping.double_room  
        : this.agodaConfig.room_mapping.bungalow;
      
      const priceData = {
        rate_plan_id: roomConfig.channex_rate_plan_id,
        price_updates: dates.map(date => ({
          date: date,
          price: String(price)
        }))
      };
      
      const response = await this.apiRequest(
        `/properties/${this.propertyId}/rates`,
        'POST',
        priceData
      );
      
      console.log('✅ Цены обновлены в Agoda');
      return response;
      
    } catch (error) {
      console.error('❌ Ошибка обновления цен:', error);
      throw error;
    }
  }

  /**
   * Получение бронирований из Agoda
   */
  async fetchAgodaBookings(startDate, endDate) {
    console.log(`📥 Получаем бронирования Agoda с ${startDate} по ${endDate}`);
    
    try {
      const params = new URLSearchParams({
        'filter[property_id]': this.propertyId,
        'filter[ota_name]': 'Agoda',
        'filter[arrival_date_gte]': startDate,
        'filter[arrival_date_lte]': endDate
      });
      
      const response = await this.apiRequest(`/bookings?${params}`, 'GET');
      const bookings = response?.data || [];
      
      console.log(`✅ Получено ${bookings.length} бронирований из Agoda`);
      
      // Конвертируем в PMS формат
      const pmsBookings = bookings.map(booking => 
        this.mapAgodaToPMSBooking(booking)
      );
      
      return pmsBookings;
      
    } catch (error) {
      console.error('❌ Ошибка получения бронирований:', error);
      throw error;
    }
  }

  /**
   * Синхронизация всех данных с Agoda
   */
  async syncWithAgoda() {
    console.log('🔄 Запуск полной синхронизации с Agoda...');
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 365);
      const futureDate = endDate.toISOString().split('T')[0];
      
      // 1. Получаем бронирования
      const agodaBookings = await this.fetchAgodaBookings(today, futureDate);
      
      // 2. Синхронизируем с БД
      for (const booking of agodaBookings) {
        const { data: existing } = await supabase
          .from('bookings')
          .select('id')
          .eq('external_booking_id', booking.external_booking_id)
          .single();
        
        if (!existing) {
          // Новое бронирование
          await supabase
            .from('bookings')
            .insert(booking);
          console.log(`➕ Добавлено новое бронирование: ${booking.external_booking_id}`);
        } else {
          // Обновляем существующее
          await supabase
            .from('bookings')
            .update(booking)
            .eq('external_booking_id', booking.external_booking_id);
          console.log(`🔄 Обновлено бронирование: ${booking.external_booking_id}`);
        }
      }
      
      console.log('✅ Синхронизация с Agoda завершена');
      
      return {
        total: agodaBookings.length,
        synced: agodaBookings.length,
        errors: 0
      };
      
    } catch (error) {
      console.error('❌ Ошибка синхронизации с Agoda:', error);
      throw error;
    }
  }
}

// Экспортируем singleton
const agodaService = new AgodaChannexService();
export default agodaService;