import { apiClient } from './apiClient';
import { NotificationItem } from '../types/notification';

const STORAGE_NOTIF_KEY = 'ng_db_notifications_v2';

if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(STORAGE_NOTIF_KEY);
  } catch {}
}

const emitNotificationEvent = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('notification:updated'));
  }
};

let memoryNotifications: NotificationItem[] = [];

const getStoredNotifications = (): NotificationItem[] => memoryNotifications;

const saveNotifications = (items: NotificationItem[]) => {
  memoryNotifications = items;
  emitNotificationEvent();
};

export interface NotificationFetchResult {
  items: NotificationItem[];
  unreadCount: number;
}

export const notificationService = {
  /**
   * API 13.3: GET /api/v1/notifications
   * Lấy danh sách thông báo của tôi (Client - Auth)
   */
  async getNotifications(userId: number, page: number = 1, size: number = 20): Promise<NotificationFetchResult> {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: {
          items: any[];
          unreadCount: number;
          pageInfo: any;
        };
      }>('/notifications', { params: { page, size } });

      if (res.data?.data && Array.isArray(res.data.data.items) && res.data.data.items.length > 0) {
        const d = res.data.data;
        const mappedItems: NotificationItem[] = d.items.map((it) => ({
          notificationId: it.notificationId,
          userId: it.userId || userId,
          orderId: it.orderId,
          orderCode: it.orderCode || (it.orderId ? `DH-${it.orderId}` : undefined),
          title: it.title,
          content: it.content,
          type: it.orderId ? 'ORDER' : (it.type || 'SYSTEM'),
          isRead: Boolean(it.isRead),
          createdAt: it.createdAt || new Date().toISOString(),
        }));
        return {
          items: mappedItems,
          unreadCount: d.unreadCount ?? mappedItems.filter((n) => !n.isRead).length,
        };
      }
    } catch (err) {
      // Backend not yet returning notifications or endpoint unavailable
    }

    return {
      items: [],
      unreadCount: 0,
    };
  },

  /**
   * API 13.4: PATCH /api/v1/notifications/{id}/read
   * Đánh dấu một thông báo đã đọc
   */
  async markAsRead(notificationId: number): Promise<boolean> {
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`);
    } catch {
      // Bỏ qua lỗi kết nối backend
    }
    const all = getStoredNotifications();
    const updated = all.map((n) => (n.notificationId === notificationId ? { ...n, isRead: true } : n));
    saveNotifications(updated);
    return true;
  },

  /**
   * API 13.4 Phụ: PATCH /api/v1/notifications/read-all
   * Đánh dấu tất cả thông báo đã đọc
   */
  async markAllAsRead(userId: number): Promise<boolean> {
    try {
      await apiClient.patch('/notifications/read-all');
    } catch {
      // Bỏ qua lỗi kết nối backend
    }
    const all = getStoredNotifications();
    const updated = all.map((n) => (!n.userId || Number(n.userId) === Number(userId) ? { ...n, isRead: true } : n));
    saveNotifications(updated);
    return true;
  },

  /**
   * API: DELETE /api/v1/notifications/{id}
   * Xóa một thông báo
   */
  async deleteNotification(notificationId: number): Promise<boolean> {
    try {
      await apiClient.delete(`/notifications/${notificationId}`);
    } catch {
      // Bỏ qua lỗi kết nối backend
    }
    const all = getStoredNotifications();
    const updated = all.filter((n) => n.notificationId !== notificationId);
    saveNotifications(updated);
    return true;
  },

  async createNotification(
    notif: Omit<NotificationItem, 'notificationId' | 'createdAt' | 'isRead'>
  ): Promise<NotificationItem> {
    const all = getStoredNotifications();
    const newItem: NotificationItem = {
      ...notif,
      notificationId: Date.now() + Math.floor(Math.random() * 1000),
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    all.unshift(newItem);
    saveNotifications(all);
    return newItem;
  },
};
