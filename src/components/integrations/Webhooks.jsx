import { supabase } from '@/lib/supabase';

// Получение настроек вебхуков
export const getWebhookSettings = async () => {
  try {
    // Предполагаем, что настройки хранятся в таблице 'webhook_settings'
    const { data, error } = await supabase
      .from('webhook_settings')
      .select('*');

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Ошибка получения настроек вебхуков:', error);
    return { data: null, error: { message: error.message } };
  }
};

// Сохранение настроек вебхуков
export const saveWebhookSettings = async (settings) => {
  try {
    // Используем upsert для создания или обновления настроек.
    // Для этого в таблице 'webhook_settings' должен быть уникальный ключ (например, id или поле, идентифицирующее настройки).
    // Supabase автоматически обновит запись, если она существует, или создаст новую.
    const { data, error } = await supabase
      .from('webhook_settings')
      .upsert(settings)
      .select(); // .select() возвращает обновленные/созданные данные

    if (error) {
      throw error;
    }

    // Возвращаем первую (и единственную) запись из результата
    return { data: data ? data[0] : null, error: null };
  } catch (error) {
    console.error('Ошибка сохранения настроек вебхуков:', error);
    return { data: null, error: { message: error.message } };
  }
};