import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // Импортируем наш клиент Supabase

// Создаём контекст для хранения данных об аутентификации
const SupabaseAuthContext = createContext(null);

// Создаём компонент-провайдер, который будет "оборачивать" всё наше приложение
export function SupabaseAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // При первой загрузке получаем текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Эта функция будет следить за изменениями статуса входа (login, logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Отписываемся от слежки при размонтировании компонента
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Функция для входа через Google
  const login = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
    });
  };

  // Функция для выхода
  const logout = () => {
    supabase.auth.signOut();
  };

  // Передаём все нужные данные и функции в наше приложение
  const value = {
    user,
    loading,
    login,
    logout,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {!loading && children}
    </SupabaseAuthContext.Provider>
  );
}

// Создаём кастомный хук для лёгкого доступа к данным
export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}