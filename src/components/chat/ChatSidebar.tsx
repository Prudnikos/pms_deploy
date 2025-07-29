import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search, MessageCircle, AlertCircle, Check, CheckCheck, RefreshCw } from 'lucide-react';
import { format, isToday, isYesterday, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';

// --- Вспомогательные компоненты (остаются без изменений) ---
const ChannelIcon = ({ channel }) => {
    const channelKey = typeof channel === 'string' ? channel.toLowerCase() : '';
    const iconMap = {
        whatsapp: <img src="/icons/whatsapp.png" alt="WhatsApp" className="h-5 w-5" />,
    };
    if (!iconMap[channelKey]) return null;
    return (
        <div className="absolute bottom-[-2px] right-[-2px] bg-white rounded-full flex items-center justify-center">
            {iconMap[channelKey]}
        </div>
    );
};

const MessageStatus = ({ status }) => {
    if (status === 'read') return <CheckCheck className="h-5 w-5 text-blue-500" />;
    if (status === 'delivered') return <CheckCheck className="h-5 w-5 text-slate-400" />;
    if (status === 'sent') return <Check className="h-5 w-5 text-slate-400" />;
    return null;
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
    if (name.startsWith('Диалог')) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

// --- Основной компонент ---
export default function ChatSidebar({ onConversationSelect, selectedConversation }) {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const [debugInfo, setDebugInfo] = useState('');

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
            .channel('public-db-changes-final-debug')
            .on('postgres_changes', { event: '*', schema: 'public' }, 
                (payload) => {
                    console.log('🔔 Получено изменение в БД:', payload);
                    // Тихое обновление без показа лоадера
                    setTimeout(() => fetchConversations(true), 50);
                }
            )
            .subscribe();
            
        console.log('📡 Подписка настроена');
        
        return () => { 
            console.log('🔌 Отключаем подписку');
            supabase.removeChannel(subscription); 
        };
    }, [fetchConversations]);

    const handleConversationClick = async (conversation) => {
        console.log('👆 Клик по диалогу:', conversation.id, 'Непрочитанных:', conversation.unread_count);
        
        onConversationSelect(conversation);
        
        if (conversation.unread_count > 0) {
            // Оптимистичное обновление UI
            setConversations(prev => prev.map(c => 
                c.id === conversation.id ? { ...c, unread_count: 0 } : c
            ));
            
            console.log('🔄 Отмечаем диалог как прочитанный...');
            const { error: rpcError } = await supabase.rpc('mark_conversation_as_read', { 
                conv_id: conversation.id 
            });
            
            if (rpcError) {
                console.error("❌ Ошибка при отметке о прочтении:", rpcError);
                // Откатываем оптимистичное обновление
                setConversations(prev => prev.map(c => 
                    c.id === conversation.id ? { ...c, unread_count: conversation.unread_count } : c
                ));
            } else {
                console.log('✅ Диалог отмечен как прочитанный');
                // Тихое обновление без показа лоадера
                setTimeout(() => fetchConversations(true), 100);
            }
        }
    };

    const filteredConversations = conversations.filter(conv => {
        if (!searchTerm) return true;
        return getDisplayName(conv).toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="h-full flex flex-col bg-white border-r border-slate-200">
            {/* Хедер с debug информацией */}
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center">
                        <MessageCircle className="mr-2 h-5 w-5" />
                        Чаты
                    </h2>
                    <button 
                        onClick={() => fetchConversations(false)}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        title="Обновить список"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
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
                                    <AvatarImage src={conversation.contact_avatar_url} />
                                    <AvatarFallback>{getInitials(conversation)}</AvatarFallback>
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
                                            <MessageStatus status={conversation.last_message_status} />
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