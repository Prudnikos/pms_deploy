import React from 'react';
import ChatInterface from '../components/chat/ChatInterface';

export default function ChatPage({ selectedConversation, onConversationSelect }) {
  return (
    <div className="h-full flex flex-col">
      <style>{`
        .chat-container {
          background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(226,232,240,0.6);
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
      `}</style>
      
      <div className="p-6 pb-4">
        <h1 className="text-3xl font-bold text-slate-800">Чат с гостями</h1>
        <p className="text-slate-600 mt-2">Общайтесь с гостями в режиме реального времени</p>
      </div>
      
      <div className="flex-1 mx-6 mb-6">
        <div className="chat-container rounded-2xl h-full overflow-hidden">
          <ChatInterface 
            selectedConversation={selectedConversation}
            onConversationSelect={onConversationSelect}
          />
        </div>
      </div>
    </div>
  );
}