// hooks/useTranslation.js - Хук для удобного использования переводов
import { useTranslation as useI18nTranslation } from 'react-i18next';

export function useTranslation(namespace = 'common') {
  const { t, i18n } = useI18nTranslation(namespace);
  
  // Вспомогательные функции
  const formatDate = (date, format = 'short') => {
    return new Intl.DateTimeFormat(i18n.language, {
      dateStyle: format
    }).format(new Date(date));
  };
  
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: currency
    }).format(amount);
  };
  
  const formatNumber = (number) => {
    return new Intl.NumberFormat(i18n.language).format(number);
  };
  
  return {
    t,
    i18n,
    formatDate,
    formatCurrency,
    formatNumber,
    currentLanguage: i18n.language,
    changeLanguage: i18n.changeLanguage
  };
}