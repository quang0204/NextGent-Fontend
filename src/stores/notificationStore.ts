import { create } from 'zustand';
import { NotificationItem } from '../types/notification';
import { notificationService } from '../services/notificationService';

interface NotificationStore {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  activeUserId: number | null;
  loadNotifications: (userId: number) => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: number) => Promise<void>;
  addNotification: (item: Omit<NotificationItem, 'notificationId' | 'createdAt' | 'isRead'>) => Promise<void>;
  clearOnLogout: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  activeUserId: null,

  loadNotifications: async (userId: number) => {
    set({ isLoading: true, activeUserId: userId });
    try {
      const res = await notificationService.getNotifications(userId);
      const items = Array.isArray(res) ? res : res.items;
      const unread = typeof res === 'object' && 'unreadCount' in res ? res.unreadCount : items.filter(n => !n.isRead).length;
      set({ notifications: items, unreadCount: unread, isLoading: false });
    } catch (err) {
      console.error('Failed to load notifications', err);
      set({ isLoading: false });
    }
  },

  markAsRead: async (notificationId: number) => {
    await notificationService.markAsRead(notificationId);
    set(state => {
      const updated = state.notifications.map(n => 
        n.notificationId === notificationId ? { ...n, isRead: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter(n => !n.isRead).length
      };
    });
  },

  markAllAsRead: async () => {
    const userId = get().activeUserId;
    if (!userId) return;
    await notificationService.markAllAsRead(userId);
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0
    }));
  },

  deleteNotification: async (notificationId: number) => {
    await notificationService.deleteNotification(notificationId);
    set(state => {
      const updated = state.notifications.filter(n => n.notificationId !== notificationId);
      return {
        notifications: updated,
        unreadCount: updated.filter(n => !n.isRead).length
      };
    });
  },

  addNotification: async (item) => {
    const newItem = await notificationService.createNotification(item);
    if (get().activeUserId === item.userId) {
      set(state => {
        const updated = [newItem, ...state.notifications];
        return {
          notifications: updated,
          unreadCount: updated.filter(n => !n.isRead).length
        };
      });
    }
  },

  clearOnLogout: () => {
    set({
      notifications: [],
      unreadCount: 0,
      activeUserId: null,
      isLoading: false
    });
  }
}));
