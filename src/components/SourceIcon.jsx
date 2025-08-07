import React from 'react';
import { Phone, UserCheck, Globe, Laptop, Bot } from 'lucide-react'; // Добавили Laptop и Bot

export default function SourceIcon({ source }) {
  const iconClass = "h-5 w-5 text-gray-500";

  switch (source) {
    case 'booking':
      return <img src="/icons/booking-com.png" alt="Booking.com" className="h-5 w-5" />;
    case 'airbnb': // <-- Добавлено
      return <img src="/icons/airbnb.png" alt="AirBnB" className="h-5 w-5" />;
    case 'site': // <-- Добавлено
      return <Laptop className={iconClass} />;
    case 'ai_agent': // <-- Добавлено
      return <Bot className={iconClass} />;
    case 'phone':
      return <Phone className={iconClass} />;
    case 'direct':
      return <UserCheck className={iconClass} />;
    case 'other':
      return <Globe className={iconClass} />;
    default:
      return null;
  }
}