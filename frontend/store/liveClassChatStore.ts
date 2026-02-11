import { create } from 'zustand';
import { liveClassApi } from '@/services/api';

export interface ChatMessage {
  id: number | string;
  classId?: string | number;
  senderId?: string;
  senderName?: string;
  user?: any;
  message: string;
  timestamp?: string | Date;
  isSystemMessage?: boolean;
}

function normalizeMessage(raw: any): ChatMessage {
  return {
    id: raw.id,
    classId: raw.class_id || raw.classId || raw.live_class,
    senderId: raw.sender_id || raw.senderId || raw.user?.id || raw.sender,
    senderName: raw.sender_name || raw.senderName || raw.user?.name || 'Unknown',
    message: raw.message || raw.content || '',
    timestamp: raw.timestamp || raw.created_at || raw.createdAt,
    isSystemMessage: raw.is_system_message || raw.isSystemMessage || false,
  };
}

interface LiveClassChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  unreadCount: number;

  fetchChatMessages: (classId: string | number) => Promise<void>;
  sendChatMessage: (classId: string | number, senderId: string, senderName: string, message: string) => Promise<void>;
  addSystemMessage: (classId: string | number, message: string) => Promise<void>;
  clearChat: (classId: string | number) => Promise<void>;
  getUnreadCount: () => number;
  resetUnreadCount: () => void;
}

export const useLiveClassChatStore = create<LiveClassChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  unreadCount: 0,

  fetchChatMessages: async (classId) => {
    set({ isLoading: true });
    try {
      const { data } = await liveClassApi.getChat(classId);
      const results = data.results || data;
      set({ messages: (Array.isArray(results) ? results : []).map(normalizeMessage) });
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  sendChatMessage: async (classId, _senderId, _senderName, message) => {
    try {
      const { data } = await liveClassApi.sendChat(classId, message);
      const newMessage = normalizeMessage(data);

      set((state) => ({
        messages: [...state.messages, newMessage],
      }));
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  },

  addSystemMessage: async (classId, message) => {
    try {
      // System messages are sent as regular messages via the API
      const { data } = await liveClassApi.sendChat(classId, message);
      const newMessage = normalizeMessage({ ...data, isSystemMessage: true });

      set((state) => ({
        messages: [...state.messages, newMessage],
      }));
    } catch (error) {
      console.error('Error adding system message:', error);
      throw error;
    }
  },

  clearChat: async (_classId) => {
    // Clear local state; server-side clearing is not typically exposed
    set({ messages: [] });
  },

  getUnreadCount: () => {
    return get().unreadCount;
  },

  resetUnreadCount: () => {
    set({ unreadCount: 0 });
  },
}));
