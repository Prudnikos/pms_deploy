import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Users, MapPin, Star, Heart, Share, Wifi, Car, Tv, AirVent, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import airbnbMapping from '@/config/airbnb-mapping.json';

// Channex API configuration
const CHANNEX_API_URL = import.meta.env.VITE_CHANNEX_API_URL || 'https://staging.channex.io/api/v1';
const CHANNEX_API_KEY = import.meta.env.VITE_CHANNEX_API_KEY;
const CHANNEX_PROPERTY_ID = import.meta.env.VITE_CHANNEX_PROPERTY_ID;

/**
 * API запрос к Channex
 */
async function channexApiRequest(endpoint, method = 'GET') {
  const url = `${CHANNEX_API_URL}${endpoint}`;
  console.log(`🌐 Channex API запрос: ${method} ${url}`);

  try {
    const options = {
      method,
      headers: {
        'user-api-key': CHANNEX_API_KEY,
        'Content-Type': 'application/json',
      },
    };

    const response = await fetch(url, options);
    const responseText = await response.text();

    if (!response.ok) {
      console.error('❌ Channex API ошибка:', responseText);
      throw new Error(`API Error: ${response.status}`);
    }

    return responseText ? JSON.parse(responseText) : { success: true };
  } catch (error) {
    console.error('💥 Channex API Request Error:', error);
    throw error;
  }
}

/**
 * Получить Room Types из Channex
 */
async function getChannexRoomTypes() {
  console.log('🏨 Получаем типы номеров из Channex...');
  try {
    const response = await channexApiRequest(`/room_types?property_id=${CHANNEX_PROPERTY_ID}`);
    console.log('📋 Типы номеров из Channex:', response.data?.length || 0);
    return response.data || [];
  } catch (error) {
    console.error('❌ Ошибка получения типов номеров:', error);
    return [];
  }
}

/**
 * Получить Rate Plans из Channex
 */
async function getChannexRatePlans() {
  console.log('💰 Получаем тарифы из Channex...');
  try {
    const response = await channexApiRequest(`/rate_plans?property_id=${CHANNEX_PROPERTY_ID}`);
    console.log('📋 Тарифы из Channex:', response.data?.length || 0);
    return response.data || [];
  } catch (error) {
    console.error('❌ Ошибка получения тарифов:', error);
    return [];
  }
}

/**
 * Получить Availability (доступность) из Channex для дат
 */
async function getChannexAvailability(checkInDate, checkOutDate) {
  console.log('📊 Получаем доступность из Channex для дат:', { checkInDate, checkOutDate });
  
  try {
    // Правильный endpoint согласно документации
    const endpoint = `/restrictions?filter[property_id]=${CHANNEX_PROPERTY_ID}&filter[date][gte]=${checkInDate}&filter[date][lte]=${checkOutDate}&filter[restrictions]=availability`;
    
    console.log('🔍 Запрашиваем availability endpoint:', endpoint);
    const response = await channexApiRequest(endpoint);
    console.log('✅ Availability данные получены:', response.data);
    
    // Парсим availability данные по rate_plan_id
    const availabilityData = {};
    if (response.data) {
      for (const [ratePlanId, dates] of Object.entries(response.data)) {
        availabilityData[ratePlanId] = dates;
        console.log(`📋 Rate Plan ${ratePlanId}: ${Object.keys(dates).length} дат с availability`);
      }
    }
    
    return { success: true, data: availabilityData };
    
  } catch (error) {
    console.error('❌ Ошибка получения availability:', error);
    return { success: false, data: {} };
  }
}

/**
 * Преобразовать Channex данные в формат для Airbnb
 */
function convertChannexToAirbnbRooms(roomTypes, ratePlans, availabilityData, useAvailabilityData) {
  console.log('🔄 Конвертация Channex → Airbnb формат...');
  console.log('📊 Входные данные:', { roomTypes: roomTypes.length, ratePlans: ratePlans.length, availability: Object.keys(availabilityData).length });
  
  const airbnbRooms = [];
  const mapping = airbnbMapping.airbnb_integration.room_mapping;
  
  // Определяем режим работы на основе переданного параметра
  const useConfigFallback = !useAvailabilityData;
  console.log(useConfigFallback ? '🔄 Используем данные из конфига (availability API недоступен)' : '📈 Используем данные из availability API');
  
  // Проходим по каждому маппингу Airbnb
  for (const [airbnbId, config] of Object.entries(mapping)) {
    console.log(`🔍 Проверяем номер ${airbnbId}...`);
    
    const roomType = roomTypes.find(rt => rt.id === config.channex_room_type_id);
    const ratePlan = ratePlans.find(rp => rp.id === config.channex_rate_plan_id);
    
    if (!roomType) {
      console.log(`⚠️ Пропускаем ${airbnbId}: нет room_type с ID ${config.channex_room_type_id}`);
      continue;
    }
    
    if (!ratePlan) {
      console.log(`⚠️ Пропускаем ${airbnbId}: нет rate_plan с ID ${config.channex_rate_plan_id}`);
      continue;
    }
    
    // Определяем доступность из Channex API
    let minAvailability = Number.MAX_SAFE_INTEGER;
    let hasAvailability = false;
    
    if (useConfigFallback) {
      // Используем базовую доступность из конфига (fallback)
      minAvailability = config.availability_count || 1;
      hasAvailability = minAvailability > 0;
      console.log(`📊 ${airbnbId}: используем базовую доступность = ${minAvailability}`);
    } else {
      // Используем availability данные из API по rate_plan_id
      const ratePlanAvailability = availabilityData[config.channex_rate_plan_id];
      if (ratePlanAvailability) {
        // Находим минимальную доступность за период
        for (const [date, restrictions] of Object.entries(ratePlanAvailability)) {
          const availability = parseInt(restrictions.availability || 0);
          if (availability < minAvailability) {
            minAvailability = availability;
          }
          hasAvailability = true;
        }
        console.log(`📊 ${airbnbId}: минимальная availability за период = ${minAvailability}`);
      } else {
        console.log(`⚠️ ${airbnbId}: нет данных availability для rate_plan ${config.channex_rate_plan_id}`);
        // Fallback на config availability_count если нет данных в API
        if (config.availability_count && config.availability_count > 0) {
          minAvailability = config.availability_count;
          hasAvailability = true;
          console.log(`   📊 Используем fallback из конфига: ${config.availability_count}`);
        } else {
          minAvailability = 0;
        }
      }
    }
    
    if (!hasAvailability || minAvailability <= 0) {
      console.log(`❌ Пропускаем ${airbnbId}: нет доступности (min=${minAvailability})`);
      continue;
    }
    
    // Рассчитываем цену
    const basePrice = parseFloat(config.base_price);
    
    console.log(`✅ Добавляем номер ${airbnbId}: минимальная доступность=${minAvailability}, цена=${basePrice}`);
    
    airbnbRooms.push({
      id: airbnbId,
      title: config.airbnb_room_title,
      type: getAirbnbRoomType(airbnbId),
      location: 'Унаватуна, Шри-Ланка',
      guests: config.max_occupancy || 2,
      bedrooms: getBedrooms(airbnbId),
      bathrooms: getBathrooms(airbnbId),
      price: basePrice,
      rating: getRating(airbnbId),
      reviewsCount: getReviewsCount(airbnbId),
      images: getImages(airbnbId),
      amenities: getAmenities(),
      channex_room_type_id: config.channex_room_type_id,
      channex_rate_plan_id: config.channex_rate_plan_id,
      available: true,
      availability_count: minAvailability
    });
  }
  
  console.log(`🎯 Итого доступных номеров для Airbnb: ${airbnbRooms.length}`);
  return airbnbRooms;
}

// Вспомогательные функции для генерации mock данных
function getAirbnbRoomType(airbnbId) {
  const types = {
    'standard_apartment': 'Квартира целиком',
    'deluxe_suite': 'Квартира целиком',
    'bungalow': 'Бунгало целиком',
    'villa': 'Вилла целиком'
  };
  return types[airbnbId] || 'Номер целиком';
}

function getBedrooms(airbnbId) {
  const bedrooms = {
    'standard_apartment': 1,
    'deluxe_suite': 2,
    'bungalow': 1,
    'villa': 3
  };
  return bedrooms[airbnbId] || 1;
}

function getBathrooms(airbnbId) {
  const bathrooms = {
    'standard_apartment': 1,
    'deluxe_suite': 2,
    'bungalow': 1,
    'villa': 2
  };
  return bathrooms[airbnbId] || 1;
}

function getRating(airbnbId) {
  const ratings = {
    'standard_apartment': 4.95,
    'deluxe_suite': 4.89,
    'bungalow': 4.92,
    'villa': 4.97
  };
  return ratings[airbnbId] || 4.8;
}

function getReviewsCount(airbnbId) {
  const reviews = {
    'standard_apartment': 47,
    'deluxe_suite': 23,
    'bungalow': 31,
    'villa': 18
  };
  return reviews[airbnbId] || 25;
}

function getImages(airbnbId) {
  return [
    `/airbnb-mock/${airbnbId}-1.jpg`,
    `/airbnb-mock/${airbnbId}-2.jpg`,
    `/airbnb-mock/${airbnbId}-3.jpg`,
    `/airbnb-mock/${airbnbId}-4.jpg`
  ];
}

function getAmenities() {
  return [
    { icon: Wifi, label: 'Wi-Fi' },
    { icon: Car, label: 'Бесплатная парковка' },
    { icon: Tv, label: 'ТВ' },
    { icon: AirVent, label: 'Кондиционер' },
    { icon: Utensils, label: 'Кухня' }
  ];
}

export default function AirbnbSimulator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checkIn, setCheckIn] = useState(searchParams.get('checkin') || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkout') || '');
  const [guestsCount, setGuestsCount] = useState(parseInt(searchParams.get('guests')) || 2);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  // Реальная проверка доступности номеров из Channex Inventory API
  const checkAvailability = async () => {
    if (!checkIn || !checkOut) return;
    
    setLoading(true);
    console.log('🔍 Получаем реальные данные из Channex для дат:', { checkIn, checkOut, guestsCount });
    
    try {
      // Параллельно получаем все необходимые данные из Channex
      console.log('🚀 Запрашиваем данные из Channex API...');
      const [roomTypes, ratePlans, availabilityResponse] = await Promise.all([
        getChannexRoomTypes(),
        getChannexRatePlans(), 
        getChannexAvailability(checkIn, checkOut)
      ]);
      
      // Определяем какие данные используем
      const availabilityData = availabilityResponse.data || {};
      const useAvailabilityData = availabilityResponse.success;

      console.log('📊 Channex данные получены:', {
        roomTypes: roomTypes.length,
        ratePlans: ratePlans.length,
        availability: Object.keys(availabilityData).length,
        availabilityMode: useAvailabilityData ? 'API' : 'Config'
      });

      // Детальное логирование для поиска Suite ID
      console.log('🔍 ДЕТАЛЬНЫЕ ДАННЫЕ CHANNEX:');
      console.log('📋 Room Types:', roomTypes.map(rt => ({
        id: rt.id,
        title: rt.attributes.title,
        count: rt.attributes.count
      })));
      console.log('💰 Rate Plans:', ratePlans.map(rp => ({
        id: rp.id, 
        title: rp.attributes.title,
        room_type_id: rp.attributes.room_type_id
      })));
      
      // Сохраняем данные в window для отладки
      window.lastRatePlansData = ratePlans;
      window.lastRoomTypesData = roomTypes;

      // Преобразуем Channex данные в формат Airbnb
      const airbnbRooms = convertChannexToAirbnbRooms(roomTypes, ratePlans, availabilityData, useAvailabilityData);
      
      // Фильтруем по вместимости гостей
      const filteredRooms = airbnbRooms.filter(room => {
        const hasEnoughCapacity = room.guests >= guestsCount;
        console.log(`🏠 ${room.title}: вместимость=${room.guests}≥${guestsCount}=${hasEnoughCapacity}`);
        return hasEnoughCapacity;
      });

      setAvailableRooms(filteredRooms);
      console.log(`✅ Итого доступных номеров: ${filteredRooms.length} из ${airbnbRooms.length} (отфильтровано по вместимости)`);
      
    } catch (error) {
      console.error('❌ Ошибка получения данных из Channex:', error);
      // В случае ошибки показываем пустой список
      setAvailableRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (checkIn && checkOut) {
      checkAvailability();
    }
  }, [checkIn, checkOut, guestsCount]);

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  };

  const handleBookRoom = (room) => {
    const bookingParams = new URLSearchParams({
      roomId: room.id,
      checkin: checkIn,
      checkout: checkOut,
      guests: guestsCount.toString(),
      nights: calculateNights().toString(),
      totalPrice: (room.price * calculateNights()).toString()
    });

    navigate(`/airbnb-booking?${bookingParams.toString()}`);
  };

  const nights = calculateNights();

  return (
    <div className="min-h-screen bg-white">
      {/* Заголовок в стиле Airbnb */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-500 rounded text-white flex items-center justify-center font-bold">
                A
              </div>
              <span className="text-xl font-semibold text-red-500">airbnb</span>
              <span className="text-sm text-gray-500 ml-4">🧪 Тестовая среда для интеграции PMS</span>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="text-sm"
            >
              ← Вернуться в PMS
            </Button>
          </div>
        </div>
      </div>

      {/* Поиск */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Отели в Унаватуне</h1>
          <p className="text-gray-600">Более {availableRooms.length} вариантов размещения</p>
        </div>

        {/* Форма поиска */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Прибытие
                </label>
                <Input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Выезд
                </label>
                <Input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  min={checkIn || format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Гости
                </label>
                <Input
                  type="number"
                  value={guestsCount}
                  onChange={(e) => setGuestsCount(parseInt(e.target.value))}
                  min="1"
                  max="10"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={checkAvailability}
                  disabled={!checkIn || !checkOut || loading}
                  className="w-full bg-red-500 hover:bg-red-600 text-white"
                >
                  {loading ? 'Поиск...' : 'Найти жилье'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Результаты поиска */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Ищем доступные варианты...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {availableRooms.map((room) => (
              <Card key={room.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <div
                  className="relative"
                  onClick={() => handleBookRoom(room)}
                >
                  {/* Заглушка для изображения */}
                  <div className="h-64 bg-gradient-to-r from-gray-200 to-gray-300 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-2">🏠</div>
                        <p className="text-gray-600 font-medium">{room.title}</p>
                      </div>
                    </div>
                    
                    {/* Кнопки действий */}
                    <div className="absolute top-3 right-3 flex space-x-2">
                      <Button size="sm" variant="outline" className="bg-white/90 backdrop-blur-sm">
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="bg-white/90 backdrop-blur-sm">
                        <Share className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">{room.type}</span>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="text-sm font-medium">{room.rating}</span>
                        <span className="text-sm text-gray-500">({room.reviewsCount})</span>
                      </div>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1">{room.title}</h3>
                    
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      {room.location}
                    </div>

                    <div className="flex items-center text-sm text-gray-600 mb-3">
                      <Users className="h-4 w-4 mr-1" />
                      {room.guests} гостей · {room.bedrooms} спальни · {room.bathrooms} ванная
                    </div>

                    {/* Удобства */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {room.amenities.slice(0, 3).map((amenity, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <amenity.icon className="h-3 w-3 mr-1" />
                          {amenity.label}
                        </Badge>
                      ))}
                      {room.amenities.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{room.amenities.length - 3}
                        </Badge>
                      )}
                    </div>

                    <Separator className="my-3" />

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xl font-semibold">${room.price}</span>
                        <span className="text-gray-600"> / ночь</span>
                        {nights > 0 && (
                          <div className="text-sm text-gray-600">
                            ${room.price * nights} за {nights} ноч.
                          </div>
                        )}
                      </div>
                      <Badge variant={room.available ? "default" : "destructive"}>
                        {room.available ? "Доступно" : "Занято"}
                      </Badge>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}

        {availableRooms.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">😔</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Нет доступных вариантов
            </h3>
            <p className="text-gray-600 mb-4">
              На выбранные даты нет свободных номеров для {guestsCount} гостей
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setCheckIn('');
                setCheckOut('');
                setGuestsCount(2);
                setAvailableRooms(mockRooms);
              }}
            >
              Изменить параметры поиска
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}