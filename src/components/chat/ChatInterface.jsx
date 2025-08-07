import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle, Check, CheckCheck, AlertCircle, Paperclip, Smile, MoreVertical, Phone, Video } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';

// Компонент для отображения статусов сообщений с современным дизайном
const MessageStatusIcon = ({ status, channel }) => {
  // Для Telegram показываем только sent/delivered (без read)
  if (channel === 'telegram' && status === 'read') {
    return (
      <div className="flex items-center ml-1.5" title="Доставлено в Telegram">
        <CheckCheck className="h-3.5 w-3.5 text-white/90 drop-shadow-sm" />
      </div>
    );
  }
  
  switch (status) {
    case 'sent':
      return (
        <div className="flex items-center ml-1.5" title="Отправлено">
          <Check className="h-3.5 w-3.5 text-white/90 drop-shadow-sm" />
        </div>
      );
      
    case 'delivered':
      const deliveredTitle = channel === 'telegram' ? 'Доставлено в Telegram' : 
                           channel === 'email' ? 'Доставлено в почтовый ящик' : 
                           channel === 'whatsapp' ? 'Доставлено в WhatsApp' : 'Доставлено';
      return (
        <div className="flex items-center ml-1.5" title={deliveredTitle}>
          <CheckCheck className="h-3.5 w-3.5 text-white/90 drop-shadow-sm" />
        </div>
      );
      
    case 'read':
      const readTitle = channel === 'email' ? 'Прочитано (получатель открыл письмо)' : 
                       channel === 'whatsapp' ? 'Прочитано в WhatsApp' : 'Прочитано';
      return (
        <div className="flex items-center ml-1.5" title={readTitle}>
          <CheckCheck className="h-3.5 w-3.5 text-emerald-400 drop-shadow-glow" />
        </div>
      );
      
    case 'failed':
      const failedTitle = channel === 'email' ? 'Ошибка отправки письма' :
                         channel === 'whatsapp' ? 'Ошибка отправки в WhatsApp' :
                         channel === 'telegram' ? 'Ошибка отправки в Telegram' : 'Ошибка отправки';
      return (
        <div className="flex items-center ml-1.5" title={failedTitle}>
          <AlertCircle className="h-3.5 w-3.5 text-rose-400 animate-pulse drop-shadow-glow" />
        </div>
      );
      
    default:
      return null;
  }
};

// Компонент для отображения канала с современным бейджем
const ChannelBadge = ({ channel }) => {
  const channelStyles = {
    whatsapp: 'from-green-400 to-green-600 text-white',
    telegram: 'from-blue-400 to-blue-600 text-white',
    avito: 'from-purple-400 to-purple-600 text-white',
    email: 'from-orange-400 to-orange-600 text-white'
  };
  
  const channelIcons = {
    whatsapp: '💬',
    telegram: '✈️',
    avito: '🏠',
    email: '📧'
  };
  
  const style = channelStyles[channel?.toLowerCase()] || 'from-slate-400 to-slate-600 text-white';
  const icon = channelIcons[channel?.toLowerCase()] || '💬';
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r ${style} rounded-full text-xs font-medium shadow-md`}>
      <span>{icon}</span>
      <span className="capitalize">{channel}</span>
    </div>
  );
};

export default function ChatInterface({ selectedConversation }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
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

    // Подписка на новые сообщения и обновления статусов
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
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'messages', 
        filter: `conversation_id=eq.${selectedConversation.id}` 
      }, (payload) => {
        console.log('🔄 Обновление статуса сообщения:', payload.new.id, 'статус:', payload.new.status, 'канал:', payload.new.channel);
        
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

    // Оптимистичное обновление
    const tempMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversation.id,
      content,
      sender_id: user.id,
      sender_type: 'staff',
      status: 'sent',
      created_at: new Date().toISOString(),
      isOptimistic: true
    };
    
    setMessages(prev => [...prev, tempMessage]);

    try {
      console.log(`📤 Отправляем сообщение в ${conversation.channel}:`, content);

      const { data: newMessageData, error } = await supabase
        .from('messages')
        .insert({ 
          conversation_id: conversation.id, 
          content, 
          sender_id: user.id, 
          sender_type: 'staff',
          status: 'sent'
        })
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Сообщение сохранено в БД:', newMessageData.id);

      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id 
          ? { ...newMessageData, isOptimistic: false }
          : msg
      ));

      const channel = conversation.channel?.toLowerCase();
      let webhookUrl = null;
      let webhookPayload = {
        conversation_id: conversation.id,
        message_id: newMessageData.id,
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
          
          try {
            const responseData = await response.json();
            console.log(`📊 ${conversation.channel} Response:`, responseData);
            
            if (channel === 'whatsapp' && responseData && responseData.messages && responseData.messages[0] && responseData.messages[0].id) {
              const whatsappMessageId = responseData.messages[0].id;
              
              await supabase.from('messages')
                .update({ whatsapp_message_id: whatsappMessageId })
                .eq('id', newMessageData.id);
                
              console.log('✅ WhatsApp Message ID сохранен:', whatsappMessageId);
            }
            
            if (channel === 'email' && responseData && responseData.messageId) {
              console.log('✅ Email отправлен через Brevo, messageId:', responseData.messageId);
            }
            
          } catch (jsonError) {
            console.log('ℹ️ Не удалось получить response JSON:', jsonError.message);
          }
          
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
          
          setMessages(prev => prev.map(msg => 
            msg.id === tempMessage.id || msg.id === newMessageData.id
              ? { ...(msg.id === tempMessage.id ? newMessageData : msg), status: 'failed' }
              : msg
          ));
          
          await supabase.from('messages')
            .update({ status: 'failed' })
            .eq('id', newMessageData.id);
        }
      }

    } catch (error) { 
      console.error('💥 Ошибка отправки сообщения:', error);
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    }
  };

  const getHeaderText = () => {
    if (!selectedConversation) return '';
    
    const contactName = selectedConversation.contact_full_name || 'Неизвестный контакт';
    return contactName;
  };
  
  // Функция для группировки сообщений по дате
  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach(message => {
      const date = format(new Date(message.created_at), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };
  
  const formatDateHeader = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Сегодня';
    } else if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Вчера';
    } else {
      return format(date, 'd MMMM yyyy', { locale: ru });
    }
  };
  
  const messageGroups = groupMessagesByDate(messages);
  
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50/50 via-white to-blue-50/30">
      {!selectedConversation ? (
        <div className="flex h-full items-center justify-center p-4">
          <div className="text-center">
            <div className="inline-flex p-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl mb-6 shadow-lg shadow-blue-500/10">
              <MessageCircle className="h-16 w-16 text-gradient bg-gradient-to-br from-blue-500 to-purple-600" 
                style={{ 
                  background: 'linear-gradient(135deg, #3b82f6 0%, #9333ea 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }} 
              />
            </div>
            <p className="text-xl font-semibold text-slate-800 mb-2">Выберите диалог</p>
            <p className="text-sm text-slate-500 max-w-xs">Выберите чат из списка слева, чтобы начать общение</p>
          </div>
        </div>
      ) : (
        <>
          {/* Современный хедер чата */}
          <div className="px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <h3 className="font-semibold text-lg text-slate-900">{getHeaderText()}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <ChannelBadge channel={selectedConversation.channel} />
                    {isTyping && (
                      <span className="text-xs text-green-600 font-medium animate-pulse">
                        печатает...
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Дополнительные действия */}
              <div className="flex items-center gap-2">
                <button className="p-2.5 hover:bg-slate-100 rounded-xl transition-all duration-200 group">
                  <Phone className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
                </button>
                <button className="p-2.5 hover:bg-slate-100 rounded-xl transition-all duration-200 group">
                  <Video className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
                </button>
                <button className="p-2.5 hover:bg-slate-100 rounded-xl transition-all duration-200 group">
                  <MoreVertical className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Область сообщений с современным дизайном */}
          <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
            {loading && (
              <div className="flex justify-center items-center h-full">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
                  <p className="text-slate-500 font-medium">Загрузка сообщений...</p>
                </div>
              </div>
            )}
            
            {/* Группировка сообщений по дням */}
            {Object.entries(messageGroups).map(([date, dayMessages]) => (
              <div key={date}>
                {/* Дата-разделитель */}
                <div className="flex items-center justify-center my-4">
                  <div className="px-4 py-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-slate-200/50">
                    <span className="text-xs font-medium text-slate-600">
                      {formatDateHeader(date)}
                    </span>
                  </div>
                </div>
                
                {/* Сообщения дня */}
                {dayMessages.map((message) => {
                  const isMyMessage = message.sender_type === 'staff';
                  return (
                    <div 
                      key={message.id} 
                      className={`flex mb-3 ${isMyMessage ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                    >
                      <div className={`group relative max-w-[70%] ${isMyMessage ? 'items-end' : 'items-start'}`}>
                        <div 
                          className={`
                            px-4 py-2.5 rounded-2xl break-words shadow-sm
                            transition-all duration-200 transform hover:scale-[1.02]
                            ${isMyMessage 
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md shadow-lg shadow-blue-500/20' 
                              : 'bg-white text-slate-900 rounded-bl-md shadow-md border border-slate-100'
                            }
                            ${message.isOptimistic ? 'opacity-70' : ''}
                          `}
                          style={{ 
                            wordWrap: 'break-word', 
                            overflowWrap: 'break-word',
                          }}
                        >
                          <div className="flex items-end justify-between gap-2">
                            <p className="break-words whitespace-pre-wrap flex-1 leading-relaxed">
                              {message.content}
                            </p>
                            
                            <div className="flex items-center gap-1 flex-shrink-0 self-end ml-2">
                              {message.created_at && (
                                <span className={`text-xs leading-none ${
                                  isMyMessage ? 'text-blue-100' : 'text-slate-400'
                                }`}>
                                  {format(new Date(message.created_at), 'HH:mm', { locale: ru })}
                                </span>
                              )}
                              
                              {isMyMessage && message.status && (
                                <MessageStatusIcon 
                                  status={message.status} 
                                  channel={selectedConversation?.channel?.toLowerCase()} 
                                />
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Хвостик сообщения */}
                        <div className={`
                          absolute bottom-0 w-2 h-2
                          ${isMyMessage 
                            ? 'right-[-4px] bg-gradient-to-r from-blue-500 to-blue-600' 
                            : 'left-[-4px] bg-white border-l border-b border-slate-100'
                          }
                          ${isMyMessage ? 'rounded-bl-md' : 'rounded-br-md'}
                        `}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Современная панель ввода */}
          <div className="p-4 bg-white/80 backdrop-blur-xl border-t border-slate-200/50">
            <div className="flex items-center gap-2">
              {/* Кнопка прикрепления файла */}
              <button className="p-3 hover:bg-slate-100 rounded-xl transition-all duration-200 group">
                <Paperclip className="h-5 w-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
              </button>
              
              {/* Поле ввода с современным дизайном */}
              <div className="flex-1 relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition-opacity"></div>
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
                  className="relative pl-4 pr-4 py-3 bg-slate-50 border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 focus:bg-white transition-all placeholder:text-slate-400"
                />
              </div>
              
              {/* Кнопка эмодзи */}
              <button className="p-3 hover:bg-slate-100 rounded-xl transition-all duration-200 group">
                <Smile className="h-5 w-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
              </button>
              
              {/* Кнопка отправки с градиентом */}
              <Button 
                onClick={sendMessage} 
                disabled={!newMessage.trim()}
                className={`
                  px-4 py-3 rounded-xl font-medium transition-all duration-200 transform
                  ${newMessage.trim() 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }
                `}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* Добавьте эти анимации в ваш глобальный CSS файл */
/*
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}

.drop-shadow-glow {
  filter: drop-shadow(0 0 3px currentColor);
}

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 20px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}
*/