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
   * Преобразовать Channex бронирование в формат PMS
   */
  convertToPMSFormat(channexBooking) {
    console.log('🔄 Конвертация Channex → PMS (Airbnb)');
    console.log('📋 Channex данные:', channexBooking);
    
    const attrs = channexBooking.attributes;
    const room = attrs.rooms?.[0];
    
    console.log('📅 Даты:', { arrival: attrs.arrival_date, departure: attrs.departure_date });
    
    // Определяем тип комнаты по room_type_id
    let roomType = 'standard_apartment';
    let roomMapping = this.airbnbConfig.room_mapping.standard_apartment;
    
    // Находим соответствующий тип комнаты по room_type_id
    for (const [type, mapping] of Object.entries(this.airbnbConfig.room_mapping)) {
      if (room?.room_type_id === mapping.channex_room_type_id) {
        roomType = type;
        roomMapping = mapping;
        break;
      }
    }

    const pmsBooking = {
      id: channexBooking.id,
      channel: 'airbnb',
      source: 'airbnb',
      ota_reservation_code: attrs.ota_reservation_code,
      
      check_in: attrs.arrival_date || attrs.checkin_date || null,
      check_out: attrs.departure_date || attrs.checkout_date || null,
      
      guest_first_name: attrs.customer?.name || 'Guest',
      guest_last_name: attrs.customer?.surname || 'User',
      guest_email: attrs.customer?.mail || '',
      guest_phone: attrs.customer?.phone || '',
      
      room_type: roomType,
      room_number: roomMapping.pms_room_number,
      room_title: roomMapping.airbnb_room_title,
      
      adults: room?.occupancy?.adults || 2,
      children: room?.occupancy?.children || 0,
      
      total_amount: attrs.total_price || 0,
      currency: attrs.currency || 'USD',
      status: attrs.status || 'confirmed',
      
      created_at: attrs.created_at,
      updated_at: attrs.updated_at,
      
      notes: attrs.notes || '',
      airbnb_meta: attrs.meta || {}
    };

    console.log('✅ PMS формат:', {
      id: pmsBooking.id,
      guest: `${pmsBooking.guest_first_name} ${pmsBooking.guest_last_name}`,
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
      
      // Сохраняем в нашу БД только если это не тестовое бронирование
      if (result.data && !pmsBooking.test) {
        const pmsFormatted = this.convertToPMSFormat(result.data);
        await this.saveToPMS(pmsFormatted);
      } else if (pmsBooking.test) {
        console.log('🧪 Тестовое бронирование - не сохраняем в PMS БД');
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
          const pmsBooking = this.convertToPMSFormat(booking);
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
      const { data, error } = await supabaseAdmin
        .from('bookings')
        .upsert(pmsBooking, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error('❌ Ошибка сохранения в PMS БД:', error);
        throw error;
      }

      console.log('💾 Сохранено в PMS БД:', pmsBooking.id);
      return data;
    } catch (error) {
      console.error('❌ Критическая ошибка сохранения:', error);
      throw error;
    }
  }

  /**
   * Получить статистику Airbnb бронирований
   */
  async getAirbnbStats() {
    try {
      const { data, error } = await supabaseAdmin
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
}

export default new AirbnbChannexService();