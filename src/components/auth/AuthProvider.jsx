import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // Убедись, что твой клиент Supabase импортируется отсюда

// Контекст для доступа к данным аутентификации в любом компоненте
const AuthContext = createContext();

// Хук для удобного использования контекста
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Компонент-провайдер, который будет "оборачивать" всё приложение
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Этот useEffect - сердце нашей аутентификации
  useEffect(() => {
    // 1. Проверяем текущую сессию при первой загрузке
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2. Создаём "слушателя", который будет в реальном времени следить за изменениями
    //    (когда пользователь вошёл, вышел и т.д.)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // 3. Отключаем "слушателя", когда компонент больше не нужен
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Функция для входа через провайдера (например, Google)
  const signInWithProvider = (provider) => {
    supabase.auth.signInWithOAuth({ provider });
  };
  
  // Функция для выхода
  const signOut = () => {
    supabase.auth.signOut();
  };

  // Объект со всеми данными и функциями, которые мы передаём "вниз" по дереву компонентов
  const value = {
    user,
    loading,
    signInWithProvider,
    signOut,
  };

  // Если не идёт загрузка, показываем дочерние компоненты (всё твоё приложение)
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};