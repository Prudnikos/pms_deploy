import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Download, User, Calendar, Home, DollarSign } from 'lucide-react';
import channexService from '@/services/channex/ChannexService.jsx';
import { supabase } from '@/lib/supabase';

export default function ChannexBookingManager() {
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [formData, setFormData] = useState({
    // Данные гостя
    guestName: '',
    guestSurname: '',
    guestEmail: '',
    guestPhone: '',
    guestCountry: 'GB',
    
    // Данные бронирования
    roomNumber: '101',
    checkIn: '',
    checkOut: '',
    guestsCount: 1,
    source: 'Open Channel',
    notes: ''
  });

  // Обработчики формы
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Создание бронирования через PMS
  const handleCreateBooking = async () => {
    setIsCreating(true);
    setResult(null);

    try {
      console.log('🎯 Создаем бронирование через PMS...');

      // 1. Создаем бронирование в PMS базе данных
      const pmsBookingData = {
        id: `pms-${Date.now()}`,
        room_id: `room-${formData.roomNumber}`,
        check_in: formData.checkIn,
        check_out: formData.checkOut,
        source: formData.source,
        
        guests: {
          full_name: `${formData.guestName} ${formData.guestSurname}`,
          email: formData.guestEmail,
          phone: formData.guestPhone,
          country: formData.guestCountry
        },
        
        guests_count: parseInt(formData.guestsCount),
        status: 'pending',
        notes: formData.notes,
        sync_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Вставляем в Supabase
      const { data: insertedBooking, error: insertError } = await supabase
        .from('bookings')
        .insert([pmsBookingData])
        .select()
        .single();

      if (insertError) throw insertError;

      console.log('✅ Бронирование создано в PMS:', insertedBooking.id);

      // 2. Отправляем в Channex
      const channexResult = await channexService.createBookingInChannex(insertedBooking);
      
      if (channexResult?.id) {
        // Обновляем запись с ID из Channex
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            external_booking_id: channexResult.id,
            sync_status: 'synced',
            last_sync_at: new Date().toISOString()
          })
          .eq('id', insertedBooking.id);

        if (updateError) throw updateError;

        setResult({
          success: true,
          message: 'Бронирование успешно создано!',
          pmsId: insertedBooking.id,
          channexId: channexResult.id
        });

        // Очищаем форму
        setFormData({
          guestName: '',
          guestSurname: '',
          guestEmail: '',
          guestPhone: '',
          guestCountry: 'GB',
          roomNumber: '101',
          checkIn: '',
          checkOut: '',
          guestsCount: 1,
          source: 'Open Channel',
          notes: ''
        });
      }

    } catch (error) {
      console.error('❌ Ошибка создания бронирования:', error);
      setResult({
        success: false,
        message: `Ошибка: ${error.message}`
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Импорт существующих бронирований из Channex
  const handleImportBookings = async () => {
    setIsImporting(true);
    setResult(null);

    try {
      console.log('📥 Импортируем бронирования из Channex...');
      const importResult = await channexService.importBookingsToPMS();
      
      setResult({
        success: true,
        message: `Импорт завершен: ${importResult.imported} добавлено, ${importResult.skipped} пропущено, ${importResult.errors} ошибок`,
        importStats: importResult
      });

    } catch (error) {
      console.error('❌ Ошибка импорта:', error);
      setResult({
        success: false,
        message: `Ошибка импорта: ${error.message}`
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Результат операции */}
      {result && (
        <Alert className={result.success ? "border-green-500" : "border-red-500"}>
          <AlertDescription className={result.success ? "text-green-700" : "text-red-700"}>
            {result.message}
            {result.pmsId && (
              <div className="mt-2 text-sm">
                <Badge variant="outline">PMS ID: {result.pmsId}</Badge>
                {result.channexId && (
                  <Badge variant="outline" className="ml-2">Channex ID: {result.channexId}</Badge>
                )}
              </div>
            )}
            {result.importStats && (
              <div className="mt-2 text-sm">
                <Badge variant="secondary">{result.importStats.imported} импортировано</Badge>
                <Badge variant="outline" className="ml-2">{result.importStats.skipped} пропущено</Badge>
                {result.importStats.errors > 0 && (
                  <Badge variant="destructive" className="ml-2">{result.importStats.errors} ошибок</Badge>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Импорт существующих бронирований */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Импорт из Channex
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Импортировать существующие бронирования из Channex в PMS
          </p>
          <Button 
            onClick={handleImportBookings}
            disabled={isImporting}
            className="w-full"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Импортируем...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Импортировать бронирования
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Создание нового бронирования */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Создать бронирование через PMS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Информация о госте */}
          <div className="space-y-3">
            <Label className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Информация о госте
            </Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="guestName">Имя *</Label>
                <Input
                  id="guestName"
                  value={formData.guestName}
                  onChange={(e) => handleInputChange('guestName', e.target.value)}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="guestSurname">Фамилия *</Label>
                <Input
                  id="guestSurname"
                  value={formData.guestSurname}
                  onChange={(e) => handleInputChange('guestSurname', e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="guestEmail">Email *</Label>
              <Input
                id="guestEmail"
                type="email"
                value={formData.guestEmail}
                onChange={(e) => handleInputChange('guestEmail', e.target.value)}
                placeholder="john.doe@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="guestPhone">Телефон</Label>
                <Input
                  id="guestPhone"
                  value={formData.guestPhone}
                  onChange={(e) => handleInputChange('guestPhone', e.target.value)}
                  placeholder="+44 123 456 789"
                />
              </div>
              <div>
                <Label htmlFor="guestCountry">Страна</Label>
                <Select value={formData.guestCountry} onValueChange={(value) => handleInputChange('guestCountry', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GB">Великобритания (GB)</SelectItem>
                    <SelectItem value="US">США (US)</SelectItem>
                    <SelectItem value="DE">Германия (DE)</SelectItem>
                    <SelectItem value="FR">Франция (FR)</SelectItem>
                    <SelectItem value="RU">Россия (RU)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Информация о бронировании */}
          <div className="space-y-3">
            <Label className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Информация о бронировании
            </Label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="checkIn">Заезд *</Label>
                <Input
                  id="checkIn"
                  type="date"
                  value={formData.checkIn}
                  onChange={(e) => handleInputChange('checkIn', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="checkOut">Выезд *</Label>
                <Input
                  id="checkOut"
                  type="date"
                  value={formData.checkOut}
                  onChange={(e) => handleInputChange('checkOut', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="roomNumber">Номер</Label>
                <Select value={formData.roomNumber} onValueChange={(value) => handleInputChange('roomNumber', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="101">101 (Standard Room - £100)</SelectItem>
                    <SelectItem value="201">201 (Deluxe Room - £200)</SelectItem>
                    <SelectItem value="301">301 (Suite - £300)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="guestsCount">Количество гостей</Label>
                <Select value={formData.guestsCount.toString()} onValueChange={(value) => handleInputChange('guestsCount', parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 гость</SelectItem>
                    <SelectItem value="2">2 гостя</SelectItem>
                    <SelectItem value="3">3 гостя</SelectItem>
                    <SelectItem value="4">4 гостя</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="source">Источник</Label>
              <Select value={formData.source} onValueChange={(value) => handleInputChange('source', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open Channel">Open Channel</SelectItem>
                  <SelectItem value="booking">Booking.com</SelectItem>
                  <SelectItem value="direct">Прямое бронирование</SelectItem>
                  <SelectItem value="phone">По телефону</SelectItem>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Примечания</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Дополнительные примечания..."
                rows={3}
              />
            </div>
          </div>

          <Button 
            onClick={handleCreateBooking}
            disabled={isCreating || !formData.guestName || !formData.guestSurname || !formData.guestEmail || !formData.checkIn || !formData.checkOut}
            className="w-full"
            size="lg"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Создаем бронирование...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Создать бронирование
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}