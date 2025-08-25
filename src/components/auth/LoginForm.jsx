import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Hotel, Globe } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

// Google Icon SVG
const GoogleIcon = () => (
  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function LoginForm() {
  const { signInWithProvider, signInWithEmail, signUpWithEmail } = useAuth();
  const { t, currentLanguage } = useTranslation('auth');
  
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithProvider('google');
    } catch (error) {
      setError(t('errors.googleSignIn'));
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
    } catch (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError(t('errors.invalidCredentials'));
      } else if (error.message.includes('Email not confirmed')) {
        setError(t('errors.emailNotConfirmed'));
      } else {
        setError(t('errors.signInFailed'));
      }
    }
    setLoading(false);
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    // Basic validation
    if (password.length < 6) {
      setError(t('errors.passwordTooShort'));
      setLoading(false);
      return;
    }
    
    try {
      await signUpWithEmail(email, password);
      setMessage(t('messages.checkEmail'));
      setEmail('');
      setPassword('');
    } catch (error) {
      if (error.message.includes('already registered')) {
        setError(t('errors.emailAlreadyRegistered'));
      } else {
        setError(t('errors.signUpFailed'));
      }
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
          <Hotel className="h-8 w-8 text-white" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <CardTitle className="text-2xl font-bold text-slate-800">
            {t('appName')}
          </CardTitle>
          <LanguageSwitcher />
        </div>
        <CardDescription className="text-slate-600">
          {t('subtitle')}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {message && (
          <Alert variant="default" className="mb-4">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">{t('tabs.signIn')}</TabsTrigger>
            <TabsTrigger value="signup">{t('tabs.signUp')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <form onSubmit={handleEmailLogin} className="space-y-4 pt-4">
              <div>
                <Label htmlFor="email-signin">{t('fields.email')}</Label>
                <Input 
                  id="email-signin" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder={t('placeholders.email')}
                  required 
                />
              </div>
              <div>
                <Label htmlFor="password-signin">{t('fields.password')}</Label>
                <Input 
                  id="password-signin" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder={t('placeholders.password')}
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('buttons.signingIn')}
                  </>
                ) : (
                  t('buttons.signIn')
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleEmailSignUp} className="space-y-4 pt-4">
              <div>
                <Label htmlFor="email-signup">{t('fields.email')}</Label>
                <Input 
                  id="email-signup" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder={t('placeholders.email')}
                  required 
                />
              </div>
              <div>
                <Label htmlFor="password-signup">{t('fields.password')}</Label>
                <Input 
                  id="password-signup" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder={t('placeholders.passwordHint')}
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('buttons.signingUp')}
                  </>
                ) : (
                  t('buttons.signUp')
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-500">{t('divider')}</span>
          </div>
        </div>
        
        <Button 
          onClick={handleGoogleSignIn} 
          className="w-full" 
          variant="outline" 
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('buttons.signingIn')}
            </>
          ) : (
            <>
              <GoogleIcon />
              {t('buttons.signInWithGoogle')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}