import { chatHandler } from '@/api/functions';

// Функции для работы с чатом
export const getConversations = async () => {
  try {
    const response = await chatHandler({
      url: '/api/chat/conversations',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: { message: error.message } };
  }
};

export const getMessages = async (conversationId) => {
  try {
    const response = await chatHandler({
      url: `/api/chat/conversations/${conversationId}/messages`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: { message: error.message } };
  }
};

export const sendStaffMessage = async (conversationId, messageText, staffId) => {
  try {
    const response = await chatHandler({
      url: `/api/chat/conversations/${conversationId}/messages`,
      method: 'POST',
      body: JSON.stringify({
        message_text: messageText,
        staff_id: staffId
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: { message: error.message } };
  }
};

export const sendGuestMessage = async (guestId, messageText, channel = 'guest_app') => {
  try {
    const response = await chatHandler({
      url: '/api/chat/ingress',
      method: 'POST',
      body: JSON.stringify({
        guest_id: guestId,
        message_text: messageText,
        channel: channel
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: { message: error.message } };
  }
};