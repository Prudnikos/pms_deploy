import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // Убедитесь, что путь к вашему клиенту верный

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Временно отключаем аутентификацию для тестирования
  const [user, setUser] = useState({ 
    id: 'test-user', 
    email: 'prudnik47@gmail.com' 
  });
  const [loading, setLoading] = useState(false);

  /* Временно закомментировано для тестирования
  useEffect(() => {
    // 1. Проверяем текущую сессию при первой загрузке
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2. Создаём "слушателя" для отслеживания изменений статуса аутентификации
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // 3. Отключаем "слушателя" при размонтировании компонента
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);
  */

  // --- НАШИ ФУНКЦИИ АУТЕНТИФИКАЦИИ ---

  // Функция для входа через провайдера (например, Google)
  const signInWithProvider = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) throw error;
  };

  // V-- ДОБАВЛЕНО: Функция для входа по email и паролю --V
  const signInWithEmail = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  // V-- ДОБАВЛЕНО: Функция для регистрации по email и паролю --V
  const signUpWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data; // Возвращаем данные, чтобы показать сообщение о подтверждении
  };
  
  // Функция для выхода
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // Объект со всеми данными и функциями, которые мы передаём в приложение
  const value = {
    user,
    loading,
    signInWithProvider,
    signInWithEmail,  // <-- Добавлено
    signUpWithEmail,  // <-- Добавлено
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};