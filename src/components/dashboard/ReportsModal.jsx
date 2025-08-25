import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Calendar, BarChart3, TrendingUp, DollarSign } from 'lucide-react';
import DailyReportModal from './DailyReportModal';

const reportTypes = [
  {
    id: 'daily',
    name: 'Ежедневный отчет',
    description: 'Детальный отчет за день: доходы, расходы, загрузка',
    icon: Calendar,
    color: 'from-blue-500 to-blue-600',
    available: true
  },
  {
    id: 'weekly',
    name: 'Недельный отчет',
    description: 'Сводка за неделю с анализом трендов',
    icon: BarChart3,
    color: 'from-green-500 to-green-600',
    available: false
  },
  {
    id: 'monthly',
    name: 'Месячный отчет',
    description: 'Полная финансовая отчетность за месяц',
    icon: TrendingUp,
    color: 'from-purple-500 to-purple-600',
    available: false
  },
  {
    id: 'financial',
    name: 'Финансовый отчет',
    description: 'Подробный анализ доходов и расходов',
    icon: DollarSign,
    color: 'from-orange-500 to-orange-600',
    available: false
  }
];

export default function ReportsModal({ isOpen, onClose, bookings }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDailyReport, setShowDailyReport] = useState(false);

  const handleReportSelect = (reportType) => {
    if (reportType.id === 'daily') {
      setShowDailyReport(true);
    } else {
      // Для других отчетов пока показываем уведомление
      alert(`${reportType.name} будет доступен в следующих обновлениях`);
    }
  };

  const handleCloseDailyReport = () => {
    setShowDailyReport(false);
    onClose(); // Закрываем и основное меню отчетов
  };

  if (showDailyReport) {
    return (
      <DailyReportModal 
        isOpen={true}
        onClose={handleCloseDailyReport}
        bookings={bookings}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Отчеты
          </DialogTitle>
          <DialogDescription>
            Выберите тип отчета для генерации
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {reportTypes.map((report) => {
            const IconComponent = report.icon;
            
            return (
              <Card 
                key={report.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  report.available 
                    ? 'hover:scale-105 border-2 border-transparent hover:border-blue-200' 
                    : 'opacity-60 cursor-not-allowed'
                }`}
                onClick={() => report.available && handleReportSelect(report)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${report.color} text-white`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-slate-800">
                        {report.name}
                        {!report.available && (
                          <span className="ml-2 text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded">
                            Скоро
                          </span>
                        )}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {report.description}
                  </p>
                  
                  {report.available && (
                    <div className="mt-4">
                      <Button 
                        size="sm" 
                        className={`bg-gradient-to-r ${report.color} hover:opacity-90`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReportSelect(report);
                        }}
                      >
                        Создать отчет
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="p-4 bg-slate-50 rounded-lg mx-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">Возможности отчетов:</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Автоматическая загрузка данных из системы</li>
                <li>• Возможность ручного редактирования всех полей</li>
                <li>• Сохранение истории изменений</li>
                <li>• Экспорт в PDF, Word, Excel</li>
                <li>• Печать готовых отчетов</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}