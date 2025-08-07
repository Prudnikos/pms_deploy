import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom'; // Импортируем Link и useLocation
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatInterface from '@/components/chat/ChatInterface';
import { useAuth } from '@/components/auth/AuthProvider';
import LoginForm from '@/components/auth/LoginForm';
import { Button } from '@/components/ui/button'; // Импорт кнопки
import { LogOut, LayoutDashboard, CalendarDays, MessageSquare, Hotel } from 'lucide-react'; // Импорт иконок

// --- НОВЫЙ КОМПОНЕНТ: Боковая панель с навигацией ---
function AppSidebar() {
  const { signOut } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const navItems = [
    { href: '/', label: 'Шахматка', icon: LayoutDashboard },
    { href: '/bookings', label: 'Бронирования', icon: CalendarDays },
    { href: '/chat', label: 'Чаты', icon: MessageSquare },
  ];

  return (
    <div className="h-full flex flex-col p-4 bg-white border-r border-slate-200">
      {/* Логотип */}
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-md">
            <Hotel className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-lg text-slate-800">Hotel PMS</span>
      </div>
      
      {/* Навигация */}
      <nav className="flex flex-col space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`
              flex items-center px-3 py-2.5 rounded-lg transition-colors
              ${location.pathname === item.href
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
              }
            `}
          >
            <item.icon className="h-4 w-4 mr-3" />
            <span className="font-medium text-sm">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Кнопка выхода внизу */}
      <div className="mt-auto">
        <Button variant="ghost" className="w-full justify-start text-slate-600 hover:bg-slate-100" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-3" />
          <span className="font-medium text-sm">Выйти</span>
        </Button>
      </div>
    </div>
  );
}


// Этот компонент отвечает за главный интерфейс
function MainLayout({ children }) {
  const [selectedConversation, setSelectedConversation] = useState(null);

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        
        {/* Левая панель - НАВИГАЦИЯ */}
        <ResizablePanel defaultSize={15} minSize={12} maxSize={20}>
          <AppSidebar />
        </ResizablePanel>
        <ResizableHandle withHandle />
        
        {/* Центральная панель - ОСНОВНОЙ КОНТЕНТ (Шахматка, Брони и т.д.) */}
        <ResizablePanel defaultSize={55} minSize={30}>
           <div className="h-full overflow-auto">
             {children}
           </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        {/* Правая панель - СПИСОК ЧАТОВ */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <div className="h-full flex flex-col">
            <ChatSidebar 
              onConversationSelect={setSelectedConversation}
              selectedConversation={selectedConversation}
            />
          </div>
        </ResizablePanel>
        
      </ResizablePanelGroup>
    </div>
  );
}

// Этот компонент отвечает за логику "что показать"
export default function Layout({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
    }

    if (!user) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' }}>
                <LoginForm />
            </div>
        );
    }

    return <MainLayout>{children}</MainLayout>;
}