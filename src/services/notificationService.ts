import { apiClient } from './apiClient';
import { NotificationItem } from '../types/notification';

// Mock seed notifications for demo and development
const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    notificationId: 1,
    userId: 101, // Trần Thị Thu Huyền
    orderId: 1001,
    orderCode: 'ORD2026102101',
    title: 'Đơn hàng đang trên đường giao đến bạn!',
    content: 'Bưu kiện đơn hàng #ORD2026102101 (iPhone 15 Pro Max) đã xuất kho và bàn giao cho Đơn vị vận chuyển Giao Hàng Nhanh.',
    type: 'ORDER',
    isRead: false,
    createdAt: '2026-10-27T08:30:00Z',
  },
  {
    notificationId: 2,
    userId: 101,
    orderId: 1002,
    orderCode: 'ORD2026102202',
    title: 'Đặt hàng thành công & Đã xác nhận',
    content: 'Đơn hàng #ORD2026102202 (Samsung Galaxy S24 Ultra) đã được hệ thống ghi nhận thành công và chuyển sang bộ phận đóng gói.',
    type: 'ORDER',
    isRead: false,
    createdAt: '2026-10-26T14:15:00Z',
  },
  {
    notificationId: 3,
    userId: 101,
    title: 'Siêu sale cuối tháng — Giảm thêm 500.000đ',
    content: 'Nhập mã NEXTGEN500 khi mua các dòng Flagship Apple & Samsung để nhận ưu đãi giảm trực tiếp 500.000đ.',
    type: 'PROMO',
    isRead: true,
    createdAt: '2026-10-25T10:00:00Z',
  },
  {
    notificationId: 4,
    userId: 101,
    title: 'Chào mừng bạn đến với NextGen Smart Tech',
    content: 'Tài khoản của bạn đã được kích hoạt thành công. Khám phá các chính sách bảo hành 12 tháng chính hãng và đổi trả 30 ngày.',
    type: 'SYSTEM',
    isRead: true,
    createdAt: '2026-10-20T08:00:00Z',
  },
  {
    notificationId: 5,
    userId: 102, // Staff
    title: 'Thông báo nội bộ hệ thống kho',
    content: 'Cập nhật định mức tồn kho an toàn cho dòng iPhone 15 Pro Max và iPad Pro M4.',
    type: 'SYSTEM',
    isRead: false,
    createdAt: '2026-10-27T07:00:00Z',
  },
  {
    notificationId: 6,
    userId: 103, // Admin
    title: 'Báo cáo doanh thu & Kiểm toán tuần 43',
    content: 'Báo cáo kiểm kê kho đã sẵn sàng để phê duyệt trong phân hệ Quản trị.',
    type: 'SYSTEM',
    isRead: false,
    createdAt: '2026-10-27T06:30:00Z',
  }
];

const STORAGE_NOTIF_KEY = 'nextpick_notifications_v1';

const getStoredNotifications = (): NotificationItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_NOTIF_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_NOTIF_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
};

const saveNotifications = (items: NotificationItem[]) => {
  try {
    localStorage.setItem(STORAGE_NOTIF_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Error saving notifications', err);
  }
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

      if (res.data?.data) {
        const d = res.data.data;
        const mappedItems: NotificationItem[] = (d.items || []).map((it) => ({
          notificationId: it.notificationId,
          userId: it.userId || userId,
          orderId: it.orderId,
          orderCode: it.orderId ? `DH-${it.orderId}` : undefined,
          title: it.title,
          content: it.content,
          type: it.orderId ? 'ORDER' : (it.type || 'SYSTEM'),
          isRead: it.isRead,
          createdAt: it.createdAt,
        }));
        return {
          items: mappedItems,
          unreadCount: d.unreadCount ?? mappedItems.filter((n) => !n.isRead).length,
        };
      }
    } catch (err) {
      console.warn('[notificationService.getNotifications] Fallback to local storage', err);
    }

    const all = getStoredNotifications();
    const userNotifs = all
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      items: userNotifs,
      unreadCount: userNotifs.filter((n) => !n.isRead).length,
    };
  },

  /**
   * API 13.4: PATCH /api/v1/notifications/{id}/read
   * Đánh dấu một thông báo đã đọc
   */
  async markAsRead(notificationId: number): Promise<boolean> {
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`);
    } catch (err) {
      console.warn('[notificationService.markAsRead] Fallback to local storage', err);
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
    } catch (err) {
      console.warn('[notificationService.markAllAsRead] Fallback to local storage', err);
    }
    const all = getStoredNotifications();
    const updated = all.map((n) => (n.userId === userId ? { ...n, isRead: true } : n));
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
    } catch (err) {
      console.warn('[notificationService.deleteNotification] Fallback to local storage', err);
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
      notificationId: Date.now(),
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    all.unshift(newItem);
    saveNotifications(all);
    return newItem;
  },
};
