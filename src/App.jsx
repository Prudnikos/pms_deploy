import React, { Suspense, useEffect } from 'react';
import { useTranslation } from './hooks/useTranslation';
import Pages from "@/pages/index.jsx"; // Используем ваш главный компонент с роутами
import { Toaster } from "@/components/ui/toaster";
import './App.css';

// Компонент загрузки (без изменений)
const Loader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

function App() {
  const { i18n } = useTranslation();
  
  // Логика смены языка (без изменений)
  useEffect(() => {
    const savedLanguage = localStorage.getItem('pms_language') || 'en';
    if (savedLanguage && savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);
  
  return (
    <Suspense fallback={<Loader />}>
      {/* Теперь вся логика роутинга находится внутри компонента Pages, 
          что является более чистым подходом */}
      <Pages />
      <Toaster />
    </Suspense>
  );
}

export default App;