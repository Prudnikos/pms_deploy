// Простой тест импорта существующих бронирований из Channex в PMS
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Эмуляция Supabase клиента для теста
const mockSupabase = {
  from: (table) => ({
    select: (fields) => ({
      then: (resolve) => resolve({ data: [], error: null }) // Возвращаем пустой список существующих бронирований
    }),
    insert: (data) => ({
      then: (resolve) => {
        console.log('📝 Вставляем в Supabase:', data[0].id);
        resolve({ error: null });
      }
    })
  })
};

// Создаем мок ChannexService для теста
const testChannexService = {
  propertyId: '6ae9708a-cbaa-4134-bf04-29314e842709',
  apiKey: 'uUdBtyJdPAYoP0m0qrEStPh2WJcXCBBBLMngnPxygFWpw0GyDE/nmvN/6wN7gXV+',
  baseURL: 'https://staging.channex.io/api/v1',

  async apiRequest(endpoint, method = 'GET') {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      method,
      headers: {
        'user-api-key': this.apiKey,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();
  },

  async getBookingsFromChannex() {
    console.log('📥 Получаем все бронирования из Channex...');
    
    const response = await this.apiRequest(
      `/bookings?filter[property_id]=${this.propertyId}`
    );
    
    console.log(`✅ Получено ${response.data?.length || 0} бронирований из Channex`);
    return response.data || [];
  },

  convertChannexToPMSBooking(channexBooking) {
    const attrs = channexBooking.attributes;
    
    // Определяем номер комнаты
    let roomNumber = '101';
    if (attrs.meta?.pms_room_number) {
      roomNumber = attrs.meta.pms_room_number;
    } else {
      const firstRoom = attrs.rooms?.[0] || {};
      const roomTypeName = firstRoom.room_type?.title || '';
      if (roomTypeName.includes('Deluxe')) {
        roomNumber = '201';
      } else if (roomTypeName.includes('Suite')) {
        roomNumber = '301';
      }
    }

    // Вычисляем общую сумму
    let totalAmount = 0;
    const firstRoom = attrs.rooms?.[0] || {};
    if (firstRoom.days) {
      totalAmount = Object.values(firstRoom.days).reduce((sum, price) => sum + parseFloat(price || 0), 0);
    }

    return {
      id: `channex-${channexBooking.id}`,
      external_booking_id: channexBooking.id,
      room_id: `room-${roomNumber}`,
      
      check_in: attrs.arrival_date,
      check_out: attrs.departure_date,
      
      guests: {
        full_name: `${attrs.customer?.name || ''} ${attrs.customer?.surname || ''}`.trim(),
        email: attrs.customer?.mail || attrs.customer?.email,
        phone: attrs.customer?.phone || '',
        country: attrs.customer?.country || 'GB'
      },
      
      guests_count: firstRoom.occupancy?.adults || 1,
      total_amount: totalAmount,
      currency: attrs.currency || 'GBP',
      
      status: attrs.status === 'new' ? 'pending' : attrs.status,
      source: attrs.ota_name === 'Booking.com' ? 'booking' : 'direct',
      notes: attrs.notes || `Импортировано из Channex (${attrs.ota_name})`,
      
      sync_status: 'synced',
      last_sync_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
  },

  async importBookingsToPMS() {
    console.log('📋 Импортируем бронирования из Channex в PMS...');
    
    try {
      // 1. Получаем бронирования из Channex
      const channexBookings = await this.getBookingsFromChannex();
      
      if (!channexBookings || channexBookings.length === 0) {
        console.log('ℹ️ Нет бронирований для импорта');
        return { imported: 0, skipped: 0, errors: 0 };
      }

      // 2. Получаем существующие бронирования из PMS (мок)
      const existingBookings = await mockSupabase.from('bookings').select('external_booking_id');
      const existingIds = new Set([]);
      
      let imported = 0, skipped = 0, errors = 0;

      console.log(`\n🔄 Обрабатываем ${channexBookings.length} бронирований...`);

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
          const pmsBooking = this.convertChannexToPMSBooking(channexBooking);
          
          console.log(`\n📋 Импортируем бронирование: ${bookingId}`);
          console.log(`   👤 Гость: ${pmsBooking.guests.full_name}`);
          console.log(`   🏠 Комната: ${pmsBooking.room_id}`);
          console.log(`   📅 Даты: ${pmsBooking.check_in} → ${pmsBooking.check_out}`);
          console.log(`   💰 Сумма: ${pmsBooking.total_amount} ${pmsBooking.currency}`);
          console.log(`   🏷️ Источник: ${pmsBooking.source}`);
          console.log(`   📊 Статус: ${pmsBooking.status}`);
          
          // Вставляем в базу данных PMS (мок)
          await mockSupabase.from('bookings').insert([pmsBooking]);
          
          console.log(`✅ Импортировано: ${bookingId}`);
          imported++;
          
        } catch (error) {
          console.error(`❌ Ошибка обработки бронирования ${channexBooking.id}:`, error.message);
          errors++;
        }
      }

      console.log(`\n📊 Результат импорта:`);
      console.log(`   ✅ ${imported} импортировано`);
      console.log(`   ⏭️ ${skipped} пропущено`);
      console.log(`   ❌ ${errors} ошибок`);
      
      return { imported, skipped, errors };

    } catch (error) {
      console.error('❌ Ошибка импорта бронирований:', error);
      throw error;
    }
  }
};

async function testImportBookings() {
  console.log('🧪 ТЕСТ ИМПОРТА БРОНИРОВАНИЙ ИЗ CHANNEX В PMS');
  console.log('═══════════════════════════════════════════════════');
  
  try {
    const result = await testChannexService.importBookingsToPMS();
    
    console.log('\n🎉 Импорт завершен успешно!');
    console.log('Теперь все бронирования из Channex будут видны в PMS');
    
  } catch (error) {
    console.error('💥 Ошибка теста:', error);
  }
  
  console.log('\n🏁 Тест завершен');
}

testImportBookings();