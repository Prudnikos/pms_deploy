import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Globe, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧', shortName: 'EN' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', shortName: 'RU' }
];

export default function LanguageSwitcher({ variant = 'default' }) {
  const { i18n, currentLanguage } = useTranslation();
  const [currentLang, setCurrentLang] = useState(
    languages.find(l => l.code === currentLanguage) || languages[0]
  );

  useEffect(() => {
    const lang = languages.find(l => l.code === i18n.language) || languages[0];
    setCurrentLang(lang);
  }, [i18n.language]);

  const changeLanguage = async (lng) => {
    console.log('Changing language to:', lng);
    
    try {
      await i18n.changeLanguage(lng);
      
      // Сохраняем в localStorage
      localStorage.setItem('pms_language', lng);
      
      // Сохраняем в cookie
      document.cookie = `pms_language=${lng};path=/;max-age=31536000`;
      
      // Обновляем состояние
      setCurrentLang(languages.find(l => l.code === lng));
      
      // Форсируем перерендер компонентов
      window.dispatchEvent(new Event('languagechange'));
      
      console.log('Language changed successfully to:', lng);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  // Компактная версия для хедера
  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" title="Change language">
            <span className="text-lg">{currentLang.flag}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {languages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => changeLanguage(language.code)}
              className="cursor-pointer"
            >
              <span className="mr-2 text-lg">{language.flag}</span>
              <span className="flex-1">{language.name}</span>
              {currentLang.code === language.code && (
                <Check className="h-4 w-4 ml-2 text-green-600" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Обычная версия
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLang.flag} {currentLang.name}</span>
          <span className="sm:hidden">{currentLang.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className="cursor-pointer"
          >
            <span className="mr-2 text-lg">{language.flag}</span>
            <span className="flex-1">{language.name}</span>
            {currentLang.code === language.code && (
              <Check className="h-4 w-4 ml-2 text-green-600" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}