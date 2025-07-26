import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, X } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '@/lib/supabase'; // <-- Используем Supabase
import { useAuth } from '@/components/auth/AuthProvider'; // <-- Используем наш хук аутентификации

export default function ChatModal({ conversation, onClose }) {
  const { user } = useAuth(); // Получаем текущего пользователя-сотрудника
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Этот useEffect загружает сообщения и подписывается на обновления
  useEffect(() => {
    if (!conversation?.id) return;

    // Функция для загрузки сообщений
    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
      }
    };

    loadMessages();

    // Supabase Realtime: подписываемся на новые сообщения в этом диалоге
    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          // Добавляем новое сообщение в список
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    // Отписываемся при закрытии модального окна
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id]);

  // Прокрутка вниз при появлении новых сообщений
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Функция отправки сообщения
  const sendMessage = async () => {
    // Здесь и ниже заменяем 'selectedConversation' на 'conversation'
    if (!newMessage.trim() || !conversation || !user) return;

    const content = newMessage.trim();
    setNewMessage('');

    try {
      const tempId = Date.now();
      const tempMessage = {
          id: tempId,
          conversation_id: conversation.id, // <-- Исправлено
          content: content,
          sender_id: user.id,
          sender_type: 'staff',
          created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempMessage]);

      const { error } = await supabase.from('messages').insert({
        conversation_id: conversation.id, // <-- Исправлено
        content: content,
        sender_id: user.id,
        sender_type: 'staff'
      });

      if (error) {
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        throw error;
      }

      if (conversation.channel === 'avito') { // <-- Исправлено
        console.log('Отправляем хук в n8n для отправки в Авито...');
        await fetch('https://vodahotel.app.n8n.cloud/webhook/c2e07a8b-9c99-4dfb-b45f-37e6db393a54', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: conversation.id, // <-- Исправлено
            content: content
          })
        });
      }
if (conversation.channel === 'Telegram') {
  console.log('Отправляем хук в n8n для отправки в Telegram...');
  await fetch('https://vodahotel.app.n8n.cloud/webhook/telegram-reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation_id: conversation.id,
      content: content
    })
  });
}
// Если это диалог с Email, "дёргаем" n8n для отправки письма
if (conversation.channel === 'email') {
  console.log('Отправляем хук в n8n для отправки Email...');
  await fetch('https://vodahotel.app.n8n.cloud/webhook/email-reply', {
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
    }
  };  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    return format(new Date(timestamp), 'HH:mm', { locale: ru });
  };

  if (!conversation) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 flex flex-col">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            {/* Адаптируем заголовок для Авито-чатов */}
            <span>Чат с Avito User {conversation.avito_user_id || conversation.guest_id}</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => {
            // Определяем, чьё это сообщение
            const isMyMessage = message.sender_type === 'staff';
            return (
              <div key={message.id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-4 py-2 rounded-lg ${isMyMessage ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-900'}`}>
                  <p>{message.content}</p>
                  <p className={`text-xs mt-1 text-right ${isMyMessage ? 'text-blue-100' : 'text-slate-500'}`}>
                    {formatMessageTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex items-center space-x-2">
            <Input
              placeholder="Введите сообщение..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}