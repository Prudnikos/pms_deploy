import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Hotel } from 'lucide-react';

// SVG для иконки Google (без изменений)
const GoogleIcon = () => ( <svg>...</svg> ); // Я сократил код SVG для краткости

export default function LoginForm() {
  // Получаем все необходимые функции из AuthProvider
  const { signInWithProvider, signInWithEmail, signUpWithEmail } = useAuth();
  
  // Добавляем состояния для полей формы и сообщений
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithProvider('google');
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await signInWithEmail(email, password);
      // Если вход успешен, AuthProvider сам обновит состояние и перенаправит
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await signUpWithEmail(email, password);
      setMessage('Проверьте вашу почту для подтверждения регистрации!');
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
          <Hotel className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-slate-800">Lite PMS</CardTitle>
        <CardDescription className="text-slate-600">Вход для персонала</CardDescription>
      </CardHeader>
      
      <CardContent>
        {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
        {message && <Alert variant="default" className="mb-4"><AlertDescription>{message}</AlertDescription></Alert>}

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Войти</TabsTrigger>
            <TabsTrigger value="signup">Регистрация</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <form onSubmit={handleEmailLogin} className="space-y-4 pt-4">
              <div>
                <Label htmlFor="email-signin">Email</Label>
                <Input id="email-signin" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="password-signin">Пароль</Label>
                <Input id="password-signin" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Войти'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleEmailSignUp} className="space-y-4 pt-4">
               <div>
                <Label htmlFor="email-signup">Email</Label>
                <Input id="email-signup" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="password-signup">Пароль</Label>
                <Input id="password-signup" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                 {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Зарегистрироваться'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500">Или</span></div>
        </div>
        
        <Button onClick={handleGoogleSignIn} className="w-full" variant="outline" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><GoogleIcon /> Войти через Google</>}
        </Button>
      </CardContent>
    </Card>
  );
}