import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { notificationApi } from '@/services/api';

export interface NotificationSettings {
  announcements: boolean;
  assignments: boolean;
  quizzes: boolean;
  courses: boolean;
  general: boolean;
  sound: boolean;
  vibration: boolean;
  emailNotifications: boolean;
}

export interface Notification {
  id: number | string;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  createdAt?: string;
}

interface NotificationState {
  settings: NotificationSettings;
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;

  loadSettings: (userId: string) => Promise<void>;
  updateSettings: (userId: string, newSettings: Partial<NotificationSettings>) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string | number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  incrementUnreadCount: () => void;
  resetUnreadCount: () => void;
  setUnreadCount: (count: number) => void;
}

const defaultSettings: NotificationSettings = {
  announcements: true,
  assignments: true,
  quizzes: true,
  courses: true,
  general: true,
  sound: true,
  vibration: true,
  emailNotifications: false,
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  settings: defaultSettings,
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  loadSettings: async (_userId: string) => {
    set({ isLoading: true });
    try {
      // Load settings from AsyncStorage (settings are local preferences)
      const storedSettings = await AsyncStorage.getItem('notificationSettings');
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        set({ settings: { ...defaultSettings, ...parsed } });
      }

      // Fetch unread count from API
      try {
        const { data } = await notificationApi.getUnreadCount();
        set({ unreadCount: data.unread_count || data.count || 0 });
      } catch {
        const storedCount = await AsyncStorage.getItem('unreadNotificationCount');
        if (storedCount) {
          set({ unreadCount: parseInt(storedCount, 10) || 0 });
        }
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async (_userId: string, newSettings: Partial<NotificationSettings>) => {
    try {
      const currentSettings = get().settings;
      const updatedSettings = { ...currentSettings, ...newSettings };

      // Save to AsyncStorage
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(updatedSettings));
      set({ settings: updatedSettings });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  },

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const { data } = await notificationApi.list();
      const results = data.results || data;
      const notifications = (Array.isArray(results) ? results : []).map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message || n.body || '',
        type: n.type || n.notification_type,
        isRead: n.is_read || n.isRead || false,
        createdAt: n.created_at || n.createdAt,
      }));
      set({ notifications });

      // Update unread count
      const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;
      set({ unreadCount });
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  markAsRead: async (notificationId) => {
    try {
      await notificationApi.markAsRead(notificationId);
      const current = get().notifications;
      set({
        notifications: current.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, get().unreadCount - 1),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationApi.markAllAsRead();
      const current = get().notifications;
      set({
        notifications: current.map(n => ({ ...n, isRead: true })),
        unreadCount: 0,
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  },

  incrementUnreadCount: () => {
    const newCount = get().unreadCount + 1;
    set({ unreadCount: newCount });
    AsyncStorage.setItem('unreadNotificationCount', newCount.toString()).catch(() => { });
  },

  resetUnreadCount: () => {
    set({ unreadCount: 0 });
    AsyncStorage.setItem('unreadNotificationCount', '0').catch(() => { });
  },

  setUnreadCount: (count: number) => {
    set({ unreadCount: count });
    AsyncStorage.setItem('unreadNotificationCount', count.toString()).catch(() => { });
  },
}));
