import React, { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatInterface from '@/components/chat/ChatInterface';
import { useAuth } from '@/components/auth/AuthProvider';
import LoginForm from '@/components/auth/LoginForm';

// Этот компонент отвечает за главный трёх-панельный интерфейс
function MainLayout({ children }) {
  const [selectedConversation, setSelectedConversation] = useState(null);

  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        
        {/* === ПАНЕЛЬ 1: СПИСОК ДИАЛОГОВ (СЛЕВА) === */}
        <ResizablePanel defaultSize={25} minSize={20}>
          <ChatSidebar 
            onConversationSelect={handleConversationSelect}
            selectedConversation={selectedConversation}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* === ПАНЕЛЬ 2: ОСНОВНОЙ КОНТЕНТ И ЧАТ (СПРАВА) === */}
        <ResizablePanel defaultSize={75}>
          <ResizablePanelGroup direction="vertical">

            {/* -- ВЕРХНЯЯ ЧАСТЬ: ШАХМАТКА И ДРУГИЕ СТРАНИЦЫ -- */}
            <ResizablePanel defaultSize={65} minSize={30}>
              <main className="h-full w-full overflow-auto">
                {children}
              </main>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* -- НИЖНЯЯ ЧАСТЬ: ТЕЛО ЧАТА -- */}
            <ResizablePanel defaultSize={35} minSize={20}>
              <ChatInterface selectedConversation={selectedConversation} />
            </ResizablePanel>

          </ResizablePanelGroup>
        </ResizablePanel>

      </ResizablePanelGroup>
    </div>
  );
}


// Этот компонент теперь отвечает за логику "что показать"
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

    // Если пользователь есть, показываем основной интерфейс
    return <MainLayout>{children}</MainLayout>;
}