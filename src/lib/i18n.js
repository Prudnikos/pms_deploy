import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Импортируем переводы НАПРЯМУЮ (не из JSON файлов пока)
const resources = {
  en: {
    common: {
      app: {
        name: "Hotel PMS",
        tagline: "Professional Property Management System"
      },
      navigation: {
        dashboard: "Dashboard",
        bookings: "Bookings",
        calendar: "Calendar",
        rooms: "Rooms",
        guests: "Guests",
        chat: "Messages",
        channels: "Channel Manager",
        reports: "Reports",
        settings: "Settings"
      },
      actions: {
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        create: "Create",
        search: "Search",
        filter: "Filter",
        export: "Export",
        import: "Import",
        sync: "Synchronize",
        connect: "Connect",
        disconnect: "Disconnect",
        refresh: "Refresh",
        back: "Back",
        next: "Next",
        previous: "Previous",
        close: "Close",
        confirm: "Confirm",
        select: "Select",
        signOut: "Sign Out"
      }
    },
    dashboard: {
      title: "Booking Calendar",
      subtitle: "Manage your reservations",
      navigation: {
        previousMonth: "Previous month",
        nextMonth: "Next month",
        today: "Today"
      },
      actions: {
        newReservation: "New reservation",
        signOut: "Sign out"
      },
      grid: {
        rooms: "Rooms",
        loading: "Loading calendar...",
        noData: "No rooms available",
        dragToSelect: "Drag to select dates"
      },
      errors: {
        loadingBookings: "Error loading bookings",
        loadingData: "Error loading data"
      }
    },
    bookings: {
      title: "Bookings",
      search: {
        placeholder: "Search by guest name..."
      },
      filter: {
        allStatuses: "All statuses",
        byStatus: "Filter by status"
      },
      status: {
        confirmed: "Confirmed",
        pending: "Pending",
        cancelled: "Cancelled",
        checked_in: "Checked In",
        checked_out: "Checked Out"
      },
      table: {
        guest: "Guest",
        source: "Source",
        room: "Room",
        dates: "Dates",
        status: "Status",
        accommodation: "Accommodation",
        services: "Services",
        paid: "Paid",
        balance: "Balance",
        noResults: "No bookings found",
        unknownGuest: "Unknown Guest"
      },
      actions: {
        newBooking: "New Booking",
        edit: "Edit",
        cancel: "Cancel",
        checkIn: "Check In",
        checkOut: "Check Out"
      }
    },
    auth: {
      appName: "Hotel PMS",
      subtitle: "Staff access portal",
      tabs: {
        signIn: "Sign In",
        signUp: "Sign Up"
      },
      fields: {
        email: "Email",
        password: "Password"
      },
      placeholders: {
        email: "Enter your email",
        password: "Enter your password",
        passwordHint: "Minimum 6 characters"
      },
      buttons: {
        signIn: "Sign In",
        signUp: "Sign Up",
        signingIn: "Signing in...",
        signingUp: "Creating account...",
        signInWithGoogle: "Sign in with Google"
      },
      divider: "OR",
      messages: {
        checkEmail: "Check your email to confirm registration!"
      },
      errors: {
        invalidCredentials: "Invalid email or password",
        emailNotConfirmed: "Please confirm your email first",
        signInFailed: "Sign in failed. Please try again.",
        signUpFailed: "Registration failed. Please try again.",
        googleSignIn: "Google sign in failed",
        passwordTooShort: "Password must be at least 6 characters",
        emailAlreadyRegistered: "This email is already registered"
      }
    },
    chat: {
      title: "Messages",
      header: "Chats",
      search: {
        placeholder: "Search messages..."
      },
      conversation: {
        selectChat: "Select a chat",
        selectChatDescription: "Choose a chat from the list to view the conversation",
        noMessages: "No messages yet",
        typeMessage: "Type a message...",
        send: "Send",
        unknownContact: "Unknown contact"
      }
    },
     booking: {
          grid: {
        rooms: "Rooms",
        loading: "Loading calendar...",
        guest: "Guest",
        hasDebt: "Has outstanding balance"
      },
      title: "New Reservation",
      editTitle: "Edit Booking",
      tabs: {
        details: "Details & Finance",
        services: "Services"
      },
      guest: {
        title: "Guest Information",
        fullName: "Full Name",
        phone: "Phone",
        email: "Email"
      },
      details: {
        title: "Booking Details",
        room: "Room",
        selectRoom: "Select room...",
        noAvailableRooms: "No available rooms for these dates",
        checkIn: "Check-in",
        checkOut: "Check-out",
        guestCount: "Number of Guests",
        status: "Status",
        source: "Source",
        notes: "Notes",
        notesPlaceholder: "Additional notes..."
      },
      finance: {
        title: "Finance",
        accommodation: "Accommodation ({{nights}} nights)",
        orderedServices: "Ordered Services:",
        noServices: "None",
        total: "Total",
        paid: "Paid",
        balance: "Balance Due"
      },
      services: {
        available: "Available Services",
        cart: "Service Cart",
        ordered: "Ordered Services",
        addToCart: "Add",
        cartEmpty: "Cart is empty",
        noOrdered: "No services added",
        addSelected: "Add Selected Services"
      },
      actions: {
        save: "Save",
        cancel: "Cancel",
        delete: "Delete Booking",
        saving: "Saving..."
      },
      status: {
        pending: "Pending",
        confirmed: "Confirmed",
        checkedIn: "Checked In",
        checkedOut: "Checked Out",
        cancelled: "Cancelled"
      },
      sources: {
        direct: "Direct",
        website: "Website",
        phone: "Phone",
        aiAgent: "AI Agent",
        other: "Other"
      },
      errors: {
        guestNameRequired: "Guest name is required"
      },
      messages: {
        confirmDelete: "Are you sure you want to delete this booking? This action cannot be undone."
      },
      popover: {
        unknownGuest: "Unknown Guest",
        stayPeriod: "Stay Period",
        duration: "Duration",
        guestCount: "Number of Guests",
        comment: "Comment",
        additionalServices: "Additional Services",
        accommodation: "Accommodation",
        services: "Services",
        total: "Total",
        toPay: "To Pay",
        paidFully: "Paid in Full",
        alreadyPaid: "Already Paid"
      },
      roomTypes: {
        single: "Single",
        double: "Double",
        twin: "Twin",
        suite: "Suite",
        deluxe: "Deluxe",
        standard: "Standard",
        economy: "Economy",
        family: "Family"
      }
    }
  },
  ru: {
    common: {
      app: {
        name: "Отель PMS",
        tagline: "Профессиональная система управления недвижимостью"
      },
      navigation: {
        dashboard: "Главная",
        bookings: "Бронирования",
        calendar: "Календарь",
        rooms: "Номера",
        guests: "Гости",
        chat: "Сообщения",
        channels: "Каналы продаж",
        reports: "Отчеты",
        settings: "Настройки"
      },
      actions: {
        save: "Сохранить",
        cancel: "Отмена",
        delete: "Удалить",
        edit: "Редактировать",
        create: "Создать",
        search: "Поиск",
        filter: "Фильтр",
        export: "Экспорт",
        import: "Импорт",
        sync: "Синхронизировать",
        connect: "Подключить",
        disconnect: "Отключить",
        refresh: "Обновить",
        back: "Назад",
        next: "Далее",
        previous: "Назад",
        close: "Закрыть",
        confirm: "Подтвердить",
        select: "Выбрать",
        signOut: "Выйти"
      }
    },
    dashboard: {
      title: "Календарь бронирований",
      subtitle: "Управление бронированиями",
      navigation: {
        previousMonth: "Предыдущий месяц",
        nextMonth: "Следующий месяц",
        today: "Сегодня"
      },
      actions: {
        newReservation: "Новое бронирование",
        signOut: "Выйти"
      },
      grid: {
        rooms: "Номера",
        loading: "Загрузка календаря...",
        noData: "Нет доступных номеров",
        dragToSelect: "Перетащите для выбора дат"
      },
      errors: {
        loadingBookings: "Ошибка загрузки бронирований",
        loadingData: "Ошибка загрузки данных"
      }
    },
    bookings: {
      title: "Бронирования",
      search: {
        placeholder: "Поиск по имени гостя..."
      },
      filter: {
        allStatuses: "Все статусы",
        byStatus: "Фильтр по статусу"
      },
      status: {
        confirmed: "Подтверждено",
        pending: "Не подтверждено",
        cancelled: "Отменено",
        checked_in: "Проживание",
        checked_out: "Выехал"
      },
      table: {
        guest: "Гость",
        source: "Источник",
        room: "Номер",
        dates: "Даты",
        status: "Статус",
        accommodation: "Проживание",
        services: "Услуги",
        paid: "Оплачено",
        balance: "К оплате",
        noResults: "Бронирования не найдены",
        unknownGuest: "Неизвестный гость"
      },
      actions: {
        newBooking: "Новая бронь",
        edit: "Редактировать",
        cancel: "Отменить",
        checkIn: "Заселить",
        checkOut: "Выселить"
      }
    },
    auth: {
      appName: "Отель PMS",
      subtitle: "Вход для персонала",
      tabs: {
        signIn: "Войти",
        signUp: "Регистрация"
      },
      fields: {
        email: "Email",
        password: "Пароль"
      },
      placeholders: {
        email: "Введите email",
        password: "Введите пароль",
        passwordHint: "Минимум 6 символов"
      },
      buttons: {
        signIn: "Войти",
        signUp: "Зарегистрироваться",
        signingIn: "Вход...",
        signingUp: "Создание аккаунта...",
        signInWithGoogle: "Войти через Google"
      },
      divider: "ИЛИ",
      messages: {
        checkEmail: "Проверьте вашу почту для подтверждения регистрации!"
      },
      errors: {
        invalidCredentials: "Неверный email или пароль",
        emailNotConfirmed: "Пожалуйста, подтвердите email",
        signInFailed: "Ошибка входа. Попробуйте снова.",
        signUpFailed: "Ошибка регистрации. Попробуйте снова.",
        googleSignIn: "Ошибка входа через Google",
        passwordTooShort: "Пароль должен быть минимум 6 символов",
        emailAlreadyRegistered: "Этот email уже зарегистрирован"
      }
    },
    chat: {
      title: "Сообщения",
      header: "Чаты",
      search: {
        placeholder: "Поиск по сообщениям..."
      },
      conversation: {
        selectChat: "Выберите диалог",
        selectChatDescription: "Выберите чат из списка слева, чтобы начать общение",
        noMessages: "Сообщений пока нет",
        typeMessage: "Введите сообщение...",
        send: "Отправить",
        unknownContact: "Неизвестный контакт"
      }
    },
    grid: {
        rooms: "Номера",
        loading: "Загрузка календаря...",
        guest: "Гость",
        hasDebt: "Есть задолженность"
      },
      title: "Новое бронирование",
      editTitle: "Редактирование брони",
      tabs: {
        details: "Детали и Финансы",
        services: "Услуги"
      },
      guest: {
        title: "Информация о госте",
        fullName: "ФИО",
        phone: "Телефон",
        email: "Email"
      },
      details: {
        title: "Детали бронирования",
        room: "Номер",
        selectRoom: "Выберите номер...",
        noAvailableRooms: "Свободных номеров на эти даты нет",
        checkIn: "Заезд",
        checkOut: "Выезд",
        guestCount: "Кол-во гостей",
        status: "Статус",
        source: "Источник",
        notes: "Комментарий",
        notesPlaceholder: "Дополнительные заметки..."
      },
      finance: {
        title: "Финансы",
        accommodation: "Проживание ({{nights}} дн.)",
        orderedServices: "Заказанные услуги:",
        noServices: "Нет",
        total: "Итого",
        paid: "Оплачено",
        balance: "К оплате"
      },
      services: {
        available: "Доступные услуги",
        cart: "Корзина услуг",
        ordered: "Заказанные услуги",
        addToCart: "В корзину",
        cartEmpty: "Корзина пуста",
        noOrdered: "Услуги не добавлены",
        addSelected: "Добавить выбранные услуги"
      },
      actions: {
        save: "Сохранить",
        cancel: "Отмена",
        delete: "Удалить бронь",
        saving: "Сохранение..."
      },
      status: {
        pending: "Не подтверждено",
        confirmed: "Подтверждено",
        checkedIn: "Проживание",
        checkedOut: "Выезд",
        cancelled: "Отменено"
      },
      sources: {
        direct: "Напрямую",
        website: "Сайт",
        phone: "Телефон",
        aiAgent: "AI-агент",
        other: "Другое"
      },
      errors: {
        guestNameRequired: "Необходимо указать имя гостя"
      },
      messages: {
        confirmDelete: "Вы уверены, что хотите удалить это бронирование? Это действие нельзя отменить."
      },
      popover: {
        unknownGuest: "Неизвестный гость",
        stayPeriod: "Период проживания",
        duration: "Длительность",
        guestCount: "Количество гостей",
        comment: "Комментарий",
        additionalServices: "Дополнительные услуги",
        accommodation: "Проживание",
        services: "Услуги",
        total: "Итого",
        toPay: "К оплате",
        paidFully: "Оплачено полностью",
        alreadyPaid: "Уже оплачено"
      },
      roomTypes: {
        single: "Одноместный",
        double: "Двухместный",
        twin: "Твин",
        suite: "Люкс",
        deluxe: "Делюкс",
        standard: "Стандарт",
        economy: "Эконом",
        family: "Семейный"
      }
    }
  } 

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Язык по умолчанию
    fallbackLng: 'en',
    
    ns: ['common', 'dashboard', 'bookings', 'auth', 'chat'],
    defaultNS: 'common',
    
    interpolation: {
      escapeValue: false
    },
    
    detection: {
      order: ['localStorage', 'cookie', 'navigator'],
      caches: ['localStorage', 'cookie'],
      cookieName: 'pms_language',
      lookupLocalStorage: 'pms_language',
    },
    
    react: {
      useSuspense: false
    },
    
    debug: true // Включаем debug для отладки
  });

export default i18n;

// hooks/useTranslation.js - ИСПРАВЛЕННЫЙ хук
import { useTranslation as useI18nTranslation } from 'react-i18next';

export function useTranslation(namespace = 'common') {
  const { t, i18n } = useI18nTranslation(namespace);
  
  // Вспомогательные функции
  const formatDate = (date, format = 'short') => {
    if (!date) return '';
    return new Intl.DateTimeFormat(i18n.language, {
      dateStyle: format
    }).format(new Date(date));
  };
  
  const formatCurrency = (amount, currency = 'USD') => {
    if (!amount) return '0';
    const currencyMap = {
      'ru': 'RUB',
      'en': 'USD',
      'es': 'EUR',
      'fr': 'EUR',
      'de': 'EUR'
    };
    const finalCurrency = currencyMap[i18n.language] || currency;
    
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: finalCurrency
    }).format(amount);
  };
  
  const formatNumber = (number) => {
    if (!number) return '0';
    return new Intl.NumberFormat(i18n.language).format(number);
  };
  
  return {
    t,
    i18n,
    formatDate,
    formatCurrency,
    formatNumber,
    currentLanguage: i18n.language || 'en',
    changeLanguage: (lng) => i18n.changeLanguage(lng)
  };
}