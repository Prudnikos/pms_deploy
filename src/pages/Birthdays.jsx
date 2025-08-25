import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Gift, User, Phone, Mail, MapPin, Search, Filter, Calendar } from 'lucide-react';
import { getBookingsForRange } from '@/components/integrations/Supabase';
import { useTranslation } from '@/hooks/useTranslation';

export default function Birthdays() {
  const { t, currentLanguage } = useTranslation('booking');
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const dateLocale = currentLanguage === 'ru' ? ru : enUS;

  useEffect(() => {
    // В будущем здесь будет загрузка именинников
    // Пока что показываем заглушку
    setBirthdays([]);
  }, [selectedDate]);

  const renderBirthdayCard = (birthday) => {
    return (
      <Card key={birthday.id} className="cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Gift className="h-5 w-5 text-pink-600" />
              <div>
                <h3 className="font-semibold text-slate-800">
                  {birthday.guest_name}
                </h3>
                <p className="text-sm text-slate-500">
                  День рождения сегодня
                </p>
              </div>
            </div>
            <Badge className="bg-pink-100 text-pink-800">
              🎂 {birthday.age} лет
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="h-3 w-3" />
                <span>Номер {birthday.room_number}</span>
              </div>
              
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="h-3 w-3" />
                <span>Проживает до {birthday.check_out}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="h-3 w-3" />
                <span>{birthday.phone}</span>
              </div>
              
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="h-3 w-3" />
                <span className="truncate">{birthday.email}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 p-3 bg-pink-50 rounded-lg">
            <p className="text-sm text-pink-700">
              💡 Не забудьте поздравить с днем рождения и предложить комплимент от отеля!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Дни рождения</h1>
          <p className="text-slate-600 mt-1">Именинники среди гостей</p>
        </div>
        
        <Badge variant="outline" className="text-base px-3 py-1">
          Всего: {birthdays.length}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-48">
            <Input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-slate-600">Загрузка дней рождения...</p>
        </div>
      ) : birthdays.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {birthdays.map(renderBirthdayCard)}
        </div>
      ) : (
        <Card className="p-8">
          <div className="text-center text-slate-500">
            <Gift className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold mb-2">Нет именинников</h3>
            <p>На {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: dateLocale })} дней рождения нет</p>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                💡 Функция отслеживания дней рождения будет активирована после добавления даты рождения в профили гостей
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}