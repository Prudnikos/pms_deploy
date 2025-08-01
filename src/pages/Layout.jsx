import React, { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatInterface from '@/components/chat/ChatInterface';
import { useAuth } from '@/components/auth/AuthProvider';
import LoginForm from '@/components/auth/LoginForm';

// Этот компонент отвечает за главный трёх-панельный интерфейс
function MainLayout({ children, currentPageName }) {
  const [selectedConversation, setSelectedConversation] = useState(null);

  const handleConversationSelect = (conversation) => {
    console.log('🎯 Выбран диалог в Layout:', conversation.id);
    setSelectedConversation(conversation);
  };

  // Показываем чат только на странице Chat
  const isCharacterPage = currentPageName === 'Chat';

  if (isCharacterPage) {
    // Полноэкранный чат
    return (
      <div className="h-screen w-screen overflow-hidden bg-slate-50 flex">
        {/* Левая панель - список чатов */}
        <div className="w-80 h-full bg-white border-r border-slate-200 flex-shrink-0">
          <ChatSidebar 
            onConversationSelect={handleConversationSelect}
            selectedConversation={selectedConversation}
          />
        </div>
        
        {/* Правая панель - тело чата */}
        <div className="flex-1 h-full">
          <ChatInterface selectedConversation={selectedConversation} />
        </div>
      </div>
    );
  }

  // Обычный layout для других страниц - трехпанельный резайзабельный интерфейс
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Левая панель - список чатов */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
          <div className="h-full bg-white border-r border-slate-200">
            <ChatSidebar 
              onConversationSelect={handleConversationSelect}
              selectedConversation={selectedConversation}
            />
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        {/* Правая часть - основной контент + чат */}
        <ResizablePanel defaultSize={80}>
          <ResizablePanelGroup direction="vertical" className="h-full">
            {/* Верх - основной контент (шахматка) */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full p-6 overflow-auto bg-slate-50">
                {children}
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            {/* Низ - тело чата */}
            <ResizablePanel defaultSize={50} minSize={20}>
              <div className="h-full bg-white border-t border-slate-200">
                <ChatInterface selectedConversation={selectedConversation} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

// Этот компонент теперь отвечает за логику "что показать"
export default function Layout({ children, currentPageName }) {
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
    return <MainLayout currentPageName={currentPageName}>{children}</MainLayout>;
}