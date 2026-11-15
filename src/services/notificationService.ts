import { apiClient } from './apiClient';
import { NotificationItem } from '../types/notification';
import { useToastStore } from '../stores/toastStore';

const STORAGE_NOTIF_KEY = 'ng_db_notifications_v3';

// Kênh BroadcastChannel đồng bộ thông báo thời gian thực giữa các tab trình duyệt
let notifChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    notifChannel = new BroadcastChannel('nextgen_notifications_sync');
    notifChannel.onmessage = (event) => {
      if (event.data?.type === 'NOTIFICATION_UPDATED') {
        window.dispatchEvent(new CustomEvent('notification:updated', { detail: event.data }));
      }
    };
  } catch {
    // Trình duyệt cũ không hỗ trợ BroadcastChannel
  }
}

export const emitNotificationEvent = (data?: any) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('notification:updated', { detail: data }));
    if (notifChannel) {
      try {
        notifChannel.postMessage({ type: 'NOTIFICATION_UPDATED', data });
      } catch {}
    }
  }
};

const getStoredNotifications = (): NotificationItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_NOTIF_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveNotifications = (items: NotificationItem[]) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_NOTIF_KEY, JSON.stringify(items));
    } catch {}
    emitNotificationEvent();
  }
};

export interface NotificationFetchResult {
  items: NotificationItem[];
  unreadCount: number;
}

export const notificationService = {
  /**
   * API 13.3: GET /api/v1/notifications
   * Lấy danh sách thông báo của tôi (hợp nhất Local + Backend)
   */
  async getNotifications(userId: number, page: number = 1, size: number = 20): Promise<NotificationFetchResult> {
    const localAll = getStoredNotifications();
    // Lấy thông báo thuộc về userId này hoặc userId = 1 (mặc định) hoặc thông báo chung
    const localUserItems = localAll.filter((n) => !n.userId || n.userId === userId || n.userId === 1);

    try {
      const res = await apiClient.get<{
        success: boolean;
        data: {
          items: any[];
          unreadCount: number;
          pageInfo: any;
        };
      }>('/notifications', { params: { page, size } });

      if (res.data?.data && Array.isArray(res.data.data.items)) {
        const d = res.data.data;
        const mappedRemote: NotificationItem[] = d.items.map((it) => ({
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

        // Hợp nhất dữ liệu local và remote để không làm mất thông báo tiến trình đơn
        const merged = [...localUserItems];
        for (const rem of mappedRemote) {
          const exists = merged.some(
            (m) =>
              m.notificationId === rem.notificationId ||
              (m.orderCode && rem.orderCode && m.orderCode === rem.orderCode && m.title === rem.title)
          );
          if (!exists) {
            merged.push(rem);
          }
        }
        merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return {
          items: merged,
          unreadCount: merged.filter((n) => !n.isRead).length,
        };
      }
    } catch {
      // Backend offline hoặc endpoint tạm không phản hồi -> dùng localUserItems
    }

    return {
      items: localUserItems,
      unreadCount: localUserItems.filter((n) => !n.isRead).length,
    };
  },

  /**
   * API 13.4: PATCH /api/v1/notifications/{id}/read
   * Đánh dấu một thông báo đã đọc
   */
  async markAsRead(notificationId: number): Promise<boolean> {
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`);
    } catch {}
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
    } catch {}
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
    } catch {}
    const all = getStoredNotifications();
    const updated = all.filter((n) => n.notificationId !== notificationId);
    saveNotifications(updated);
    return true;
  },

  /**
   * Tạo thông báo mới và lưu trữ cục bộ
   */
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

  /**
   * CHỨC NĂNG 2: Thông báo nội bộ cho khách về tiến trình đơn hàng
   * Tự động gửi thông báo theo từng mốc trạng thái (Đặt hàng -> Xác nhận -> Đóng gói -> Lấy hàng -> Đang giao -> Giao thành công / Hủy / Hoàn về)
   * Đồng bộ tức thì qua BroadcastChannel và hiển thị Toast alert cho khách hàng mà không cần F5.
   */
  notifyOrderProgress(params: {
    orderId: number;
    orderCode: string;
    userId?: number;
    status: string;
    note?: string;
  }): NotificationItem {
    const { orderId, orderCode, userId = 1, status, note } = params;

    let title = `Cập nhật đơn hàng #${orderCode}`;
    let content = `Đơn hàng #${orderCode} đã chuyển sang trạng thái ${status}.`;
    let toastType: 'success' | 'info' | 'warning' = 'info';

    switch (status) {
      case 'PENDING_PAYMENT':
        title = `Đơn hàng #${orderCode} chờ thanh toán`;
        content = `Đơn hàng #${orderCode} đã được tạo thành công và đang giữ chỗ kho trong 30 phút. Vui lòng thanh toán để xác nhận đơn.`;
        toastType = 'info';
        break;

      case 'WAITING_CONFIRMATION':
        title = `Đặt hàng thành công #${orderCode}`;
        content = `Đơn hàng #${orderCode} đã được ghi nhận vào hệ thống NextGen và đang chờ bộ phận duyệt đơn xác nhận.`;
        toastType = 'success';
        break;

      case 'CONFIRMED':
        title = `Đơn hàng #${orderCode} đã được xác nhận!`;
        content = `NextGen đã duyệt đơn hàng #${orderCode} thành công. Đơn hàng đang được chuyển sang bộ phận kho để chuẩn bị sản phẩm.`;
        toastType = 'success';
        break;

      case 'PREPARING':
        title = `Kiện hàng #${orderCode} đang được chuẩn bị`;
        content = `Bộ phận kho đang tiến hành kiểm tra ngoại quan, dán tem niêm phong và đóng gói cẩn thận cho đơn hàng #${orderCode}.`;
        toastType = 'info';
        break;

      case 'PICKED_UP':
      case 'WAITING_PICKUP':
        title = `Bưu tá đã lấy kiện hàng #${orderCode}`;
        content = `Đơn vị vận chuyển đã lấy kiện hàng #${orderCode} từ kho NextGen và đang chuyển về bưu cục trung chuyển để giao cho bạn.`;
        toastType = 'info';
        break;

      case 'SHIPPING':
      case 'IN_TRANSIT':
        title = `Đơn hàng #${orderCode} đang trên đường giao!`;
        content = `Kiện hàng #${orderCode} đang được shipper vận chuyển đến địa chỉ của bạn. Quý khách vui lòng để ý điện thoại để nhận hàng.`;
        toastType = 'info';
        break;

      case 'COMPLETED':
      case 'DELIVERED':
        title = `Giao hàng thành công #${orderCode}`;
        content = `Đơn hàng #${orderCode} đã được giao thành công đến bạn. Cảm ơn quý khách đã tin tưởng và mua sắm tại NextGen Smart Tech!`;
        toastType = 'success';
        break;

      case 'CANCELLED':
        title = `Đơn hàng #${orderCode} đã bị hủy`;
        content = note
          ? `Đơn hàng #${orderCode} đã được hủy. Lý do: ${note}.`
          : `Đơn hàng #${orderCode} đã được hủy. Số lượng sản phẩm đã được hoàn lại tồn kho khả dụng.`;
        toastType = 'warning';
        break;

      case 'RETURNING':
      case 'DELIVERY_FAILED':
        title = `Đơn hàng #${orderCode} đang hoàn về`;
        content = note
          ? `Đơn hàng #${orderCode} đang được hoàn về kho. Lý do: ${note}.`
          : `Đơn hàng #${orderCode} giao không thành công và đang được bưu tá hoàn về kho NextGen.`;
        toastType = 'warning';
        break;

      case 'REFUNDED':
        title = `Hoàn tiền thành công #${orderCode}`;
        content = `Khoản tiền hoàn cho đơn hàng #${orderCode} đã được NextGen xử lý chuyển khoản thành công.`;
        toastType = 'success';
        break;

      default:
        if (note) {
          content = note;
        }
        break;
    }

    const all = getStoredNotifications();
    const newItem: NotificationItem = {
      notificationId: Date.now() + Math.floor(Math.random() * 1000),
      userId,
      orderId,
      orderCode,
      title,
      content,
      type: 'ORDER',
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    all.unshift(newItem);
    saveNotifications(all);

    // Kích hoạt thông báo nổi (Toast banner) trực tiếp trên màn hình
    try {
      useToastStore.getState().showToast(content, toastType, 4500);
    } catch {}

    return newItem;
  },
};
