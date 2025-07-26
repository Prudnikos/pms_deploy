import React, { useState } from 'react';
import { useAuth } from './AuthProvider'; // Импортируем наш новый хук из AuthProvider
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Hotel } from 'lucide-react';

// Простой компонент для иконки Google, чтобы не устанавливать лишних библиотек
const GoogleIcon = () => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2">
    <title>Google</title>
    <path fill="#4285F4" d="M21.545 12.273c0-.8-.068-1.582-.205-2.345h-9.34v4.445h5.255a4.512 4.512 0 0 1-1.964 2.927v2.864h3.673c2.145-1.982 3.382-4.955 3.382-8.89Z"/>
    <path fill="#34A853" d="M12 22c2.727 0 5.027-.9 6.7-2.436l-3.673-2.864a5.346 5.346 0 0 1-3.027 1.09c-2.345 0-4.336-1.582-5.045-3.709H3.255v2.964A10.02 10.02 0 0 0 12 22Z"/>
    <path fill="#FBBC05" d="M6.955 14.273a5.83 5.83 0 0 1 0-4.545V6.764H3.255a10.02 10.02 0 0 0 0 10.473L6.955 14.273Z"/>
    <path fill="#EA4335" d="M12 6.545c1.473 0 2.818.509 3.864 1.527l3.255-3.255A9.73 9.73 0 0 0 12 2a10.02 10.02 0 0 0-8.745 4.764L6.955 9.727c.709-2.127 2.7-3.709 5.045-3.182Z"/>
  </svg>
);

export default function LoginForm() {
  // Получаем функцию входа из нашего нового AuthProvider
  const { signInWithProvider } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // Вызываем функцию входа из AuthProvider, передавая 'google'
      await signInWithProvider('google');
      // После этого Supabase сам перенаправит нас на страницу Google,
      // а затем обратно в приложение. setLoading(false) здесь не нужен.
    } catch (error) {
      console.error('Google Sign In error:', error);
      setLoading(false); // Включаем кнопку обратно, если что-то пошло не так
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center pb-8">
        <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
          <Hotel className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-slate-800">Lite PMS</CardTitle>
        <CardDescription className="text-slate-600">
          Вход для персонала
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            className="w-full h-12 bg-white hover:bg-slate-50 text-slate-800 font-medium shadow-md border border-slate-200 flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <GoogleIcon />
            )}
            Войти через Google
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}