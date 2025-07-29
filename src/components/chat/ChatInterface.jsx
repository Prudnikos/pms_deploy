import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';

export default function ChatInterface({ selectedConversation }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!selectedConversation?.id) {
      setMessages([]);
      return;
    }
    const loadMessages = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', selectedConversation.id).order('created_at', { ascending: true });
        if (error) throw error;
        setMessages(data || []);
      } catch (error) { console.error('Ошибка загрузки сообщений:', error); } 
      finally { setLoading(false); }
    };
    loadMessages();

    const channel = supabase.channel(`messages:${selectedConversation.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConversation.id}` }, 
      (payload) => {
        // ИСПРАВЛЕНИЕ: Добавляем новое сообщение, только если его ещё нет
        setMessages(prev => {
          if (prev.find(msg => msg.id === payload.new.id)) {
            return prev;
          }
          return [...prev, payload.new];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const conversation = selectedConversation;
    if (!newMessage.trim() || !conversation || !user) return;
    const content = newMessage.trim();
    setNewMessage('');

    try {
      // 1. Сохраняем сообщение в нашей базе данных
      const { data: newMessageData, error } = await supabase.from('messages').insert({ 
        conversation_id: conversation.id, 
        content, 
        sender_id: user.id, 
        sender_type: 'staff' 
      }).select().single(); // <-- .select().single() вернёт созданное сообщение

      if (error) throw error;
      
      // ИСПРАВЛЕНИЕ: Мы больше не добавляем сообщение "оптимистично".
      // Вместо этого мы дожидаемся ответа от Realtime, который добавит его сам.
      // Это решает проблему дублирования.

      // 2. Вызываем нужный вебхук в n8n
      if (conversation.channel === 'avito') {
        await fetch('https://vodahotel.app.n8n.cloud/webhook/c2e07a8b-9c99-4dfb-b45f-37e6db393a54', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation_id: conversation.id, content }) });
      }
      if (conversation.channel === 'telegram') {
        await fetch('https://vodahotel.app.n8n.cloud/webhook/telegram-reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation_id: conversation.id, content }) });
      }
      if (conversation.channel === 'email') {
        await fetch('https://vodahotel.app.n8n.cloud/webhook/email-reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation_id: conversation.id, content }) });
      }
      // ИСПРАВЛЕНИЕ: Перемещаем блок для WhatsApp внутрь try...catch
      if (conversation.channel === 'whatsapp') {
        console.log('Отправляем хук в n8n для отправки в WhatsApp...');
        await fetch('https://vodahotel.app.n8n.cloud/webhook/711e9857-be4f-4875-9084-25298ad86793', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: conversation.id,
            content: content
          })
        });
      }
    } catch (error) { 
      console.error('Ошибка отправки сообщения:', error);
      // Можно добавить Alert для пользователя, если нужно
    }
  };

  const getHeaderText = () => { /* Эта функция остаётся без изменений */ };
  
  return (
    <div className="flex flex-col h-full bg-white">
      {!selectedConversation ? (
        <div className="flex h-full items-center justify-center text-slate-500 p-4">
          <div className="text-center">
            <MessageCircle className="h-16 w-16 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">Выберите диалог</p>
            <p className="text-sm text-slate-400 mt-2">Выберите чат из списка слева, чтобы увидеть переписку</p>
          </div>
        </div>
      ) : (
        <>
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-900">{getHeaderText()}</h3>
            <p className="text-sm text-slate-500 mt-1">Канал: {selectedConversation.channel}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading && <div className="text-center text-slate-500">Загрузка...</div>}
            {messages.map((message) => {
              const isMyMessage = message.sender_type === 'staff';
              return (
                <div key={message.id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isMyMessage ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-900'}`}>
                    <p>{message.content}</p>
                    {/* ... остальная разметка сообщения ... */}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center space-x-2">
              <Input placeholder="Введите сообщение..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} className="flex-1" />
              <Button onClick={sendMessage} disabled={!newMessage.trim()}><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}