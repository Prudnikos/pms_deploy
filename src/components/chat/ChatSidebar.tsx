import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search, MessageCircle, AlertCircle, Check, CheckCheck, RefreshCw } from 'lucide-react';
import { format, isToday, isYesterday, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';

// Добавьте этот компонент в начало ChatInterface.jsx (после импортов)

const MessageStatusIcon = ({ status }) => {
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
      return (
        <div className="flex items-center ml-1" title="Доставлено">
          <div className="relative">
            <CheckCheck className="h-3 w-3 text-white opacity-70" />
          </div>
        </div>
      );
      
    case 'read':
      // 2 зеленые галочки - прочитано
      return (
        <div className="flex items-center ml-1" title="Прочитано">
          <div className="relative">
            <CheckCheck className="h-3 w-3 text-green-400" />
          </div>
        </div>
      );
      
    case 'failed':
      // Красный восклицательный знак - ошибка
      return (
        <div className="flex items-center ml-1" title="Ошибка отправки">
          <AlertCircle className="h-3 w-3 text-red-400" />
        </div>
      );
      
    default:
      return null;
  }
};

// --- Вспомогательные компоненты ---
const ChannelIcon = ({ channel }) => {
    const channelKey = typeof channel === 'string' ? channel.toLowerCase() : '';
    const iconMap = {
        whatsapp: <img src="/icons/whatsapp.png" alt="WhatsApp" className="h-5 w-5" />,
        telegram: <img src="/icons/telegram.png" alt="Telegram" className="h-5 w-5" />,
        avito: <img src="/icons/avito.png" alt="Avito" className="h-5 w-5" />,
        email: <img src="/icons/email.png" alt="Email" className="h-5 w-5" />,
    };
    
    if (!iconMap[channelKey]) return null;
    
    return (
        <div className="absolute bottom-[-2px] right-[-2px] bg-white rounded-full p-0.5 shadow-sm border border-slate-200 flex items-center justify-center">
            {iconMap[channelKey]}
        </div>
    );
};

const MessageStatus = ({ status, isLastMessageFromStaff }) => {
    // Показываем статусы только для сообщений от персонала
    if (!isLastMessageFromStaff) return null;
    
    switch (status) {
        case 'sent':
            // Одна серая галочка - отправлено
            return (
                <div className="flex items-center" title="Отправлено">
                    <Check className="h-4 w-4 text-slate-400" />
                </div>
            );
            
        case 'delivered':
            // Две серые галочки - доставлено
            return (
                <div className="flex items-center" title="Доставлено">
                    <div className="relative">
                        <CheckCheck className="h-4 w-4 text-slate-400" />
                    </div>
                </div>
            );
            
        case 'read':
            // Две синие галочки - прочитано
            return (
                <div className="flex items-center" title="Прочитано">
                    <div className="relative">
                        <CheckCheck className="h-4 w-4 text-blue-500" />
                    </div>
                </div>
            );
            
        case 'failed':
            // Красный восклицательный знак - ошибка отправки
            return (
                <div className="flex items-center" title="Ошибка отправки">
                    <AlertCircle className="h-4 w-4 text-red-500" />
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
        // Для неизвестных контактов используем иконку канала
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

// --- Основной компонент ---
export default function ChatSidebar({ onConversationSelect, selectedConversation }) {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const [debugInfo, setDebugInfo] = useState('');

    // Функция для загрузки аватара через Edge Function
   // Замените функцию fetchAvatar в ChatSidebar.tsx
const fetchAvatar = async (conversation) => {
    // Проверяем, что нет аватара и есть contact_id
    if (conversation.contact_avatar_url) {
        console.log(`ℹ️ Аватар уже есть для ${conversation.contact_full_name}`);
        return null;
    }
    
    if (!conversation.contact_id) {
        console.log(`❌ Нет contact_id для ${conversation.contact_full_name}`);
        return null;
    }

    // Поддерживаем WhatsApp и Telegram
    if (conversation.channel !== 'whatsapp' && conversation.channel !== 'telegram') {
        console.log(`ℹ️ Канал ${conversation.channel} не поддерживается для аватаров`);
        return null;
    }

    try {
        console.log(`🖼️ Загружаем аватар для ${conversation.channel}:`, conversation.contact_full_name);
        
        // ✅ ИСПРАВЛЕНИЕ: Используем данные прямо из диалога (новая RPC функция их возвращает)
        let external_id;
        if (conversation.channel === 'telegram') {
            external_id = conversation.telegram_user_id;
        } else if (conversation.channel === 'whatsapp') {
            external_id = conversation.whatsapp_sender_id;
        }

        if (!external_id) {
            console.log(`❌ Не найден external_id в диалоге для ${conversation.channel}`);
            
            // Запасной вариант - ищем в таблице contacts
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

        // Выбираем правильную Edge Function
        const functionName = conversation.channel === 'telegram' ? 'fetch-telegram-avatar' : 'fetch-whatsapp-avatar';
        const bodyParam = conversation.channel === 'telegram' ? 'telegram_user_id' : 'wa_id';

        // Вызываем Edge Function
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
            
            // Обновляем локальное состояние
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

// ✅ НОВАЯ ФУНКЦИЯ: Умное обновление статуса последнего сообщения в диалоге
const updateConversationLastMessageStatus = useCallback(async (messageUpdate) => {
    console.log('🎯 Обновляем статус последнего сообщения в диалоге:', messageUpdate);
    
    try {
        // ✅ МГНОВЕННОЕ ОБНОВЛЕНИЕ: обновляем статус локально
        setConversations(prev => prev.map(conv => {
            if (conv.id === messageUpdate.conversation_id) {
                // Проверяем, это ли последнее сообщение этого диалога
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
        // В случае ошибки делаем полную перезагрузку как fallback
        setTimeout(() => fetchConversations(true), 500);
    }
}, []);

// Функция для автоматического обновления статусов при получении ответа от гостя
const handleGuestMessage = async (newMessage) => {
    try {
        console.log('🧠 Получено сообщение от гостя, проверяем непрочитанные сообщения...');
        
        // Находим все неprочитанные сообщения от staff в этом диалоге
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
        
        // Логика определения прочтения:
        const messageAge = new Date() - new Date(unreadStaffMessages[0].created_at);
        const isRecentMessage = messageAge < 24 * 60 * 60 * 1000; // Младше 24 часов
        
        if (isRecentMessage) {
            // Помечаем как прочитанные только недавние сообщения
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
                
                // Обновляем список диалогов для отображения изменений
                setTimeout(() => fetchConversations(true), 500);
            }
        } else {
            console.log('⏰ Сообщения слишком старые, не помечаем как прочитанные автоматически');
        }
        
    } catch (error) {
        console.error('💥 Ошибка умной логики прочтения:', error);
    }
};

    // ВРЕМЕННАЯ функция для тестирования Telegram аватаров
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
                // Обновляем диалоги чтобы увидеть изменения
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
            // Используем вашу RPC функцию
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
    // Загружаем диалоги только один раз при монтировании компонента
    fetchConversations();
    
    const subscription = supabase
        .channel('public-db-changes-smart-read-sidebar')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages'
        }, (payload) => {
            console.log('🔔 Новое сообщение в БД (sidebar):', payload.new);
            
            // Если это сообщение от гостя
            if (payload.new.sender_type === 'guest') {
                console.log('👤 Сообщение от гостя');
                
                // ИСПРАВЛЕНИЕ: Если это сообщение в АКТИВНОМ диалоге - сразу помечаем как прочитанное
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
            
            // ✅ УЛУЧШЕНИЕ: Быстрее обновляем диалоги для новых сообщений
            setTimeout(() => fetchConversations(true), 300);
        })
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'messages'
        }, (payload) => {
            console.log('🔄 Обновление сообщения (sidebar):', payload.new.id, 'статус:', payload.new.status);
            
            // ✅ КРИТИЧЕСКОЕ УЛУЧШЕНИЕ: Умное обновление вместо полной перезагрузки
            updateConversationLastMessageStatus(payload.new);
            
            // ✅ ДОПОЛНИТЕЛЬНО: Небольшая задержка для синхронизации
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
}, []); // Убрали selectedConversation из зависимостей

// Дополнительная логика: помечать как прочитанные при долгом отсутствии активности
const markOldMessagesAsRead = async () => {
    try {
        console.log('⏰ Проверяем старые сообщения для автоматического прочтения...');
        
        // Находим сообщения старше 2 часов со статусом delivered
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

    // Замените весь useEffect для загрузки аватаров (около строки 397)
useEffect(() => {
    // Загружаем аватары для контактов без аватара (WhatsApp и Telegram)
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

        // Выводим детали для каждого контакта
        contactsWithoutAvatars.forEach(conv => {
            console.log(`🎯 Планируем загрузить аватар: ${conv.contact_full_name} (${conv.channel})`);
        });

        // Загружаем аватары по одному с задержкой
        for (const conversation of contactsWithoutAvatars.slice(0, 3)) { // Максимум 3 за раз
            console.log(`⏳ Загружаем аватар для ${conversation.contact_full_name} (${conversation.channel})`);
            await fetchAvatar(conversation);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Пауза 1 секунда
        }
    };

    if (conversations.length > 0) {
        console.log(`📊 Всего диалогов: ${conversations.length}`);
        loadMissingAvatars();
    }
}, [conversations.length]); // Срабатывает при изменении количества диалогов

    // Заменить функцию handleConversationClick
const handleConversationClick = async (conversation) => {
    console.log('👆 Клик по диалогу:', conversation.id, 'Непрочитанных:', conversation.unread_count);
    
    // ✅ СНАЧАЛА обновляем UI - мгновенно
    onConversationSelect(conversation);
    
    if (conversation.unread_count > 0) {
        // ✅ Оптимистичное обновление UI - сразу убираем счетчик
        setConversations(prev => prev.map(c => 
            c.id === conversation.id ? { ...c, unread_count: 0 } : c
        ));
        
        console.log('🔄 Отмечаем диалог как прочитанный...');
        
        // ✅ Помечаем как прочитанное в фоне
        const { error: rpcError } = await supabase.rpc('mark_conversation_as_read', { 
            conv_id: conversation.id 
        });
        
        if (rpcError) {
            console.error("❌ Ошибка при отметке о прочтении:", rpcError);
            // ✅ Откатываем оптимистичное обновление только при ошибке
            setConversations(prev => prev.map(c => 
                c.id === conversation.id ? { ...c, unread_count: conversation.unread_count } : c
            ));
        } else {
            console.log('✅ Диалог отмечен как прочитанный');
            // НЕ вызываем fetchConversations - UI уже обновлен!
        }
    }
};

// Запускать проверку старых сообщений каждые 30 минут
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
            // Обновляем список диалогов
            fetchConversations(true);
        }
    } catch (error) {
        console.error('💥 Ошибка при обновлении статуса:', error);
    }
};

// Функция для симуляции обновления статусов (для тестирования)
const simulateStatusUpdates = async (messageId) => {
    console.log('🧪 Симулируем обновление статусов...');
    
    // Отправлено → Доставлено через 2 секунды
    setTimeout(() => updateMessageStatus(messageId, 'delivered'), 2000);
    
    // Доставлено → Прочитано через 5 секунд
    setTimeout(() => updateMessageStatus(messageId, 'read'), 5000);
};

    return (
        <div className="h-full flex flex-col bg-white border-r border-slate-200">
            {/* Хедер с debug информацией */}
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center">
                        <MessageCircle className="mr-2 h-5 w-5" />
                        Чаты
                    </h2>
                    <div className="flex space-x-2">
                        {/* ВРЕМЕННАЯ кнопка для тестирования */}
                        <button 
                            onClick={testTelegramAvatar}
                            className="p-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                            title="Тест Telegram Avatar"
                        >
                            🧪 TG
                        </button>
                        <button 
                            onClick={() => fetchConversations(false)}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            title="Обновить список"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Debug информация */}
                {debugInfo && (
                    <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                        🐛 {debugInfo}
                    </div>
                )}

                {/* Ошибки */}
                {error && (
                    <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Поиск..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="pl-10"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading && (
                    <div className="p-4 text-center text-slate-500">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Загрузка...
                    </div>
                )}
                
                {!loading && !error && filteredConversations.length === 0 && conversations.length === 0 && (
                    <div className="p-4 text-center text-slate-500">
                        <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Диалогов пока нет
                    </div>
                )}
                
                {!loading && !error && filteredConversations.length === 0 && conversations.length > 0 && (
                    <div className="p-4 text-center text-slate-500">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Ничего не найдено по запросу "{searchTerm}"
                    </div>
                )}
                
                {!loading && !error && filteredConversations.map((conversation) => (
                    <div
                        key={conversation.id}
                        onClick={() => handleConversationClick(conversation)}
                        className={`p-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${
                            selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                        }`}
                    >
                        <div className="flex items-center space-x-3">
                            <div className="relative flex-shrink-0">
                                <Avatar className="h-12 w-12">
                                    {conversation.contact_avatar_url ? (
                                        <AvatarImage 
                                            src={conversation.contact_avatar_url} 
                                            alt={getDisplayName(conversation)}
                                            onError={(e) => {
                                                console.log('❌ Ошибка загрузки аватара:', e.target.src);
                                                // Можно попробовать загрузить аватар заново
                                                fetchAvatar(conversation);
                                            }}
                                        />
                                    ) : null}
                                    <AvatarFallback className="bg-blue-500 text-white font-semibold text-sm">
                                        {getInitials(conversation)}
                                    </AvatarFallback>
                                </Avatar>
                                <ChannelIcon channel={conversation.channel} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                    <h3 className="font-semibold truncate text-slate-800 flex-1 pr-2">
                                        {getDisplayName(conversation)}
                                    </h3>
                                    <span className="text-xs text-slate-400 flex-shrink-0">
                                        {formatSmartTime(conversation.updated_at)}
                                    </span>
                                </div>
                                <div className="flex items-start justify-between mt-1">
                                    <p className="text-sm truncate text-slate-500 pr-2">
                                        {conversation.last_message_sender_is_staff && (
                                            <span className="font-medium">Вы: </span>
                                        )}
                                        {conversation.last_message_preview}
                                    </p>
                                    <div className="flex-shrink-0 h-5 flex items-center justify-center min-w-[20px]">
                                        {conversation.unread_count > 0 ? (
                                            <div className="bg-green-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5">
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
    );
}