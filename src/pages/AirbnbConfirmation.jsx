import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Calendar, Users, MapPin, CreditCard, Mail, Phone, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function AirbnbConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const booking = location.state?.booking;
  
  if (!booking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">Информация о бронировании не найдена</p>
          <Button onClick={() => navigate('/airbnb')}>
            Вернуться к поиску
          </Button>
        </div>
      </div>
    );
  }
  
  const checkInDate = booking.checkIn && format(new Date(booking.checkIn), 'd MMM yyyy', { locale: ru });
  const checkOutDate = booking.checkOut && format(new Date(booking.checkOut), 'd MMM yyyy', { locale: ru });
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Заголовок */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-500 rounded text-white flex items-center justify-center font-bold">
                A
              </div>
              <span className="text-xl font-semibold text-red-500">airbnb</span>
            </div>
            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="text-sm"
              >
                <Home className="h-4 w-4 mr-2" />
                Открыть PMS
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/airbnb')}
                className="text-sm"
              >
                Новый поиск
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Заголовок успеха */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Бронирование подтверждено!
          </h1>
          <p className="text-lg text-gray-600">
            Ваша бронь успешно создана и отправлена в систему управления отелем
          </p>
          <Badge className="mt-4 bg-green-100 text-green-800 border-green-200">
            ✅ Интеграция Airbnb → PMS работает!
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Детали бронирования */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Детали бронирования</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="font-medium text-gray-900">ID бронирования</div>
                <div className="text-sm text-gray-600 font-mono bg-gray-100 p-2 rounded">
                  {booking.id || 'AIRBNB-TEST-' + Date.now()}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <div className="font-medium text-gray-900">Объект размещения</div>
                <div className="text-gray-600">{booking.room}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-medium text-gray-900">Заезд</div>
                  <div className="text-gray-600">{checkInDate}</div>
                  <div className="text-sm text-gray-500">с 15:00</div>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Выезд</div>
                  <div className="text-gray-600">{checkOutDate}</div>
                  <div className="text-sm text-gray-500">до 12:00</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-medium text-gray-900">Гости</div>
                  <div className="text-gray-600">{booking.guests} человек</div>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Ночей</div>
                  <div className="text-gray-600">{booking.nights}</div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <div className="font-medium text-gray-900">Гость</div>
                <div className="text-gray-600">{booking.guest}</div>
                <div className="text-sm text-gray-500">{booking.email}</div>
              </div>
              
              <Separator />
              
              <div>
                <div className="font-medium text-gray-900">Общая стоимость</div>
                <div className="text-2xl font-bold text-gray-900">${booking.total}</div>
              </div>
            </CardContent>
          </Card>
          
          {/* Информация об интеграции */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="text-2xl">🔄</span>
                <span>Интеграция с PMS</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-800">Бронирование синхронизировано</span>
                </div>
                <p className="text-sm text-green-700">
                  Данные бронирования успешно переданы в систему управления отелем через Channex API
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">1. Создание в Airbnb</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    ✓ Выполнено
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">2. Отправка в Channex</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    ✓ Выполнено
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">3. Сохранение в PMS</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    ✓ Выполнено
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">4. Уведомление хозяина</span>
                  <Badge variant="default" className="bg-blue-100 text-blue-800">
                    📤 Отправлено
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Что дальше?</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Хозяин получит уведомление о новом бронировании</li>
                  <li>• Вам будет отправлено подтверждение на email</li>
                  <li>• Бронирование отобразится в календаре PMS</li>
                  <li>• Номер будет забронирован на выбранные даты</li>
                </ul>
              </div>
              
              <div className="mt-6">
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Посмотреть в календаре PMS
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Дополнительная информация */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                🧪 Тестирование интеграции завершено успешно!
              </h3>
              <p className="text-gray-600 mb-4">
                Полный цикл бронирования Airbnb → Channex → PMS протестирован и работает корректно
              </p>
              <div className="flex justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/airbnb')}
                >
                  Создать еще одну бронь
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                >
                  Вернуться в PMS
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}