import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Users, MapPin, Star, Heart, Share, Wifi, Car, Tv, AirVent, Utensils, ArrowLeft, CreditCard, Shield, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import airbnbChannexService from '@/services/airbnb/AirbnbChannexService';

// Данные номеров (синхронизированы с airbnb-mapping.json)
const roomsData = {
  'standard_room': {
    title: 'Standard Room',
    type: 'Комната целиком',
    location: 'Унаватуна, Шри-Ланка',
    guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    rating: 4.95,
    reviewsCount: 47,
    amenities: [
      { icon: Wifi, label: 'Wi-Fi' },
      { icon: Car, label: 'Бесплатная парковка' },
      { icon: Tv, label: 'ТВ' },
      { icon: AirVent, label: 'Кондиционер' },
      { icon: Utensils, label: 'Кухня' }
    ],
    host: {
      name: 'Константин',
      avatar: '👨‍💼',
      yearsHosting: 4
    }
  },
  'deluxe_room': {
    title: 'Deluxe Room',
    type: 'Комната люкс',
    location: 'Унаватуна, Шри-Ланка',
    guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    rating: 4.89,
    reviewsCount: 23,
    amenities: [
      { icon: Wifi, label: 'Wi-Fi' },
      { icon: Car, label: 'Бесплатная парковка' },
      { icon: Tv, label: 'ТВ' },
      { icon: AirVent, label: 'Кондиционер' },
      { icon: Utensils, label: 'Кухня' }
    ],
    host: {
      name: 'Константин',
      avatar: '👨‍💼',
      yearsHosting: 4
    }
  },
  'suite': {
    title: 'Suite',
    type: 'Люкс целиком',
    location: 'Унаватуна, Шри-Ланка',
    guests: 4,
    bedrooms: 2,
    bathrooms: 2,
    rating: 4.92,
    reviewsCount: 31,
    amenities: [
      { icon: Wifi, label: 'Wi-Fi' },
      { icon: Car, label: 'Бесплатная парковка' },
      { icon: Tv, label: 'ТВ' },
      { icon: AirVent, label: 'Кондиционер' },
      { icon: Utensils, label: 'Кухня' }
    ],
    host: {
      name: 'Константин',
      avatar: '👨‍💼',
      yearsHosting: 4
    }
  }
};

export default function AirbnbBooking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Параметры бронирования
  const roomId = searchParams.get('roomId');
  const checkIn = searchParams.get('checkin');
  const checkOut = searchParams.get('checkout');
  const guestsCount = parseInt(searchParams.get('guests'));
  const nights = parseInt(searchParams.get('nights'));
  const pricePerNight = parseInt(searchParams.get('totalPrice')) / nights;
  
  const room = roomsData[roomId];
  
  // Состояние формы
  const [guestInfo, setGuestInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: ''
  });
  
  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: '',
    country: 'Россия',
    postalCode: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  
  // Расчет стоимости
  const subtotal = pricePerNight * nights;
  const serviceFee = Math.round(subtotal * 0.14); // 14% комиссии Airbnb
  const taxes = Math.round(subtotal * 0.05); // 5% налоги
  const total = subtotal + serviceFee + taxes;
  
  const handleBooking = async () => {
    if (!agreeToTerms) {
      alert('Необходимо согласиться с условиями');
      return;
    }
    
    if (!guestInfo.firstName || !guestInfo.lastName || !guestInfo.email) {
      alert('Заполните все обязательные поля');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('🏠 Начинаем процесс бронирования Airbnb');
      console.log('📋 Данные бронирования:', {
        roomId,
        room: room.title,
        checkIn,
        checkOut,
        nights,
        guests: guestsCount,
        total,
        guest: `${guestInfo.firstName} ${guestInfo.lastName}`
      });
      
      // Формируем данные для отправки в PMS через AirbnbChannexService
      const bookingData = {
        room_type: roomId,
        check_in: checkIn,
        check_out: checkOut,
        guest_first_name: guestInfo.firstName,
        guest_last_name: guestInfo.lastName,
        guest_email: guestInfo.email,
        guest_phone: guestInfo.phone,
        adults: guestsCount,
        children: 0,
        notes: guestInfo.message,
        total_amount: total,  // Добавляем общую сумму
        total_price: total,   // Дублируем для совместимости
        price_per_night: pricePerNight,  // Цена за ночь
        nights: nights,  // Количество ночей
        test: true // Помечаем как тестовое бронирование
      };
      
      console.log('📤 Отправляем бронирование через AirbnbChannexService...');
      
      // Отправляем бронирование через наш сервис
      const result = await airbnbChannexService.createAirbnbBooking(bookingData);
      
      console.log('✅ Бронирование успешно создано:', result);
      
      // Обновляем availability в Channex чтобы предотвратить овербукинг
      try {
        const dates = [];
        const currentDate = new Date(checkIn);
        while (currentDate < new Date(checkOut)) {
          dates.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Уменьшаем availability на 1 для забронированных дат
        const currentAvailability = room.availability_count || 1;
        const newAvailability = Math.max(0, currentAvailability - 1);
        
        console.log(`📉 Обновляем availability: ${room.id} с ${currentAvailability} до ${newAvailability}`);
        await airbnbChannexService.updateAirbnbAvailability(room.id, dates, newAvailability);
        
      } catch (availabilityError) {
        console.error('⚠️ Ошибка обновления availability:', availabilityError);
        // Не прерываем процесс, если availability не обновился
      }
      
      // Показываем страницу подтверждения
      navigate('/airbnb-confirmation', {
        state: {
          booking: {
            id: result.data?.id,
            room: room.title,
            checkIn,
            checkOut,
            nights,
            guests: guestsCount,
            total,
            guest: `${guestInfo.firstName} ${guestInfo.lastName}`,
            email: guestInfo.email
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Ошибка создания бронирования:', error);
      alert('Произошла ошибка при создании бронирования. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };
  
  if (!room) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">Номер не найден</p>
          <Button onClick={() => navigate('/airbnb')}>
            Вернуться к поиску
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Заголовок */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/airbnb')}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-red-500 rounded text-white flex items-center justify-center font-bold">
                  A
                </div>
                <span className="text-xl font-semibold text-red-500">airbnb</span>
              </div>
            </div>
            <span className="text-sm text-gray-500">🧪 Тестовая среда</span>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Левая колонка - информация о жилье */}
          <div>
            <h1 className="text-3xl font-semibold mb-6">Подтвердите и оплатите</h1>
            
            {/* Карточка жилья */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex space-x-4">
                  <div className="w-24 h-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🏠</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                      <span>{room.type}</span>
                      <span>•</span>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 fill-current mr-1" />
                        <span>{room.rating} ({room.reviewsCount})</span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{room.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {room.guests} гостей · {room.bedrooms} спальни · {room.bathrooms} ванная
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {room.amenities.slice(0, 4).map((amenity, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <amenity.icon className="h-3 w-3 mr-1" />
                          {amenity.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Детали поездки */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Ваша поездка</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Даты</div>
                    <div className="text-sm text-gray-600">
                      {checkIn && format(new Date(checkIn), 'd MMM', { locale: ru })} - {checkOut && format(new Date(checkOut), 'd MMM yyyy', { locale: ru })}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-sm underline">
                    Изменить
                  </Button>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Гости</div>
                    <div className="text-sm text-gray-600">{guestsCount} гостей</div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-sm underline">
                    Изменить
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Информация о хозяине */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl">
                    {room.host.avatar}
                  </div>
                  <div>
                    <div className="font-medium">Хозяин: {room.host.name}</div>
                    <div className="text-sm text-gray-600">{room.host.yearsHosting} года принимает гостей</div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span>Личность подтверждена</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span>Высокий рейтинг хозяина</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span>Быстро отвечает</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Правая колонка - форма бронирования */}
          <div>
            <Card className="sticky top-6">
              <CardContent className="p-6">
                {/* Информация о гостях */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-4">Информация о гостях</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">Имя *</Label>
                        <Input
                          id="firstName"
                          value={guestInfo.firstName}
                          onChange={(e) => setGuestInfo({...guestInfo, firstName: e.target.value})}
                          placeholder="Введите имя"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Фамилия *</Label>
                        <Input
                          id="lastName"
                          value={guestInfo.lastName}
                          onChange={(e) => setGuestInfo({...guestInfo, lastName: e.target.value})}
                          placeholder="Введите фамилию"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Электронная почта *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={guestInfo.email}
                        onChange={(e) => setGuestInfo({...guestInfo, email: e.target.value})}
                        placeholder="example@email.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Номер телефона</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={guestInfo.phone}
                        onChange={(e) => setGuestInfo({...guestInfo, phone: e.target.value})}
                        placeholder="+7 (900) 000-00-00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="message">Сообщение хозяину (необязательно)</Label>
                      <Textarea
                        id="message"
                        value={guestInfo.message}
                        onChange={(e) => setGuestInfo({...guestInfo, message: e.target.value})}
                        placeholder="Расскажите хозяину о цели поездки"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                {/* Информация о платеже */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-4">Способ оплаты</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cardNumber">Номер карты *</Label>
                      <div className="relative">
                        <Input
                          id="cardNumber"
                          value={paymentInfo.cardNumber}
                          onChange={(e) => setPaymentInfo({...paymentInfo, cardNumber: e.target.value})}
                          placeholder="1234 5678 9012 3456"
                          className="pl-10"
                        />
                        <CreditCard className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">💳 Тестовая карта: 4242 4242 4242 4242</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiryDate">Срок действия</Label>
                        <Input
                          id="expiryDate"
                          value={paymentInfo.expiryDate}
                          onChange={(e) => setPaymentInfo({...paymentInfo, expiryDate: e.target.value})}
                          placeholder="MM/YY"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          value={paymentInfo.cvv}
                          onChange={(e) => setPaymentInfo({...paymentInfo, cvv: e.target.value})}
                          placeholder="123"
                          maxLength={4}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="nameOnCard">Имя на карте</Label>
                      <Input
                        id="nameOnCard"
                        value={paymentInfo.nameOnCard}
                        onChange={(e) => setPaymentInfo({...paymentInfo, nameOnCard: e.target.value})}
                        placeholder="IVAN PETROV"
                      />
                    </div>
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                {/* Детали цены */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-4">Детали цены</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>${pricePerNight} × {nights} ноч.</span>
                      <span>${subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Сервисный сбор Airbnb</span>
                      <span>${serviceFee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Налоги</span>
                      <span>${taxes}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-base">
                      <span>Итого (USD)</span>
                      <span>${total}</span>
                    </div>
                  </div>
                </div>
                
                {/* Согласие с условиями */}
                <div className="flex items-start space-x-2 mb-6">
                  <Checkbox
                    id="terms"
                    checked={agreeToTerms}
                    onCheckedChange={setAgreeToTerms}
                    className="mt-1"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                    Я согласен с{' '}
                    <Button variant="link" className="p-0 h-auto text-sm underline">
                      правилами сервиса
                    </Button>
                    {' '}и{' '}
                    <Button variant="link" className="p-0 h-auto text-sm underline">
                      политикой отмены
                    </Button>
                    , а также подтверждаю, что понимаю, как хозяин будет обрабатывать мои персональные данные.
                  </label>
                </div>
                
                {/* Кнопка бронирования */}
                <Button
                  onClick={handleBooking}
                  disabled={loading || !agreeToTerms}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-3 text-lg font-semibold"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Обработка...</span>
                    </div>
                  ) : (
                    `Забронировать за $${total}`
                  )}
                </Button>
                
                <div className="flex items-center justify-center mt-4 text-xs text-gray-500">
                  <Info className="h-4 w-4 mr-1" />
                  <span>🧪 Тестовое бронирование - реальные платежи не производятся</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}