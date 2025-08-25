import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search, MessageCircle, AlertCircle, Check, CheckCheck, RefreshCw, Sparkles } from 'lucide-react';
import { format, isToday, isYesterday, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';

// Компонент статуса сообщения с улучшенным дизайном
const MessageStatusIcon = ({ status }) => {
  switch (status) {
    case 'sent':
      return (
        <div className="flex items-center ml-1" title="Отправлено">
          <Check className="h-3 w-3 text-white/80 drop-shadow-sm" />
        </div>
      );
      
    case 'delivered':
      return (
        <div className="flex items-center ml-1" title="Доставлено">
          <CheckCheck className="h-3 w-3 text-white/80 drop-shadow-sm" />
        </div>
      );
      
    case 'read':
      return (
        <div className="flex items-center ml-1" title="Прочитано">
          <CheckCheck className="h-3 w-3 text-emerald-400 drop-shadow-glow" />
        </div>
      );
      
    case 'failed':
      return (
        <div className="flex items-center ml-1" title="Ошибка отправки">
          <AlertCircle className="h-3 w-3 text-rose-400 animate-pulse" />
        </div>
      );
      
    default:
      return null;
  }
};

// Компонент иконки канала с современным стилем
const ChannelIcon = ({ channel }) => {
    const channelKey = typeof channel === 'string' ? channel.toLowerCase() : '';
    const iconMap = {
        whatsapp: <img src="/icons/whatsapp.png" alt="WhatsApp" className="h-4 w-4" />,
        telegram: <img src="/icons/telegram.png" alt="Telegram" className="h-4 w-4" />,
        avito: <img src="/icons/avito.png" alt="Avito" className="h-4 w-4" />,
        email: <img src="/icons/email.png" alt="Email" className="h-4 w-4" />,
    };
    
    if (!iconMap[channelKey]) return null;
    
    return (
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-lg border-2 border-white flex items-center justify-center transform transition-transform hover:scale-110">
            {iconMap[channelKey]}
        </div>
    );
};

// Компонент статуса сообщения для списка
const MessageStatus = ({ status, isLastMessageFromStaff }) => {
    if (!isLastMessageFromStaff) return null;
    
    switch (status) {
        case 'sent':
            return (
                <div className="flex items-center" title="Отправлено">
                    <Check className="h-3.5 w-3.5 text-slate-400" />
                </div>
            );
            
        case 'delivered':
            return (
                <div className="flex items-center" title="Доставлено">
                    <CheckCheck className="h-3.5 w-3.5 text-slate-400" />
                </div>
            );
            
        case 'read':
            return (
                <div className="flex items-center" title="Прочитано">
                    <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                </div>
            );
            
        case 'failed':
            return (
                <div className="flex items-center" title="Ошибка отправки">
                    <AlertCircle className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                </div>
            );
            
        default:
            return null;
    }
};

const formatSmartTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (!isValid(d)) return '';
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Вчера';
    return format(d, 'dd.MM.yy', { locale: ru });
};

const getDisplayName = (conversation) => {
    if (conversation?.contact_full_name) return conversation.contact_full_name;
    return `Диалог #${(conversation?.id || '').substring(0, 6)}`;
};

const getInitials = (conversation) => {
    const name = getDisplayName(conversation);
    if (name.startsWith('Диалог')) {
        if (conversation.channel === 'whatsapp') return 'WA';
        if (conversation.channel === 'telegram') return 'TG';
        if (conversation.channel === 'avito') return 'AV';
        if (conversation.channel === 'email') return '@';
        return '??';
    }
    
    const words = name.trim().split(' ');
    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }
    return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
};

// --- Основной компонент с современным дизайном ---
export default function ChatSidebar({ onConversationSelect, selectedConversation }) {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const [debugInfo, setDebugInfo] = useState('');

    // Функция для загрузки аватара
    const fetchAvatar = async (conversation) => {
        if (conversation.contact_avatar_url) {
            console.log(`ℹ️ Аватар уже есть для ${conversation.contact_full_name}`);
            return null;
        }
        
        if (!conversation.contact_id) {
            console.log(`❌ Нет contact_id для ${conversation.contact_full_name}`);
            return null;
        }

        if (conversation.channel !== 'whatsapp' && conversation.channel !== 'telegram') {
            console.log(`ℹ️ Канал ${conversation.channel} не поддерживается для аватаров`);
            return null;
        }

        try {
            console.log(`🖼️ Загружаем аватар для ${conversation.channel}:`, conversation.contact_full_name);
            
            let external_id;
            if (conversation.channel === 'telegram') {
                external_id = conversation.telegram_user_id;
            } else if (conversation.channel === 'whatsapp') {
                external_id = conversation.whatsapp_sender_id;
            }

            if (!external_id) {
                console.log(`❌ Не найден external_id в диалоге для ${conversation.channel}`);
                
                console.log('🔄 Пробуем найти external_id в таблице contacts...');
                const { data: contactData, error: contactError } = await supabase
                    .from('contacts')
                    .select('external_id')
                    .eq('id', conversation.contact_id)
                    .single();

                if (contactError || !contactData?.external_id) {
                    console.log('❌ external_id не найден и в таблице contacts');
                    return null;
                }
                
                external_id = contactData.external_id;
            }

            console.log(`📞 Загружаем аватар для ${conversation.channel} ID:`, external_id);

            const functionName = conversation.channel === 'telegram' ? 'fetch-telegram-avatar' : 'fetch-whatsapp-avatar';
            const bodyParam = conversation.channel === 'telegram' ? 'telegram_user_id' : 'wa_id';

            const { data, error } = await supabase.functions.invoke(functionName, {
                body: {
                    [bodyParam]: external_id,
                    contact_id: conversation.contact_id
                }
            });

            if (error) {
                console.error('❌ Ошибка Edge Function:', error);
                return null;
            }

            if (data?.success && data?.avatar_url) {
                console.log('✅ Аватар загружен:', data.avatar_url);
                
                setConversations(prev => prev.map(c => 
                    c.id === conversation.id 
                        ? { ...c, contact_avatar_url: data.avatar_url }
                        : c
                ));

                return data.avatar_url;
            } else {
                console.log('ℹ️ Аватар не найден:', data?.message || 'Неизвестная ошибка');
                return null;
            }

        } catch (error) {
            console.error('💥 Ошибка при загрузке аватара:', error);
            return null;
        }
    };

    const updateConversationLastMessageStatus = useCallback(async (messageUpdate) => {
        console.log('🎯 Обновляем статус последнего сообщения в диалоге:', messageUpdate);
        
        try {
            setConversations(prev => prev.map(conv => {
                if (conv.id === messageUpdate.conversation_id) {
                    const isLastMessage = conv.last_message_sender_is_staff;
                    
                    if (isLastMessage) {
                        console.log(`✅ Обновляем статус диалога ${conv.contact_full_name}: ${messageUpdate.status}`);
                        return {
                            ...conv,
                            last_message_status: messageUpdate.status,
                            updated_at: new Date().toISOString()
                        };
                    }
                }
                return conv;
            }));
            
            console.log('✅ Статус диалога обновлен мгновенно');
            
        } catch (error) {
            console.error('💥 Ошибка умного обновления статуса:', error);
            setTimeout(() => fetchConversations(true), 500);
        }
    }, []);

    const handleGuestMessage = async (newMessage) => {
        try {
            console.log('🧠 Получено сообщение от гостя, проверяем непрочитанные сообщения...');
            
            const { data: unreadStaffMessages, error } = await supabase
                .from('messages')
                .select('id, content, created_at')
                .eq('conversation_id', newMessage.conversation_id)
                .eq('sender_type', 'staff')
                .in('status', ['sent', 'delivered'])
                .order('created_at', { ascending: false });
                
            if (error) {
                console.error('❌ Ошибка поиска непрочитанных сообщений:', error);
                return;
            }
            
            if (!unreadStaffMessages?.length) {
                console.log('ℹ️ Нет непрочитанных сообщений от персонала');
                return;
            }
            
            console.log(`📖 Найдено ${unreadStaffMessages.length} непрочитанных сообщений от персонала`);
            
            const messageAge = new Date() - new Date(unreadStaffMessages[0].created_at);
            const isRecentMessage = messageAge < 24 * 60 * 60 * 1000;
            
            if (isRecentMessage) {
                const messageIds = unreadStaffMessages.map(msg => msg.id);
                
                const { error: updateError } = await supabase
                    .from('messages')
                    .update({ 
                        status: 'read',
                        updated_at: new Date().toISOString()
                    })
                    .in('id', messageIds);
                    
                if (updateError) {
                    console.error('❌ Ошибка обновления статусов:', updateError);
                } else {
                    console.log(`✅ Помечено как прочитанное ${messageIds.length} сообщений (пользователь ответил)`);
                    setTimeout(() => fetchConversations(true), 500);
                }
            } else {
                console.log('⏰ Сообщения слишком старые, не помечаем как прочитанные автоматически');
            }
            
        } catch (error) {
            console.error('💥 Ошибка умной логики прочтения:', error);
        }
    };

    const testTelegramAvatar = async () => {
        console.log('🧪 Тестируем Telegram Avatar Function...');
        
        try {
            const result = await supabase.functions.invoke('fetch-telegram-avatar', {
                body: { 
                    telegram_user_id: '1322101796', 
                    contact_id: 'd860abee-90a9-4e01-a5bd-5ef07adb13da' 
                }
            });
            
            console.log('📊 Результат тестирования:', result);
            
            if (result.data?.success) {
                console.log('✅ Аватар успешно загружен:', result.data.avatar_url);
                fetchConversations(true);
            } else {
                console.log('❌ Не удалось загрузить аватар:', result.data?.message);
            }
            
        } catch (error) {
            console.error('💥 Ошибка тестирования:', error);
        }
    };

    const fetchConversations = useCallback(async (silent = false) => {
        console.log('🔄 Начинаем загрузку диалогов через RPC...', silent ? '(тихое обновление)' : '');
        setError('');
        if (!silent) setLoading(true);
        
        try {
            const { data, error: rpcError } = await supabase.rpc('get_conversations');
            
            if (rpcError) {
                console.error('❌ Ошибка RPC get_conversations:', rpcError);
                setError(`Ошибка RPC: ${rpcError.message}`);
                setDebugInfo(`RPC ошибка: ${rpcError.code} - ${rpcError.message}`);
            } else {
                console.log('✅ RPC функция вернула данные:', data?.length || 0);
                console.log('📊 Первые 3 диалога:', data?.slice(0, 3));
                console.log('🖼️ Аватары:', data?.slice(0, 3).map(c => ({ id: c.id, avatar: c.contact_avatar_url })));
                
                setConversations(data || []);
                setDebugInfo(`RPC функция работает. Найдено: ${data?.length || 0} диалогов`);
            }
        } catch (error) {
            console.error('💥 Неожиданная ошибка:', error);
            setError(`Неожиданная ошибка: ${error.message}`);
            setDebugInfo(`Исключение: ${error.message}`);
        }
        
        if (!silent) setLoading(false);
    }, []);

    useEffect(() => {
        fetchConversations();
        
        const subscription = supabase
            .channel('public-db-changes-smart-read-sidebar')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages'
            }, (payload) => {
                console.log('🔔 Новое сообщение в БД (sidebar):', payload.new);
                
                if (payload.new.sender_type === 'guest') {
                    console.log('👤 Сообщение от гостя');
                    
                    if (selectedConversation && payload.new.conversation_id === selectedConversation.id) {
                        console.log('📖 Сообщение в активном диалоге - помечаем как прочитанное сразу');
                        
                        setTimeout(async () => {
                            const { error } = await supabase.rpc('mark_conversation_as_read', { 
                                conv_id: payload.new.conversation_id 
                            });
                            
                            if (!error) {
                                console.log('✅ Активный диалог отмечен как прочитанный');
                            }
                        }, 100);
                    } else {
                        console.log('💭 Сообщение в неактивном диалоге - запускаем умную логику');
                        handleGuestMessage(payload.new);
                    }
                }
                
                setTimeout(() => fetchConversations(true), 300);
            })
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'messages'
            }, (payload) => {
                console.log('🔄 Обновление сообщения (sidebar):', payload.new.id, 'статус:', payload.new.status);
                updateConversationLastMessageStatus(payload.new);
                setTimeout(() => {
                    console.log('🔄 Дополнительная синхронизация диалогов');
                    fetchConversations(true);
                }, 2000);
            })
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'conversations'
            }, (payload) => {
                console.log('🔔 Изменение в диалогах:', payload);
                setTimeout(() => fetchConversations(true), 500);
            })
            .subscribe();
            
        console.log('📡 Подписка на умную логику прочтения (sidebar) настроена');
        
        return () => { 
            console.log('🔌 Отключаем подписку (sidebar)');
            supabase.removeChannel(subscription); 
        };
    }, []);

    const markOldMessagesAsRead = async () => {
        try {
            console.log('⏰ Проверяем старые сообщения для автоматического прочтения...');
            
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
            
            const { data: oldMessages, error } = await supabase
                .from('messages')
                .select('id, conversation_id')
                .eq('sender_type', 'staff')
                .eq('status', 'delivered')
                .lt('created_at', twoHoursAgo);
                
            if (error || !oldMessages?.length) {
                return;
            }
            
            console.log(`📅 Найдено ${oldMessages.length} старых сообщений для автопрочтения`);
            
            const messageIds = oldMessages.map(msg => msg.id);
            
            const { error: updateError } = await supabase
                .from('messages')
                .update({ status: 'read' })
                .in('id', messageIds);
                
            if (!updateError) {
                console.log(`✅ Автоматически помечено как прочитанное ${messageIds.length} старых сообщений`);
            }
            
        } catch (error) {
            console.error('💥 Ошибка автопрочтения старых сообщений:', error);
        }
    };

    useEffect(() => {
        const loadMissingAvatars = async () => {
            console.log('🔍 Проверяем аватары для всех диалогов...');
            
            const contactsWithoutAvatars = conversations.filter(conv => {
                const hasNoAvatar = !conv.contact_avatar_url;
                const isSupportedChannel = conv.channel === 'whatsapp' || conv.channel === 'telegram';
                const hasContactId = conv.contact_id;
                
                console.log(`📋 Диалог ${conv.contact_full_name}: канал=${conv.channel}, аватар=${conv.contact_avatar_url ? 'есть' : 'нет'}, contact_id=${conv.contact_id ? 'есть' : 'нет'}`);
                
                return hasNoAvatar && isSupportedChannel && hasContactId;
            });

            console.log(`🔄 Найдено ${contactsWithoutAvatars.length} контактов без аватаров для загрузки`);
            
            if (contactsWithoutAvatars.length === 0) {
                console.log('✅ Все аватары уже загружены или каналы не поддерживаются');
                return;
            }

            contactsWithoutAvatars.forEach(conv => {
                console.log(`🎯 Планируем загрузить аватар: ${conv.contact_full_name} (${conv.channel})`);
            });

            for (const conversation of contactsWithoutAvatars.slice(0, 3)) {
                console.log(`⏳ Загружаем аватар для ${conversation.contact_full_name} (${conversation.channel})`);
                await fetchAvatar(conversation);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        };

        if (conversations.length > 0) {
            console.log(`📊 Всего диалогов: ${conversations.length}`);
            loadMissingAvatars();
        }
    }, [conversations.length]);

    const handleConversationClick = async (conversation) => {
        console.log('👆 Клик по диалогу:', conversation.id, 'Непрочитанных:', conversation.unread_count);
        
        onConversationSelect(conversation);
        
        if (conversation.unread_count > 0) {
            setConversations(prev => prev.map(c => 
                c.id === conversation.id ? { ...c, unread_count: 0 } : c
            ));
            
            console.log('🔄 Отмечаем диалог как прочитанный...');
            
            const { error: rpcError } = await supabase.rpc('mark_conversation_as_read', { 
                conv_id: conversation.id 
            });
            
            if (rpcError) {
                console.error("❌ Ошибка при отметке о прочтении:", rpcError);
                setConversations(prev => prev.map(c => 
                    c.id === conversation.id ? { ...c, unread_count: conversation.unread_count } : c
                ));
            } else {
                console.log('✅ Диалог отмечен как прочитанный');
            }
        }
    };

    useEffect(() => {
        const interval = setInterval(markOldMessagesAsRead, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const filteredConversations = conversations.filter(conv => {
        if (!searchTerm) return true;
        return getDisplayName(conv).toLowerCase().includes(searchTerm.toLowerCase());
    });
    
    const updateMessageStatus = async (messageId, newStatus) => {
        try {
            console.log(`🔄 Обновляем статус сообщения ${messageId} на ${newStatus}`);
            
            const { error } = await supabase
                .from('messages')
                .update({ status: newStatus })
                .eq('id', messageId);
                
            if (error) {
                console.error('❌ Ошибка обновления статуса:', error);
            } else {
                console.log('✅ Статус обновлен успешно');
                fetchConversations(true);
            }
        } catch (error) {
            console.error('💥 Ошибка при обновлении статуса:', error);
        }
    };

    const simulateStatusUpdates = async (messageId) => {
        console.log('🧪 Симулируем обновление статусов...');
        setTimeout(() => updateMessageStatus(messageId, 'delivered'), 2000);
        setTimeout(() => updateMessageStatus(messageId, 'read'), 5000);
    };

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50/30 backdrop-blur-xl">
            {/* Современный хедер с градиентом */}
            <div className="p-5 bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent flex items-center">
                        <div className="mr-3 p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg shadow-blue-500/20">
                            <MessageCircle className="h-5 w-5 text-white" />
                        </div>
                        Сообщения
                    </h2>
                    <div className="flex items-center gap-2">
                        {/* ВРЕМЕННАЯ кнопка для тестирования */}
                        <button 
                            onClick={testTelegramAvatar}
                            className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-xs hover:shadow-lg hover:shadow-blue-500/25 transform transition-all hover:-translate-y-0.5"
                            title="Тест Telegram Avatar"
                        >
                            <Sparkles className="h-4 w-4" />
                        </button>
                        <button 
                            onClick={() => fetchConversations(false)}
                            className="p-2.5 bg-white hover:bg-slate-50 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md group"
                            title="Обновить список"
                        >
                            <RefreshCw className={`h-4 w-4 text-slate-600 group-hover:text-blue-600 transition-colors ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Debug информация с современным стилем */}
                {debugInfo && (
                    <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-xl text-xs text-blue-700 backdrop-blur-sm">
                        <div className="flex items-center">
                            <div className="animate-pulse mr-2">🔍</div>
                            {debugInfo}
                        </div>
                    </div>
                )}

                {/* Ошибки с современным дизайном */}
                {error && (
                    <div className="mb-3 p-3 bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200/50 rounded-xl text-xs text-rose-700 flex items-center backdrop-blur-sm">
                        <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Современное поле поиска */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input 
                            placeholder="Поиск по сообщениям..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="pl-10 pr-4 py-2.5 bg-white/90 backdrop-blur-sm border-slate-200/50 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Список диалогов с современными карточками */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                {loading && (
                    <div className="p-8 text-center">
                        <div className="inline-flex flex-col items-center">
                            <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl mb-4">
                                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                            <p className="text-slate-600 font-medium">Загрузка сообщений...</p>
                        </div>
                    </div>
                )}
                
                {!loading && !error && filteredConversations.length === 0 && conversations.length === 0 && (
                    <div className="p-8 text-center">
                        <div className="inline-flex flex-col items-center">
                            <div className="p-4 bg-gradient-to-br from-slate-100 to-blue-100 rounded-2xl mb-4">
                                <MessageCircle className="h-8 w-8 text-slate-400" />
                            </div>
                            <p className="text-slate-600 font-medium">Диалогов пока нет</p>
                            <p className="text-slate-400 text-sm mt-1">Новые сообщения появятся здесь</p>
                        </div>
                    </div>
                )}
                
                {!loading && !error && filteredConversations.length === 0 && conversations.length > 0 && (
                    <div className="p-8 text-center">
                        <div className="inline-flex flex-col items-center">
                            <div className="p-4 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl mb-4">
                                <Search className="h-8 w-8 text-orange-500" />
                            </div>
                            <p className="text-slate-600 font-medium">Ничего не найдено</p>
                            <p className="text-slate-400 text-sm mt-1">По запросу "{searchTerm}"</p>
                        </div>
                    </div>
                )}
                
                <div className="p-2">
                    {!loading && !error && filteredConversations.map((conversation) => (
                        <div
                            key={conversation.id}
                            onClick={() => handleConversationClick(conversation)}
                            className={`
                                relative mb-2 p-4 rounded-2xl cursor-pointer
                                transition-all duration-200 transform hover:scale-[1.02]
                                ${selectedConversation?.id === conversation.id 
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25' 
                                    : 'bg-white hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 shadow-sm hover:shadow-md'
                                }
                            `}
                        >
                            <div className="flex items-center space-x-3">
                                <div className="relative flex-shrink-0">
                                    <div className="relative">
                                        <Avatar className="h-12 w-12 ring-2 ring-white shadow-md">
                                            {conversation.contact_avatar_url ? (
                                                <AvatarImage 
                                                    src={conversation.contact_avatar_url} 
                                                    alt={getDisplayName(conversation)}
                                                    onError={(e) => {
                                                        console.log('❌ Ошибка загрузки аватара:', e.target.src);
                                                        fetchAvatar(conversation);
                                                    }}
                                                />
                                            ) : null}
                                            <AvatarFallback className={`font-semibold text-sm ${
                                                selectedConversation?.id === conversation.id
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                                            }`}>
                                                {getInitials(conversation)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <ChannelIcon channel={conversation.channel} />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                        <h3 className={`font-semibold truncate flex-1 pr-2 ${
                                            selectedConversation?.id === conversation.id
                                                ? 'text-white'
                                                : 'text-slate-800'
                                        }`}>
                                            {getDisplayName(conversation)}
                                        </h3>
                                        <span className={`text-xs flex-shrink-0 ${
                                            selectedConversation?.id === conversation.id
                                                ? 'text-white/80'
                                                : 'text-slate-400'
                                        }`}>
                                            {formatSmartTime(conversation.updated_at)}
                                        </span>
                                    </div>
                                    <div className="flex items-start justify-between mt-1">
                                        <p className={`text-sm truncate pr-2 ${
                                            selectedConversation?.id === conversation.id
                                                ? 'text-white/90'
                                                : 'text-slate-500'
                                        }`}>
                                            {conversation.last_message_sender_is_staff && (
                                                <span className="font-medium">Вы: </span>
                                            )}
                                            {conversation.last_message_preview}
                                        </p>
                                        <div className="flex-shrink-0 h-5 flex items-center justify-center min-w-[20px]">
                                            {conversation.unread_count > 0 ? (
                                                <div className="bg-gradient-to-r from-emerald-400 to-green-500 text-white text-xs font-bold rounded-full h-6 min-w-[24px] flex items-center justify-center px-1.5 shadow-lg shadow-emerald-500/30 animate-pulse">
                                                    {conversation.unread_count}
                                                </div>
                                            ) : conversation.last_message_sender_is_staff ? (
                                                <MessageStatus  
                                                    status={conversation.last_message_status} 
                                                    isLastMessageFromStaff={conversation.last_message_sender_is_staff}
                                                />
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* Добавьте эти стили в ваш глобальный CSS файл для скроллбара и анимаций */
/*
@layer utilities {
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
  
  .drop-shadow-glow {
    filter: drop-shadow(0 0 3px currentColor);
  }
}
*/