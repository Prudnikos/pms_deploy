import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Save, Printer, Download, History, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { getBookingsForRange, saveDailyReport, getDailyReport } from '@/components/integrations/Supabase';

export default function DailyReportModal({ isOpen, onClose, bookings }) {
  const [reportDate, setReportDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({
    // Автоматические данные (из базы)
    auto: {
      bookingsCount: 0,
      checkInsCount: 0,
      checkOutsCount: 0,
      currentOccupancy: 0,
      totalRevenue: 0,
      servicesRevenue: 0
    },
    // Ручные данные (редактируемые)
    manual: {
      // Доходы
      income: {
        hotel: 130600,
        restaurant: 2200,
        bank_account: 582000,
        expenses: 24000,
        currency_exchange_in: 0,
        currency_exchange_out: 0
      },
      // Расходы
      expenses: {
        products: 28019,
        laundry: 4400,
        household_expenses: 0,
        transport: 500,
        gas: 0,
        bottled_water: 0,
        utilities_security: 35000,
        rent_yohan_house: 15000,
        electricity: 0,
        gas_state: 0,
        internet: 0,
        workers: 24000,
        repair: 0,
        equipment_pump: 0,
        service: 0,
        // Дополнительные
        additional: {
          utilities_management: 0,
          hotel_chemistry: 0,
          pool_chemistry: 0,
          booking_exely: 632000,
          bonuses_management: 0,
          laundry_service: 0
        }
      }
    }
  });

  // Загрузка данных для выбранной даты
  useEffect(() => {
    loadReportData();
  }, [reportDate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const selectedDate = new Date(reportDate);
      const startDate = startOfDay(selectedDate);
      const endDate = endOfDay(selectedDate);

      // Загружаем брони за выбранный день
      const result = await getBookingsForRange(startDate, endDate);
      if (result.error) throw result.error;

      const dayBookings = result.data || [];
      
      // Вычисляем автоматические данные
      const checkInsToday = dayBookings.filter(booking => 
        format(parseISO(booking.check_in), 'yyyy-MM-dd') === reportDate
      );
      
      const checkOutsToday = dayBookings.filter(booking =>
        format(parseISO(booking.check_out), 'yyyy-MM-dd') === reportDate
      );
      
      const currentStays = dayBookings.filter(booking => {
        const checkIn = parseISO(booking.check_in);
        const checkOut = parseISO(booking.check_out);
        return checkIn <= selectedDate && checkOut > selectedDate;
      });

      const totalRevenue = dayBookings.reduce((sum, booking) => {
        return sum + (booking.total_amount || 0);
      }, 0);

      const servicesRevenue = dayBookings.reduce((sum, booking) => {
        return sum + (booking.services_total || 0);
      }, 0);

      // Загружаем сохраненный отчет из базы данных
      const savedReportResult = await getDailyReport(reportDate);
      const savedReport = savedReportResult.data;

      setReportData(prev => ({
        auto: {
          bookingsCount: dayBookings.length,
          checkInsCount: checkInsToday.length,
          checkOutsCount: checkOutsToday.length,
          currentOccupancy: currentStays.length,
          totalRevenue: totalRevenue,
          servicesRevenue: servicesRevenue
        },
        manual: savedReport ? {
          income: savedReport.income_data || prev.manual.income,
          expenses: savedReport.expenses_data || prev.manual.expenses
        } : prev.manual
      }));
      
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Вычисляемые итоги
  const totals = useMemo(() => {
    const totalIncome = Object.values(reportData.manual.income).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    const totalExpenses = Object.values(reportData.manual.expenses).reduce((sum, val) => {
      if (typeof val === 'object') {
        return sum + Object.values(val).reduce((subSum, subVal) => subSum + (parseFloat(subVal) || 0), 0);
      }
      return sum + (parseFloat(val) || 0);
    }, 0);
    
    return {
      income: totalIncome,
      expenses: totalExpenses,
      profit: totalIncome - totalExpenses,
      cashEnd: 453165 // Пример из скриншота
    };
  }, [reportData.manual]);

  const handleManualChange = (category, field, value) => {
    setReportData(prev => ({
      ...prev,
      manual: {
        ...prev.manual,
        [category]: {
          ...prev.manual[category],
          [field]: parseFloat(value) || 0
        }
      }
    }));
  };

  const handleAdditionalExpenseChange = (field, value) => {
    setReportData(prev => ({
      ...prev,
      manual: {
        ...prev.manual,
        expenses: {
          ...prev.manual.expenses,
          additional: {
            ...prev.manual.expenses.additional,
            [field]: parseFloat(value) || 0
          }
        }
      }
    }));
  };

  const handleSaveReport = async () => {
    try {
      setLoading(true);
      console.log('💾 Saving daily report for date:', reportDate);
      
      const result = await saveDailyReport(reportDate, reportData);
      
      if (result.error) {
        throw result.error;
      }
      
      console.log('✅ Daily report saved successfully');
      alert('Отчет успешно сохранен!');
      
    } catch (error) {
      console.error('❌ Error saving report:', error);
      alert(`Ошибка сохранения отчета: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleExportReport = (format) => {
    // TODO: Реализовать экспорт в PDF, Word, Excel
    alert(`Экспорт в ${format} будет реализован в следующем обновлении`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-blue-600" />
            Ежедневный отчет
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Выбор даты */}
          <div className="flex items-center gap-4">
            <Label htmlFor="report-date" className="text-sm font-medium">Дата отчета:</Label>
            <Input
              id="report-date"
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-48"
            />
            {loading && <span className="text-sm text-slate-500">Загрузка данных...</span>}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Левая колонка - Доходы */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-5 w-5" />
                  Приход
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-slate-500">Отель</Label>
                    <Input 
                      type="number"
                      value={reportData.manual.income.hotel}
                      onChange={(e) => handleManualChange('income', 'hotel', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Рестик</Label>
                    <Input 
                      type="number"
                      value={reportData.manual.income.restaurant}
                      onChange={(e) => handleManualChange('income', 'restaurant', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">С расчетного счета</Label>
                    <Input 
                      type="number"
                      value={reportData.manual.income.bank_account}
                      onChange={(e) => handleManualChange('income', 'bank_account', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Затраки</Label>
                    <Input 
                      type="number"
                      value={reportData.manual.income.expenses}
                      onChange={(e) => handleManualChange('income', 'expenses', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Обмен в рубли</Label>
                    <Input 
                      type="number"
                      value={reportData.manual.income.currency_exchange_in}
                      onChange={(e) => handleManualChange('income', 'currency_exchange_in', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Обмен из рублей</Label>
                    <Input 
                      type="number"
                      value={reportData.manual.income.currency_exchange_out}
                      onChange={(e) => handleManualChange('income', 'currency_exchange_out', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Итого приход:</span>
                  <span className="text-green-600">{totals.income.toLocaleString()} ₽</span>
                </div>
              </CardContent>
            </Card>

            {/* Правая колонка - Расходы */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <TrendingDown className="h-5 w-5" />
                  Расход
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 text-sm">
                  {/* Основные расходы */}
                  {Object.entries(reportData.manual.expenses).map(([key, value]) => {
                    if (key === 'additional') return null;
                    
                    const labels = {
                      products: 'Продукты',
                      laundry: 'Пани',
                      household_expenses: 'Хоз расход',
                      transport: 'Проезд',
                      gas: 'Газ',
                      bottled_water: 'Вода бутылированная',
                      utilities_security: 'З/п сотрудники самана охрана',
                      rent_yohan_house: 'Аренда жилья Йохан Дом',
                      electricity: 'Электричество',
                      gas_state: 'Вода гос',
                      internet: 'Интернет',
                      workers: 'Рабочие',
                      repair: 'Ремонт',
                      equipment_pump: 'Оборудование насос машинка',
                      service: 'Сервис'
                    };
                    
                    return (
                      <div key={key} className="flex justify-between items-center">
                        <Label className="text-xs text-slate-600 flex-1">{labels[key]}</Label>
                        <Input 
                          type="number"
                          value={value}
                          onChange={(e) => handleManualChange('expenses', key, e.target.value)}
                          className="w-24 h-8 text-xs"
                        />
                      </div>
                    );
                  })}
                  
                  <Separator />
                  <div className="text-xs font-medium text-slate-700 mt-4">Дополнительно</div>
                  
                  {/* Дополнительные расходы */}
                  {Object.entries(reportData.manual.expenses.additional).map(([key, value]) => {
                    const labels = {
                      utilities_management: 'З/п управл',
                      hotel_chemistry: 'Химия отель',
                      pool_chemistry: 'Химия бассейн',
                      booking_exely: 'Букинг Exely',
                      bonuses_management: 'Бонусы Управляющие',
                      laundry_service: 'Прачедная'
                    };
                    
                    return (
                      <div key={key} className="flex justify-between items-center">
                        <Label className="text-xs text-slate-600 flex-1">{labels[key]}</Label>
                        <Input 
                          type="number"
                          value={value}
                          onChange={(e) => handleAdditionalExpenseChange(key, e.target.value)}
                          className="w-24 h-8 text-xs"
                        />
                      </div>
                    );
                  })}
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Итого расход:</span>
                  <span className="text-red-600">{totals.expenses.toLocaleString()} ₽</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Итоговая информация */}
          <Card className="bg-slate-50">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{totals.income.toLocaleString()}</div>
                  <div className="text-sm text-slate-600">Общий приход</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{totals.expenses.toLocaleString()}</div>
                  <div className="text-sm text-slate-600">Общий расход</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totals.profit.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-600">Прибыль/Убыток</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{totals.cashEnd.toLocaleString()}</div>
                  <div className="text-sm text-slate-600">Остаток в кассе</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Автоматические данные из системы */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Данные из системы
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium">Общая выручка за день</div>
                  <div className="text-lg font-bold text-green-600">{reportData.auto.totalRevenue.toLocaleString()} ₽</div>
                </div>
                <div>
                  <div className="font-medium">Выручка от услуг</div>
                  <div className="text-lg font-bold text-blue-600">{reportData.auto.servicesRevenue.toLocaleString()} ₽</div>
                </div>
                <div>
                  <div className="font-medium">Загрузка номеров</div>
                  <div className="text-lg font-bold text-purple-600">{reportData.auto.currentOccupancy} номеров</div>
                </div>
                <div>
                  <div className="font-medium">Заезды за день</div>
                  <div className="text-lg font-bold text-green-600">{reportData.auto.checkInsCount}</div>
                </div>
                <div>
                  <div className="font-medium">Выезды за день</div>
                  <div className="text-lg font-bold text-blue-600">{reportData.auto.checkOutsCount}</div>
                </div>
                <div>
                  <div className="font-medium">Всего броней</div>
                  <div className="text-lg font-bold text-slate-600">{reportData.auto.bookingsCount}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="space-x-2">
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
          
          <Button variant="outline" onClick={() => alert('История изменений пока не реализована')}>
            <History className="h-4 w-4 mr-2" />
            История
          </Button>
          
          <Button variant="outline" onClick={handlePrintReport}>
            <Printer className="h-4 w-4 mr-2" />
            Печать
          </Button>
          
          <div className="relative">
            <Button variant="outline" onClick={() => {
              const menu = document.getElementById('export-menu');
              menu.classList.toggle('hidden');
            }}>
              <Download className="h-4 w-4 mr-2" />
              Сохранить
            </Button>
            <div id="export-menu" className="hidden absolute bottom-full left-0 mb-2 bg-white border rounded-lg shadow-lg z-50">
              <button onClick={() => handleExportReport('PDF')} className="block w-full text-left px-4 py-2 hover:bg-slate-50">PDF</button>
              <button onClick={() => handleExportReport('Word')} className="block w-full text-left px-4 py-2 hover:bg-slate-50">Word</button>
              <button onClick={() => handleExportReport('Excel')} className="block w-full text-left px-4 py-2 hover:bg-slate-50">Excel</button>
            </div>
          </div>
          
          <Button onClick={handleSaveReport} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}