import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle, Check, CheckCheck, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';

// Компонент для отображения статусов сообщений
const MessageStatusIcon = ({ status, channel }) => {
  // Для Telegram показываем только sent/delivered (без read)
  if (channel === 'telegram' && status === 'read') {
    return (
      <div className="flex items-center ml-1" title="Доставлено в Telegram">
        <div className="relative">
          <CheckCheck className="h-3 w-3 text-white opacity-70" />
        </div>
      </div>
    );
  }
  
  switch (status) {
    case 'sent':
      // 1 белая галочка - отправлено
      return (
        <div className="flex items-center ml-1" title="Отправлено">
          <Check className="h-3 w-3 text-white opacity-70" />
        </div>
      );
      
    case 'delivered':
      // 2 белые галочки - доставлено
      const deliveredTitle = channel === 'telegram' ? 'Доставлено в Telegram' : 
                           channel === 'email' ? 'Доставлено в почтовый ящик' : 
                           channel === 'whatsapp' ? 'Доставлено в WhatsApp' : 'Доставлено';
      return (
        <div className="flex items-center ml-1" title={deliveredTitle}>
          <div className="relative">
            <CheckCheck className="h-3 w-3 text-white opacity-70" />
          </div>
        </div>
      );
      
    case 'read':
      // 2 зеленые галочки - прочитано
      const readTitle = channel === 'email' ? 'Прочитано (получатель открыл письмо)' : 
                       channel === 'whatsapp' ? 'Прочитано в WhatsApp' : 'Прочитано';
      return (
        <div className="flex items-center ml-1" title={readTitle}>
          <div className="relative">
            <CheckCheck className="h-3 w-3 text-green-400" />
          </div>
        </div>
      );
      
    case 'failed':
      // Красный восклицательный знак - ошибка
      const failedTitle = channel === 'email' ? 'Ошибка отправки письма' :
                         channel === 'whatsapp' ? 'Ошибка отправки в WhatsApp' :
                         channel === 'telegram' ? 'Ошибка отправки в Telegram' : 'Ошибка отправки';
      return (
        <div className="flex items-center ml-1" title={failedTitle}>
          <AlertCircle className="h-3 w-3 text-red-400" />
        </div>
      );
      
    default:
      return null;
  }
};

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
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', selectedConversation.id)
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        setMessages(data || []);
      } catch (error) { 
        console.error('Ошибка загрузки сообщений:', error); 
      } finally { 
        setLoading(false); 
      }
    };
    
    loadMessages();

    // ✅ ПОДПИСКА НА НОВЫЕ СООБЩЕНИЯ И ОБНОВЛЕНИЯ СТАТУСОВ
    const messagesChannel = supabase
      .channel(`messages:${selectedConversation.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `conversation_id=eq.${selectedConversation.id}` 
      }, (payload) => {
        console.log('💬 Новое сообщение в чате:', payload.new);
        setMessages(prev => {
          if (prev.find(msg => msg.id === payload.new.id)) {
            return prev;
          }
          return [...prev, payload.new];
        });
      })
      // ✅ ПОДПИСКА НА ОБНОВЛЕНИЯ СТАТУСОВ (ГЛАВНОЕ!)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'messages', 
        filter: `conversation_id=eq.${selectedConversation.id}` 
      }, (payload) => {
        console.log('🔄 Обновление статуса сообщения:', payload.new.id, 'статус:', payload.new.status, 'канал:', payload.new.channel);
        
        // ✅ Обновляем статус конкретного сообщения
        setMessages(prev => prev.map(msg => 
          msg.id === payload.new.id 
            ? { ...msg, status: payload.new.status, brevo_message_id: payload.new.brevo_message_id }
            : msg
        ));
      })
      .subscribe();
    
    return () => { 
      supabase.removeChannel(messagesChannel); 
    };
  }, [selectedConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const conversation = selectedConversation;
    if (!newMessage.trim() || !conversation || !user) return;
    
    const content = newMessage.trim();
    setNewMessage('');

    // ✅ ОПТИМИСТИЧНОЕ ОБНОВЛЕНИЕ: добавляем сообщение в UI сразу
    const tempMessage = {
      id: `temp-${Date.now()}`, // Временный ID
      conversation_id: conversation.id,
      content,
      sender_id: user.id,
      sender_type: 'staff',
      status: 'sent',
      created_at: new Date().toISOString(),
      isOptimistic: true // Флаг для отслеживания
    };
    
    setMessages(prev => [...prev, tempMessage]);

    try {
      console.log(`📤 Отправляем сообщение в ${conversation.channel}:`, content);

      // 1. Сохраняем сообщение в нашей базе данных со статусом 'sent'
      const { data: newMessageData, error } = await supabase
        .from('messages')
        .insert({ 
          conversation_id: conversation.id, 
          content, 
          sender_id: user.id, 
          sender_type: 'staff',
          status: 'sent' // Начальный статус
        })
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Сообщение сохранено в БД:', newMessageData.id);

      // ✅ ЗАМЕНЯЕМ временное сообщение на реальное
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id 
          ? { ...newMessageData, isOptimistic: false }
          : msg
      ));

      // 2. Отправляем в соответствующий канал через n8n webhook'и
      const channel = conversation.channel?.toLowerCase();
      let webhookUrl = null;
      let webhookPayload = {
        conversation_id: conversation.id,
        message_id: newMessageData.id, // ID нашего сообщения в БД
        content: content
      };

      switch (channel) {
        case 'whatsapp':
          webhookUrl = 'https://vodahotel.app.n8n.cloud/webhook/pms_to_whatsapp';
          console.log('📱 Отправляем в WhatsApp...');
          break;
          
        case 'telegram':
          webhookUrl = 'https://vodahotel.app.n8n.cloud/webhook/telegram-reply';
          console.log('🤖 Отправляем в Telegram...');
          break;
          
        case 'avito':
          webhookUrl = 'https://vodahotel.app.n8n.cloud/webhook/c2e07a8b-9c99-4dfb-b45f-37e6db393a54';
          console.log('🏠 Отправляем в Avito...');
          break;
          
        case 'email':
          webhookUrl = 'https://vodahotel.app.n8n.cloud/webhook/pms_to_email_brevo';
          console.log('📧 Отправляем в Email через Brevo...');
          break;
          
        default:
          console.warn('⚠️ Неизвестный канал:', conversation.channel);
          return;
      }

      if (webhookUrl) {
        console.log('🔗 Вызываем webhook:', webhookUrl);
        console.log('📦 Payload:', webhookPayload);
        
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(webhookPayload)
        });

        if (response.ok) {
          console.log(`✅ Webhook успешно вызван для ${conversation.channel}`);
          
          // ✅ Обработка ответов от различных каналов
          try {
            const responseData = await response.json();
            console.log(`📊 ${conversation.channel} Response:`, responseData);
            
            // WhatsApp Cloud API возвращает: { messages: [{ id: "wamid...." }] }
            if (channel === 'whatsapp' && responseData && responseData.messages && responseData.messages[0] && responseData.messages[0].id) {
              const whatsappMessageId = responseData.messages[0].id;
              
              await supabase.from('messages')
                .update({ whatsapp_message_id: whatsappMessageId })
                .eq('id', newMessageData.id);
                
              console.log('✅ WhatsApp Message ID сохранен:', whatsappMessageId);
            }
            
            // Email через Brevo возвращает messageId
            if (channel === 'email' && responseData && responseData.messageId) {
              console.log('✅ Email отправлен через Brevo, messageId:', responseData.messageId);
            }
            
          } catch (jsonError) {
            console.log('ℹ️ Не удалось получить response JSON:', jsonError.message);
          }
          
          // 3. Симуляция статусов для Telegram (у него нет webhooks статусов)
          if (channel === 'telegram') {
            console.log('🧪 Запускаем симуляцию статусов для Telegram...');
            
            setTimeout(async () => {
              try {
                await supabase.from('messages')
                  .update({ status: 'delivered' })
                  .eq('id', newMessageData.id);
                console.log('📬 Статус обновлен: delivered');
              } catch (err) {
                console.error('❌ Ошибка обновления delivered:', err);
              }
            }, 1500);
          }
          
        } else {
          console.error(`❌ Ошибка webhook для ${conversation.channel}:`, response.status);
          const errorText = await response.text();
          console.error('Ошибка webhook:', errorText);
          
          // ✅ При ошибке обновляем статус на failed
          setMessages(prev => prev.map(msg => 
            msg.id === tempMessage.id || msg.id === newMessageData.id
              ? { ...(msg.id === tempMessage.id ? newMessageData : msg), status: 'failed' }
              : msg
          ));
          
          // Обновляем статус в базе
          await supabase.from('messages')
            .update({ status: 'failed' })
            .eq('id', newMessageData.id);
        }
      }

    } catch (error) { 
      console.error('💥 Ошибка отправки сообщения:', error);
      
      // ✅ При ошибке удаляем оптимистичное сообщение
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    }
  };

  const getHeaderText = () => {
    if (!selectedConversation) return '';
    
    const contactName = selectedConversation.contact_full_name || 'Неизвестный контакт';
    const channelText = selectedConversation.channel ? `(${selectedConversation.channel})` : '';
    
    return `${contactName} ${channelText}`;
  };
  
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
            {loading && (
              <div className="text-center text-slate-500">Загрузка...</div>
            )}
            
            {messages.map((message) => {
              const isMyMessage = message.sender_type === 'staff';
              return (
                <div 
                  key={message.id} 
                  className={`flex mb-4 ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[70%] px-4 py-2 rounded-lg break-words ${
                      isMyMessage 
                        ? 'bg-blue-500 text-white rounded-br-sm' 
                        : 'bg-slate-200 text-slate-900 rounded-bl-sm'
                    }`}
                    style={{ 
                      wordWrap: 'break-word', 
                      overflowWrap: 'break-word',
                      maxWidth: '70%' 
                    }}
                  >
                    <div className="flex items-end justify-between">
                      {/* Левая часть - текст сообщения */}
                      <p className="break-words whitespace-pre-wrap flex-1 mr-2">{message.content}</p>
                      
                      {/* Правая часть - время и галочки в одну строку */}
                      <div className="flex items-center space-x-1 flex-shrink-0 self-end">
                        {message.created_at && (
                          <span className={`text-xs leading-none ${
                            isMyMessage ? 'text-blue-100' : 'text-slate-500'
                          }`}>
                            {format(new Date(message.created_at), 'HH:mm', { locale: ru })}
                          </span>
                        )}
                        
                        {/* ✅ ГАЛОЧКИ ТОЛЬКО ДЛЯ СООБЩЕНИЙ ОТ ПЕРСОНАЛА */}
                        {isMyMessage && message.status && (
                          <MessageStatusIcon 
                            status={message.status} 
                            channel={selectedConversation?.channel?.toLowerCase()} 
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center space-x-2">
              <Input 
                placeholder="Введите сообщение..." 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)} 
                onKeyDown={(e) => { 
                  if (e.key === 'Enter' && !e.shiftKey) { 
                    e.preventDefault(); 
                    sendMessage(); 
                  } 
                }} 
                className="flex-1" 
              />
              <Button 
                onClick={sendMessage} 
                disabled={!newMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}