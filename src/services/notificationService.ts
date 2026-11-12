import { apiClient } from './apiClient';
import { NotificationItem } from '../types/notification';

const STORAGE_NOTIF_KEY = 'ng_db_notifications_v2';

const emitNotificationEvent = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('notification:updated'));
  }
};

const getStoredNotifications = (): NotificationItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_NOTIF_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const saveNotifications = (items: NotificationItem[]) => {
  try {
    localStorage.setItem(STORAGE_NOTIF_KEY, JSON.stringify(items));
    emitNotificationEvent();
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

    // Fallback: Đồng bộ theo dữ liệu người dùng tại client
    const all = getStoredNotifications();
    let userNotifs = all.filter((n) => !n.userId || Number(n.userId) === Number(userId));

    // Nếu người dùng chưa có thông báo nào, tự động khởi tạo các thông báo chào mừng & đơn hàng sẵn có
    if (userNotifs.length === 0) {
      const initialItems: NotificationItem[] = [
        {
          notificationId: Date.now() - 3600000 * 2,
          userId,
          title: 'Chào mừng bạn đến với NextGen Smart Tech',
          content: 'Tài khoản của bạn đã được kích hoạt thành công. Khám phá hệ sinh thái thiết bị di động, máy tính bảng và phụ kiện chính hãng.',
          type: 'SYSTEM',
          isRead: false,
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          notificationId: Date.now() - 3600000,
          userId,
          title: 'Siêu sale công nghệ — Ưu đãi FREESHIP30',
          content: 'Nhận ngay ưu đãi miễn phí vận chuyển 30.000đ khi nhập mã FREESHIP30 tại bước thanh toán.',
          type: 'PROMO',
          isRead: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ];

      // Đọc các đơn hàng thực tế đang có để tạo thông báo tương ứng
      try {
        const ordersRaw = localStorage.getItem('ng_db_orders_v2');
        if (ordersRaw) {
          const orders = JSON.parse(ordersRaw);
          if (Array.isArray(orders)) {
            orders.slice(0, 3).forEach((ord: any, idx: number) => {
              const statusText = 
                ord.status === 'COMPLETED' ? 'Giao hàng thành công' :
                ord.status === 'SHIPPING' ? 'Đang trên đường giao hàng' :
                ord.status === 'PREPARING' ? 'Đang chuẩn bị kiện hàng' :
                ord.status === 'CONFIRMED' ? 'Đã được xác nhận' :
                'Đặt hàng thành công';

              initialItems.unshift({
                notificationId: Date.now() + idx + 1,
                userId,
                orderId: ord.orderId,
                orderCode: ord.orderCode,
                title: `Đơn hàng #${ord.orderCode} - ${statusText}`,
                content: ord.statusHistory?.[0]?.note || `Đơn hàng #${ord.orderCode} hiện đang ở trạng thái: ${statusText}.`,
                type: 'ORDER',
                isRead: false,
                createdAt: ord.createdAt || new Date().toISOString(),
              });
            });
          }
        }
      } catch {
        // Bỏ qua lỗi đọc đơn hàng
      }

      const merged = [...initialItems, ...all];
      saveNotifications(merged);
      userNotifs = initialItems;
    }

    const sorted = userNotifs.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
      items: sorted,
      unreadCount: sorted.filter((n) => !n.isRead).length,
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
