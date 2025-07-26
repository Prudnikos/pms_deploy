import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search, MessageCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '@/components/auth/AuthProvider';

export default function ChatSidebar({ onConversationSelect, selectedConversation }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  // Эта функция загружает диалоги и считает непрочитанные сообщения
  const fetchConversations = async () => {
    try {
      // 1. Получаем все диалоги
      const { data: convosData, error: convosError } = await supabase
        .from('conversations')
        .select(`
          *,
          guests ( full_name ) 
        `) // <-- Добавили получение имени гостя
        .order('updated_at', { ascending: false });

      if (convosError) throw convosError;

      // 2. Для каждого диалога считаем непрочитанные сообщения
      const conversationsWithUnread = await Promise.all(
        (convosData || []).map(async (convo) => {
          const { count, error: countError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', convo.id)
            .eq('sender_type', 'guest')
            .gt('created_at', convo.staff_last_seen_at || '1970-01-01');
          
          if (countError) console.error(`Ошибка подсчета для диалога ${convo.id}:`, countError);
          
          return {
            ...convo,
            unread_count: count || 0,
          };
        })
      );

      setConversations(conversationsWithUnread);

    } catch (err) {
      console.error('Ошибка загрузки диалогов:', err);
      setError('Не удалось загрузить диалоги.');
    } finally {
      if (loading) setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel('public:conversations_and_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => fetchConversations())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchConversations())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleConversationClick = async (conversation) => {
    onConversationSelect(conversation);
    
    // Отмечаем, что мы просмотрели диалог
    await supabase
      .from('conversations')
      .update({ staff_last_seen_at: new Date().toISOString() })
      .eq('id', conversation.id);

    // Оптимистично обновляем интерфейс
    const updatedConversations = conversations.map(c => 
      c.id === conversation.id ? { ...c, unread_count: 0 } : c
    );
    setConversations(updatedConversations);
  };

  // --- ИЗМЕНЕНИЕ 1: Обновляем фильтрацию для email ---
  const filteredConversations = conversations.filter(conv => {
    const search = searchTerm.toLowerCase();
    const guestName = conv.guests?.full_name?.toLowerCase() || '';
    const avitoId = conv.avito_user_id?.toString() || '';
    const email = conv.email_sender_address?.toLowerCase() || ''; // Добавили email
    return guestName.includes(search) || avitoId.includes(search) || email.includes(search);
  });
  
  // --- ИЗМЕНЕНИЕ 2: Обновляем получение инициалов ---
  const getInitials = (conversation) => {
    if (conversation.channel === 'avito') return 'AV';
    if (conversation.channel === 'email') return 'EM';
    if (conversation.guests?.full_name) {
        return conversation.guests.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return 'G';
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
          <MessageCircle className="mr-2 h-5 w-5" />
          Чаты
        </h2>
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            <AlertCircle className="h-4 w-4 mr-2" /> {error}
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Поиск по имени, ID, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-slate-500">Загрузка диалогов...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-slate-500">Нет диалогов</div>
        ) : (
          filteredConversations.map((conversation) => {
            // --- ИЗМЕНЕНИЕ 3: Улучшаем логику отображения ---
            let displayName, displayInfo, badgeClass;
            switch (conversation.channel) {
              case 'avito':
                displayName = `Avito User ${conversation.avito_user_id}`;
                displayInfo = `ID: ${conversation.avito_user_id}`;
                badgeClass = 'bg-green-100 text-green-800';
                break;
              case 'email':
                displayName = conversation.email_sender_address;
                displayInfo = 'Email';
                badgeClass = 'bg-yellow-100 text-yellow-800';
                break;
              default:
                displayName = conversation.guests?.full_name || `Гость ID ${conversation.guest_id}`;
                displayInfo = `ID: ${conversation.guest_id}`;
                badgeClass = 'bg-indigo-100 text-indigo-800';
            }
            
            const unreadCount = conversation.unread_count || 0;

            return (
              <div
                key={conversation.id}
                onClick={() => handleConversationClick(conversation)}
                className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${
                  selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {getInitials(conversation)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-semibold truncate ${unreadCount > 0 ? 'text-slate-900' : 'text-slate-700'}`}>
                        <span className={`text-xs font-bold uppercase mr-2 px-2 py-1 rounded-full ${badgeClass}`}>
                          {conversation.channel}
                        </span>
                        {displayName}
                      </h3>
                      {unreadCount > 0 && (
                        <div className="bg-green-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                          {unreadCount}
                        </div>
                      )}
                    </div>
                    <p className={`text-sm truncate mt-1 ${unreadCount > 0 ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>
                      {conversation.last_message_preview || 'Нет сообщений'}
                    </p>
                    <span className="text-xs text-slate-400 mt-2">
                      {format(new Date(conversation.updated_at), 'dd.MM HH:mm', { locale: ru })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}