import { supabase } from '@/lib/supabase';

class ChannexService {
  constructor() {
    this.baseURL = import.meta.env.VITE_CHANNEX_API_URL || 'https://staging.channex.io/api/v1';
    this.apiKey = import.meta.env.VITE_CHANNEX_API_KEY;
    this.propertyId = import.meta.env.VITE_CHANNEX_PROPERTY_ID;
    
    // Проверяем, есть ли реальный API ключ
    this.useMockData = !this.apiKey;
    
    if (this.useMockData) {
      console.warn('🎭 Channex работает в режиме MOCK данных. Установите VITE_CHANNEX_API_KEY в .env');
    } else {
      console.log('✅ Channex работает в режиме PRODUCTION');
      console.log(`🏨 Property ID: ${this.propertyId}`);
    }
    
    // Booking CRS App уже установлен через UI
    console.log('✅ Booking CRS App установлен через UI');
  }

  // --- ОСНОВНОЙ МЕТОД ДЛЯ API ЗАПРОСОВ (ИСПРАВЛЕННЫЙ) ---
  async apiRequest(endpoint, method = 'GET', data = null) {
    if (this.useMockData) {
      console.log(`🎭 Mock API Request: ${method} ${endpoint}`);
      return { data: {}, success: true };
    }

    const url = `${this.baseURL}${endpoint}`;
    console.log(`🌐 API запрос: ${method} ${url}`);
    
    try {
      const options = {
        method: method,
        headers: {
          'user-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      };
      
      // Добавляем body только для POST/PUT/PATCH запросов
      if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
        options.body = JSON.stringify(data);
      }
      
      const response = await fetch(url, options);
      const responseText = await response.text();
      console.log(`📡 Ответ API: ${response.status}`);

      if (!response.ok) {
        console.error('📄 Полный ответ ошибки:', responseText);
        let errorData;
        try { 
          errorData = JSON.parse(responseText); 
        } catch (e) { 
          errorData = { message: responseText };
        }
        const errorMessage = errorData?.errors?.title || errorData?.errors?.details || responseText;
        throw new Error(`Channex API Error: ${errorMessage}`);
      }

      // Если ответ пустой, возвращаем success: true
      if (!responseText) return { success: true };
      
      const responseData = JSON.parse(responseText);
      console.log('📊 Данные от API:', responseData);
      return responseData;

    } catch (error) {
      console.error('💥 Channex API Request Error:', error);
      throw error;
    }
  }

  // --- ИНИЦИАЛИЗАЦИЯ BOOKING CRS APP ---
  async initializeBookingCRS() {
    try {
      // Проверяем установленные приложения
      const apps = await this.checkInstalledApps();
      
      if (!apps || apps.length === 0) {
        console.log('⚠️ Нет установленных приложений. Устанавливаем Booking CRS App...');
        await this.installBookingCRSApp();
      } else {
        const hasCRS = apps.some(app => 
          app.attributes?.application_code?.includes('booking') || 
          app.attributes?.application_code?.includes('crs')
        );
        
        if (!hasCRS) {
          console.log('⚠️ Booking CRS App не найден. Устанавливаем...');
          await this.installBookingCRSApp();
        } else {
          console.log('✅ Booking CRS App уже установлен');
        }
      }
    } catch (error) {
      console.error('❌ Ошибка при инициализации Booking CRS:', error);
    }
  }

  // --- УСТАНОВКА BOOKING CRS APP ---
  async installBookingCRSApp() {
    console.log('🔧 Устанавливаем Booking CRS App...');
    
    const appCodes = ['booking_crs', 'channex_booking_crs', 'crs', 'bookings'];
    
    for (const code of appCodes) {
      try {
        const response = await this.apiRequest('/applications', 'POST', {
          application_installation: {
            property_id: this.propertyId,
            application_code: code
          }
        });
        
        if (response?.data?.[0]?.id) {
          console.log(`✅ Установлено приложение с кодом: ${code}`, response);
          return response.data[0].id;
        }
      } catch (error) {
        console.log(`❌ Код ${code} не подошел:`, error.message);
      }
    }
    
    console.error('❌ Не удалось установить Booking CRS App ни с одним из кодов');
    throw new Error('Failed to install Booking CRS App');
  }

  // --- ПРОВЕРКА УСТАНОВЛЕННЫХ ПРИЛОЖЕНИЙ ---
  async checkInstalledApps() {
    try {
      const response = await this.apiRequest(
        `/applications?filter[property_id]=${this.propertyId}`,
        'GET'
      );
      console.log('📋 Установленные приложения:', response?.data || []);
      return response?.data || [];
    } catch (error) {
      console.error('❌ Ошибка при проверке приложений:', error);
      return [];
    }
  }

  // --- СОЗДАНИЕ БРОНИРОВАНИЯ В CHANNEX (ИСПРАВЛЕННОЕ) ---
  async createBookingInChannex(pmsBooking) {
    console.log('📤 Отправляем бронирование в Channex:', pmsBooking.id);
    
    try {
      // 1. Получаем необходимые данные из PMS
      const { data: pmsRooms, error: pmsRoomsError } = await supabase
        .from('rooms')
        .select('*');
      if (pmsRoomsError) throw pmsRoomsError;

      // 3. Получаем данные из Channex
      const channexRoomTypesResponse = await this.apiRequest(
        `/room_types?filter[property_id]=${this.propertyId}`,
        'GET'
      );
      const channexRoomTypes = channexRoomTypesResponse?.data || [];

      const ratePlansResponse = await this.apiRequest(
        `/rate_plans?filter[property_id]=${this.propertyId}`,
        'GET'
      );
      const ratePlans = ratePlansResponse?.data || [];
      
      console.log(`... получено ${channexRoomTypes.length} типов комнат и ${ratePlans.length} тарифов из Channex`);
      
      // ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ДЛЯ ОТЛАДКИ
      console.log('🏠 ВСЕ ТИПЫ КОМНАТ ИЗ CHANNEX:');
      channexRoomTypes.forEach((rt, index) => {
        console.log(`  ${index + 1}. ID: ${rt.id}`);
        console.log(`     Title: "${rt.attributes?.title}"`);
        console.log(`     Kind: ${rt.attributes?.room_kind}`);
        console.log(`     Count: ${rt.attributes?.count_of_rooms}`);
        console.log('     ---');
      });
      
      console.log('💰 ВСЕ ТАРИФНЫЕ ПЛАНЫ ИЗ CHANNEX:');
      ratePlans.forEach((rp, index) => {
        console.log(`  ${index + 1}. ID: ${rp.id}`);
        console.log(`     Title: "${rp.attributes?.title}"`);
        console.log(`     Room Type ID: ${rp.relationships?.room_type?.data?.id}`);
        console.log(`     Currency: ${rp.attributes?.currency}`);
        console.log('     ---');
      });
      
      console.log('🔍 PMS КОМНАТА:');
      console.log(`  ID: ${pmsBooking.room_id}`);
      console.log(`  Ищем комнату в PMS...`);
      
      console.log('🏠 ВСЕ КОМНАТЫ ИЗ PMS:');
      pmsRooms.forEach((room, index) => {
        console.log(`  ${index + 1}. ID: ${room.id}`);
        console.log(`     Number: "${room.room_number}"`);
        console.log(`     Name: "${room.name}"`);
        console.log(`     Type: "${room.room_type}"`);
        console.log(`     Channex Room Type ID: ${room.channex_room_type_id || 'НЕТ'}`);
        console.log('     ---');
      });

      // 3. Находим соответствия
      const pmsRoom = pmsRooms.find(r => r.id === pmsBooking.room_id);
      if (!pmsRoom) {
        console.error(`❌ Комната с ID ${pmsBooking.room_id} не найдена в PMS.`);
        console.error(`📋 Доступные комнаты:`, pmsRooms.map(r => ({id: r.id, number: r.room_number})));
        throw new Error(`Комната с ID ${pmsBooking.room_id} не найдена в PMS. Проверьте room_id в бронировании.`);
      }
      
      console.log('🎯 НАЙДЕННАЯ PMS КОМНАТА:');
      console.log(`  ID: ${pmsRoom.id}`);
      console.log(`  Number: "${pmsRoom.room_number}"`);  
      console.log(`  Name: "${pmsRoom.name}"`);
      console.log(`  Channex Room Type ID: ${pmsRoom.channex_room_type_id || 'НЕТ'}`);
      
      // ПРАВИЛЬНАЯ ЛОГИКА ДЛЯ НОВОЙ АРХИТЕКТУРЫ CHANNEX
      let channexRoomType;
      
      console.log(`🔍 ПОИСК CHANNEX ROOM TYPE ДЛЯ PMS КОМНАТЫ "${pmsRoom.room_number}"`);
      
      // 1. Сначала пробуем найти по channex_room_type_id из базы (если есть)
      if (pmsRoom.channex_room_type_id) {
        channexRoomType = channexRoomTypes.find(crt => crt.id === pmsRoom.channex_room_type_id);
        console.log(`  🎯 По ID из базы (${pmsRoom.channex_room_type_id}): ${channexRoomType ? 'НАЙДЕН' : 'НЕ НАЙДЕН'}`);
      }
      
      // 2. Логика маппинга номер → тип комнаты (ПРАВИЛЬНАЯ АРХИТЕКТУРА)
      if (!channexRoomType) {
        let targetRoomType = 'Standard Room'; // По умолчанию
        
        // Определяем тип по номеру комнаты
        const roomNumber = pmsRoom.room_number;
        if (roomNumber) {
          if (roomNumber.startsWith('1')) {
            targetRoomType = 'Standard Room'; // 101, 102, 103, etc.
          } else if (roomNumber.startsWith('2')) {
            targetRoomType = 'Deluxe Room'; // 201, 202, 203, etc.
          } else if (roomNumber.startsWith('3')) {
            targetRoomType = 'Suite'; // 301, 302, 303, etc.
          }
        }
        
        console.log(`  🏠 Маппинг номера "${roomNumber}" → тип "${targetRoomType}"`);
        
        // Ищем по типу комнаты
        channexRoomType = channexRoomTypes.find(crt => 
          crt.attributes.title === targetRoomType
        );
        console.log(`  🔍 Поиск типа "${targetRoomType}": ${channexRoomType ? 'НАЙДЕН' : 'НЕ НАЙДЕН'}`);
      }
      
      // 3. Если все еще не найден - берем первый доступный
      if (!channexRoomType) {
        channexRoomType = channexRoomTypes[0];
        console.warn(`  ⚠️ Используем первый доступный: ${channexRoomType?.attributes?.title}`);
      }
      
      if (!channexRoomType) {
        throw new Error(`Не найден ни один тип комнаты в Channex для "${pmsRoom.room_number}"`);
      }

      console.log(`✅ ВЫБРАННЫЙ CHANNEX ROOM TYPE:`);
      console.log(`  ID: ${channexRoomType.id}`);
      console.log(`  Title: "${channexRoomType.attributes?.title}"`);
      console.log(`  Kind: ${channexRoomType.attributes?.room_kind}`);

      // ИСПРАВЛЕННАЯ ЛОГИКА ПОИСКА RATE PLAN
      const channexRatePlan = ratePlans.find(rp => 
        rp.relationships?.room_type?.data?.id === channexRoomType.id
      );
      
      console.log(`🔍 Поиск rate plan для room_type_id: ${channexRoomType.id}`);
      console.log(`  Найден rate plan: ${channexRatePlan ? 'ДА' : 'НЕТ'}`);
      
      if (!channexRatePlan) {
        throw new Error(`Тарифный план для типа комнаты "${channexRoomType.attributes.title}" не найден в Channex.`);
      }
      
      console.log(`✅ ВЫБРАННЫЙ RATE PLAN:`);
      console.log(`  ID: ${channexRatePlan.id}`);
      console.log(`  Title: "${channexRatePlan.attributes?.title}"`);
      console.log(`  Currency: ${channexRatePlan.attributes?.currency}`);
      
      console.log(`✅ Найдена связка: PMS Room "${pmsRoom.room_number}" -> Channex Room Type "${channexRoomType.attributes.title}" -> Channex Rate Plan "${channexRatePlan.attributes.title}"`);

      // 4. Формируем корректную структуру данных для Channex (цены хардкодим: 101=100, 201=200)
      const channexBookingPayload = this.mapPMSToChannexBooking(
        pmsBooking, 
        channexRatePlan, 
        channexRoomType,
        pmsRoom  // ← ДОБАВЛЯЕМ pmsRoom как параметр
      );
      
      console.log('📋 Финальные данные для отправки:', JSON.stringify(channexBookingPayload, null, 2));

      // 5. Отправляем бронирование
      const response = await this.apiRequest('/bookings', 'POST', channexBookingPayload);

      if (response?.data) {
        console.log('✅ Бронь создана в Channex:', response.data.id);
        
        // Обновляем запись в базе данных
        const updateData = { 
          external_booking_id: response.data.id,
          sync_status: 'synced',
          last_sync_at: new Date().toISOString(),
          channex_data: JSON.stringify(response.data)
        };
        
        // Если room_id был null, привязываем к найденной комнате
        if (!pmsBooking.room_id) {
          updateData.room_id = pmsRoom.id;
          console.log(`🔗 Привязываем бронирование к комнате: ${pmsRoom.room_number} (${pmsRoom.id})`);
        }
        
        await supabase
          .from('bookings')
          .update(updateData)
          .eq('id', pmsBooking.id);
          
        return response.data;
      }
    } catch (error) {
      console.error(`❌ Ошибка отправки брони ${pmsBooking.id} в Channex:`, error);
      
      // Сохраняем ошибку в базе данных
      await supabase
        .from('sync_errors')
        .insert({
          booking_id: pmsBooking.id,
          service: 'channex',
          error_message: error.message,
          error_details: error.stack,
          occurred_at: new Date().toISOString()
        });
        
      throw error;
    }
  }

  // --- МАППИНГ ДАННЫХ БРОНИРОВАНИЯ (ПО ОФИЦИАЛЬНОЙ ДОКУМЕНТАЦИИ) ---
  mapPMSToChannexBooking(pmsBooking, channexRatePlan, channexRoomType, pmsRoom) {
    // Обработка имени гостя
    const guestName = pmsBooking.guests?.full_name || 'Guest';
    const nameParts = guestName.trim().split(' ').filter(Boolean);
    
    const firstName = nameParts[0] || 'Guest';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Guest';
    
    // Количество гостей
    const adultsCount = pmsBooking.guests_count || 1;
    
    // ПРАВИЛЬНАЯ ЛОГИКА ЦЕН ПО ТИПАМ КОМНАТ
    const checkIn = new Date(pmsBooking.check_in);
    const checkOut = new Date(pmsBooking.check_out);
    const nightsCount = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    // Определяем цену по типу комнаты (как в Channex)
    let pricePerNight = "100.00"; // По умолчанию
    const roomType = channexRoomType?.attributes?.title || '';
    
    if (roomType === 'Standard Room') {
      pricePerNight = "100.00";
    } else if (roomType === 'Deluxe Room') {
      pricePerNight = "200.00";  
    } else if (roomType === 'Suite') {
      pricePerNight = "300.00";
    }
    
    console.log('💰 ОБРАБОТКА ЦЕН (ПО ТИПАМ КОМНАТ):');
    console.log(`  Тип комнаты: "${roomType}"`);
    console.log(`  Цена за ночь: ${pricePerNight}`);
    console.log(`  Количество ночей: ${nightsCount}`);
    
    // Формируем days объект
    const days = {};
    for (let i = 0; i < nightsCount; i++) {
      const currentDate = new Date(checkIn);
      currentDate.setDate(currentDate.getDate() + i);
      const dateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
      days[dateString] = pricePerNight;
      console.log(`    ${dateString}: ${pricePerNight}`);
    }
    
    // ТОЧНАЯ структура по официальной документации Channex
    return {
      booking: {
        // Обязательные поля
        property_id: this.propertyId,
        ota_reservation_code: `PMS-${pmsBooking.id}`, // ← ИСПРАВЛЕНО: добавлено
        ota_name: this.mapSourceToOtaName(pmsBooking.source), // ← ДИНАМИЧЕСКИЙ маппинг
        arrival_date: pmsBooking.check_in,
        departure_date: pmsBooking.check_out,
        currency: 'GBP', // ← ОБЯЗАТЕЛЬНОЕ ПОЛЕ (по результатам тестирования)
        arrival_hour: "15:00", // ← ДОБАВЛЕНО: стандартное время заезда
        
        // Данные гостя (ТОЧНО по документации)
        customer: {
          name: firstName,
          surname: lastName,
          mail: pmsBooking.guests?.email || 'guest@example.com', // ← ИСПРАВЛЕНО: mail, не email!
          phone: pmsBooking.guests?.phone || '',
          address: pmsBooking.guests?.address || '',
          city: pmsBooking.guests?.city || '',
          country: pmsBooking.guests?.country || 'GB',
          zip: pmsBooking.guests?.zip || ''
        },
        
        // Данные комнат (ТОЧНО по документации)
        rooms: [{
          room_type_id: channexRoomType.id,
          rate_plan_id: channexRatePlan.id,
          days: days, // ← ДОБАВЛЕНО: цены по дням
          guests: [{ // ← ДОБАВЛЕНО: массив гостей
            name: firstName,
            surname: lastName
          }],
          occupancy: { 
            adults: adultsCount,
            children: 0,
            infants: 0,
            ages: [] // ← ДОБАВЛЕНО: массив возрастов детей
          }
        }],
        
        // Дополнительная информация для идентификации
        notes: pmsBooking.notes || `PMS Room: ${pmsRoom.room_number}`, // ← Указываем номер комнаты в заметках
        meta: {
          pms_room_id: pmsBooking.room_id,
          pms_room_number: pmsRoom.room_number,
          source: 'PMS'
        }
      }
    };
  }

  // --- МАППИНГ ИСТОЧНИКА БРОНИРОВАНИЯ ---
  mapSourceToOtaName(source) {
    // Только валидные провайдеры по результатам тестирования
    const sourceMapping = {
      'Open Channel': 'Booking.com', // Open Channel не валиден, используем Booking.com
      'booking': 'Booking.com',
      'airbnb': 'Airbnb',
      'expedia': 'Expedia', 
      'agoda': 'Agoda',
      'direct': 'Booking.com', // Direct не валиден, используем Booking.com
      'phone': 'Booking.com',
      'email': 'Booking.com', 
      'walk-in': 'Booking.com'
    };
    
    console.log(`🏷️ Маппинг источника: "${source}" → "${sourceMapping[source] || 'Booking.com'}"`);
    return sourceMapping[source] || 'Booking.com'; // По умолчанию Booking.com
  }

  // --- ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ---
  cleanRoomTitle(title) {
    if (!title) return 'Room';
    // Удаляем специальные символы, оставляем только буквы, цифры, пробелы и дефисы
    return title.replace(/[^a-zA-Z0-9\s\-]/g, '').trim();
  }
  
  // --- ОБНОВЛЕНИЕ БРОНИРОВАНИЯ ---
  async updateBookingInChannex(bookingId, updateData) {
    console.log('📝 Обновляем бронирование в Channex:', bookingId);
    
    try {
      const response = await this.apiRequest(
        `/bookings/${bookingId}`,
        'PUT',
        { booking: updateData }
      );
      
      console.log('✅ Бронирование обновлено в Channex');
      return response.data;
    } catch (error) {
      console.error('❌ Ошибка обновления бронирования:', error);
      throw error;
    }
  }
  
  // --- ОТМЕНА БРОНИРОВАНИЯ ---
  async cancelBookingInChannex(bookingId) {
    console.log('🚫 Отменяем бронирование в Channex:', bookingId);
    
    try {
      const response = await this.apiRequest(
        `/bookings/${bookingId}`,
        'PUT',
        { booking: { status: 'cancelled' } }
      );
      
      console.log('✅ Бронирование отменено в Channex');
      return response.data;
    } catch (error) {
      console.error('❌ Ошибка отмены бронирования:', error);
      throw error;
    }
  }

  // --- ПОЛУЧЕНИЕ ВСЕХ БРОНИРОВАНИЙ ИЗ CHANNEX ---
  async getBookingsFromChannex() {
    console.log('📥 Получаем все бронирования из Channex...');
    
    try {
      const response = await this.apiRequest(
        `/bookings?filter[property_id]=${this.propertyId}`,
        'GET'
      );
      
      console.log(`✅ Получено ${response.data?.length || 0} бронирований из Channex`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Ошибка получения бронирований:', error);
      throw error;
    }
  }

  // --- ИМПОРТ БРОНИРОВАНИЙ В PMS ---
  async importBookingsToPMS() {
    console.log('📋 Импортируем бронирования из Channex в PMS...');
    
    try {
      // 1. Получаем бронирования из Channex
      const channexBookings = await this.getBookingsFromChannex();
      
      if (!channexBookings || channexBookings.length === 0) {
        console.log('ℹ️ Нет бронирований для импорта');
        return { imported: 0, skipped: 0, errors: 0 };
      }

      // 2. Получаем существующие бронирования из PMS
      const { data: existingBookings, error: selectError } = await supabase
        .from('bookings')
        .select('external_booking_id');
      
      if (selectError) throw selectError;

      const existingIds = new Set(existingBookings.map(b => b.external_booking_id));
      
      let imported = 0, skipped = 0, errors = 0;

      // 3. Обрабатываем каждое бронирование
      for (const channexBooking of channexBookings) {
        try {
          const bookingId = channexBooking.id;
          
          if (existingIds.has(bookingId)) {
            console.log(`⏭️ Пропускаем существующее бронирование: ${bookingId}`);
            skipped++;
            continue;
          }

          // Конвертируем данные Channex в формат PMS
          const pmsBooking = await this.convertChannexToPMSBooking(channexBooking);
          
          // Вставляем в базу данных PMS
          const { error: insertError } = await supabase
            .from('bookings')
            .insert([pmsBooking]);
          
          if (insertError) {
            console.error(`❌ Ошибка вставки бронирования ${bookingId}:`, insertError);
            errors++;
          } else {
            console.log(`✅ Импортировано бронирование: ${bookingId}`);
            imported++;
          }
          
        } catch (error) {
          console.error('❌ Ошибка обработки бронирования:', error);
          errors++;
        }
      }

      console.log(`📊 Результат импорта: ${imported} импортировано, ${skipped} пропущено, ${errors} ошибок`);
      return { imported, skipped, errors };

    } catch (error) {
      console.error('❌ Ошибка импорта бронирований:', error);
      throw error;
    }
  }

  // --- КОНВЕРТАЦИЯ CHANNEX → PMS ---
  async convertChannexToPMSBooking(channexBooking) {
    const attrs = channexBooking.attributes;
    
    // Извлекаем данные о комнате из первой комнаты
    const firstRoom = attrs.rooms?.[0] || {};
    
    // Определяем номер комнаты из meta или генерируем
    let roomNumber = '101'; // по умолчанию
    if (attrs.meta?.pms_room_number) {
      roomNumber = attrs.meta.pms_room_number;
    } else {
      // Пытаемся определить по типу комнаты
      const roomTypeName = firstRoom.room_type?.title || '';
      if (roomTypeName.includes('Deluxe')) {
        roomNumber = '201';
      } else if (roomTypeName.includes('Suite')) {
        roomNumber = '301';
      }
    }

    // ИСПРАВЛЕНИЕ: Находим реальный room_id из базы данных
    let pmsRoomId = null;
    try {
      const { data: pmsRooms, error } = await supabase
        .from('rooms')
        .select('id, room_number')
        .eq('room_number', roomNumber);
      
      if (error) {
        console.error('❌ Ошибка поиска комнаты:', error);
      } else if (pmsRooms && pmsRooms.length > 0) {
        pmsRoomId = pmsRooms[0].id;
        console.log(`✅ Найдена комната в PMS: ${roomNumber} → ID ${pmsRoomId}`);
      } else {
        console.warn(`⚠️ Комната ${roomNumber} не найдена в PMS. Создаем бронирование без привязки к комнате.`);
      }
    } catch (dbError) {
      console.error('❌ Ошибка при поиске комнаты в базе:', dbError);
    }

    // Вычисляем общую сумму из days
    let totalAmount = 0;
    if (firstRoom.days) {
      totalAmount = Object.values(firstRoom.days).reduce((sum, price) => sum + parseFloat(price || 0), 0);
    }

    return {
      id: `channex-${channexBooking.id}`,
      external_booking_id: channexBooking.id,
      room_id: pmsRoomId, // Используем реальный ID комнаты или null
      
      // Даты
      check_in: attrs.arrival_date,
      check_out: attrs.departure_date,
      
      // Информация о госте
      guests: {
        full_name: `${attrs.customer?.name || ''} ${attrs.customer?.surname || ''}`.trim(),
        email: attrs.customer?.mail || attrs.customer?.email,
        phone: attrs.customer?.phone || '',
        address: attrs.customer?.address || '',
        city: attrs.customer?.city || '',
        country: attrs.customer?.country || 'GB'
      },
      
      // Финансовые данные
      guests_count: firstRoom.occupancy?.adults || 1,
      total_amount: totalAmount,
      currency: attrs.currency || 'GBP',
      
      // Мета информация
      status: this.mapChannexStatusToPMS(attrs.status),
      source: this.mapOtaNameToSource(attrs.ota_name),
      notes: attrs.notes || `Импортировано из Channex (${attrs.ota_name})`,
      
      // Данные синхронизации
      sync_status: 'synced',
      last_sync_at: new Date().toISOString(),
      channex_data: JSON.stringify(channexBooking),
      
      // Временные метки
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // --- МАППИНГ СТАТУСОВ CHANNEX → PMS ---
  mapChannexStatusToPMS(channexStatus) {
    const statusMapping = {
      'new': 'pending',
      'confirmed': 'confirmed',
      'checked_in': 'checked_in', 
      'checked_out': 'checked_out',
      'cancelled': 'cancelled'
    };
    
    return statusMapping[channexStatus] || 'pending';
  }

  // --- ОБРАТНЫЙ МАППИНГ OTA_NAME → SOURCE ---
  mapOtaNameToSource(otaName) {
    const reverseMapping = {
      'Booking.com': 'booking',
      'Airbnb': 'airbnb',
      'Expedia': 'expedia',
      'Agoda': 'agoda'
    };
    
    return reverseMapping[otaName] || 'direct';
  }

  // --- ОБРАБОТКА WEBHOOK СОБЫТИЙ ---
  async handleWebhook(webhookData) {
    console.log('🔔 Обработка webhook события в ChannexService:', webhookData.event);
    
    try {
      const eventType = webhookData.event || 'booking';
      const bookingId = webhookData.booking_id;
      const revisionId = webhookData.revision_id;
      
      console.log('📋 Данные webhook:', {
        eventType,
        bookingId,
        revisionId,
        propertyId: webhookData.property_id,
        timestamp: webhookData.timestamp
      });

      // Обрабатываем разные типы событий
      switch (eventType) {
        case 'test':
          console.log('🧪 Получен тестовый webhook - все работает!');
          return { success: true, message: 'Test webhook processed' };

        case 'booking_created':
        case 'booking_updated':
        case 'booking_cancelled':
          if (bookingId) {
            return await this.handleBookingWebhookEvent(eventType, bookingId, webhookData);
          }
          break;

        case 'booking_revision_created':
        case 'booking_revision_updated':
          if (revisionId) {
            return await this.handleBookingRevisionWebhookEvent(eventType, revisionId, webhookData);
          }
          break;

        default:
          console.log(`ℹ️ Неизвестный тип события: ${eventType}`);
          return { success: true, message: `Unknown event type: ${eventType}` };
      }

      return { success: true, message: 'Webhook processed' };

    } catch (error) {
      console.error('❌ Ошибка обработки webhook:', error);
      throw error;
    }
  }

  // --- ОБРАБОТКА WEBHOOK СОБЫТИЙ БРОНИРОВАНИЙ ---
  async handleBookingWebhookEvent(eventType, bookingId, webhookData) {
    console.log(`📋 Обработка booking webhook: ${eventType} для ID ${bookingId}`);
    
    try {
      // Получаем полные данные бронирования от Channex API
      const response = await this.apiRequest(`/bookings/${bookingId}`, 'GET');
      
      if (response && response.data) {
        const channexBooking = response.data;
        await this.syncChannexBookingToPMS(channexBooking, eventType);
        console.log(`✅ Бронирование ${bookingId} синхронизировано в PMS`);
        
        return { 
          success: true, 
          message: `Booking ${bookingId} synchronized`,
          booking_id: bookingId
        };
      } else {
        console.warn(`⚠️ Не удалось получить данные бронирования ${bookingId} - возможно тестовое`);
        return { 
          success: true, 
          message: `Test booking ${bookingId} - no sync needed` 
        };
      }

    } catch (error) {
      console.error(`❌ Ошибка обработки booking webhook:`, error);
      // НЕ пробрасываем ошибку дальше - webhook должен вернуть 200
      return { 
        success: false, 
        message: `Error processing booking ${bookingId}: ${error.message}` 
      };
    }
  }

  // --- ОБРАБОТКА WEBHOOK СОБЫТИЙ РЕВИЗИЙ БРОНИРОВАНИЙ ---
  async handleBookingRevisionWebhookEvent(eventType, revisionId, webhookData) {
    console.log(`📝 Обработка booking revision webhook: ${eventType} для revision ${revisionId}`);
    
    try {
      // Для ревизий можем использовать данные из webhook или запросить полную информацию
      if (webhookData.data && webhookData.data.booking) {
        await this.syncChannexBookingToPMS(webhookData.data.booking, eventType);
        
        return { 
          success: true, 
          message: `Booking revision ${revisionId} processed`,
          revision_id: revisionId
        };
      } else {
        // Запрашиваем полные данные ревизии
        const response = await this.apiRequest(`/booking_revisions/${revisionId}`, 'GET');
        if (response && response.data && response.data.booking) {
          await this.syncChannexBookingToPMS(response.data.booking, eventType);
          
          return { 
            success: true, 
            message: `Booking revision ${revisionId} synchronized`,
            revision_id: revisionId
          };
        }
      }

      return { 
        success: true, 
        message: `Revision ${revisionId} processed - no action needed` 
      };

    } catch (error) {
      console.error(`❌ Ошибка обработки booking revision webhook:`, error);
      return { 
        success: false, 
        message: `Error processing revision ${revisionId}: ${error.message}` 
      };
    }
  }

  // --- СИНХРОНИЗАЦИЯ CHANNEX БРОНИРОВАНИЯ В PMS ---
  async syncChannexBookingToPMS(channexBooking, eventType) {
    console.log('📥 Синхронизация Channex бронирования в PMS:', channexBooking.id);

    try {
      // Определяем канал по ota_name
      const otaName = channexBooking.attributes?.ota_name;
      console.log('📋 OTA канал:', otaName);

      let pmsBooking;
      
      // Используем соответствующий сервис для конвертации
      if (otaName === 'Airbnb') {
        // Динамический импорт AirbnbChannexService
        try {
          const { default: AirbnbChannexService } = await import('../airbnb/AirbnbChannexService.jsx');
          pmsBooking = AirbnbChannexService.convertToPMSFormat(channexBooking);
        } catch (importError) {
          console.warn('⚠️ AirbnbChannexService не найден, используем общий маппинг');
          pmsBooking = await this.convertChannexToPMSBooking(channexBooking);
        }
      } else {
        // Используем общий маппинг для других каналов
        pmsBooking = await this.convertChannexToPMSBooking(channexBooking);
      }

      // Проверяем доступность комнаты перед созданием/обновлением
      const roomAvailable = await this.checkRoomAvailability(
        pmsBooking.room_id,
        pmsBooking.check_in,
        pmsBooking.check_out,
        channexBooking.id // исключаем текущее бронирование при обновлении
      );

      if (!roomAvailable && eventType === 'booking_created') {
        console.error(`❌ Комната ${pmsBooking.room_id} недоступна на даты ${pmsBooking.check_in} - ${pmsBooking.check_out}`);
        
        // Логируем конфликт в базе
        await supabase
          .from('booking_conflicts')
          .insert({
            channex_booking_id: channexBooking.id,
            room_id: pmsBooking.room_id,
            check_in: pmsBooking.check_in,
            check_out: pmsBooking.check_out,
            conflict_reason: 'room_unavailable',
            created_at: new Date().toISOString()
          });

        throw new Error(`Room ${pmsBooking.room_id} is not available for dates ${pmsBooking.check_in} - ${pmsBooking.check_out}`);
      }

      // Проверяем, существует ли уже это бронирование (по external ID или ota_reservation_code)
      const { data: existingBooking } = await supabase
        .from('bookings')
        .select('id, room_id')
        .or(`external_booking_id.eq.${channexBooking.id},ota_reservation_code.eq.${channexBooking.attributes?.ota_reservation_code}`)
        .single();

      if (existingBooking) {
        // Обновляем существующее бронирование
        const { error } = await supabase
          .from('bookings')
          .update({
            ...pmsBooking,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingBooking.id);

        if (error) {
          console.error('❌ Ошибка обновления бронирования:', error);
          throw error;
        } else {
          console.log(`✅ Бронирование ${channexBooking.id} обновлено в PMS`);
        }

      } else {
        // Создаем новое бронирование
        const { error } = await supabase
          .from('bookings')
          .insert({
            ...pmsBooking,
            created_at: new Date().toISOString()
          });

        if (error) {
          console.error('❌ Ошибка создания бронирования:', error);
          throw error;
        } else {
          console.log(`✅ Бронирование ${channexBooking.id} создано в PMS`);
        }
      }

    } catch (error) {
      console.error('❌ Ошибка синхронизации Channex бронирования:', error);
      throw error;
    }
  }

  // --- ПРОВЕРКА ДОСТУПНОСТИ КОМНАТЫ ---
  async checkRoomAvailability(roomId, checkIn, checkOut, excludeBookingId = null) {
    console.log(`🔍 Проверка доступности комнаты ${roomId} на даты ${checkIn} - ${checkOut}`);
    
    try {
      // Проверяем пересечения с существующими бронированиями
      let query = supabase
        .from('bookings')
        .select('id, external_booking_id, check_in, check_out, status')
        .eq('room_id', roomId)
        .neq('status', 'cancelled')
        .or(`and(check_in.lte.${checkOut},check_out.gt.${checkIn})`);

      // Исключаем текущее бронирование при обновлении
      if (excludeBookingId) {
        query = query.neq('external_booking_id', excludeBookingId);
      }

      const { data: conflictingBookings, error } = await query;
      
      if (error) {
        console.error('❌ Ошибка проверки доступности комнаты:', error);
        return false;
      }

      if (conflictingBookings && conflictingBookings.length > 0) {
        console.warn(`⚠️ Найдены конфликтующие бронирования:`, conflictingBookings);
        return false;
      }

      console.log(`✅ Комната ${roomId} доступна на запрашиваемые даты`);
      return true;

    } catch (error) {
      console.error('❌ Ошибка при проверке доступности комнаты:', error);
      return false;
    }
  }
}

const channexService = new ChannexService();
export default channexService;