import { apiClient } from './apiClient';
import { NotificationItem } from '../types/notification';
import { useToastStore } from '../stores/toastStore';

// Dọn sạch key mock local cũ để không làm sai lệch số lượng với Database
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('ng_db_notifications_v3');
    localStorage.removeItem('ng_db_notifications_v2');
    localStorage.removeItem('ng_db_notifications');
  } catch {}
}

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

export interface NotificationFetchResult {
  items: NotificationItem[];
  unreadCount: number;
}

export const notificationService = {
  /**
   * API 13.3: GET /api/v1/notifications
   * Lấy danh sách thông báo chính xác 100% từ Database MySQL của người dùng hiện tại
   */
  async getNotifications(userId?: number, page: number = 1, size: number = 50): Promise<NotificationFetchResult> {
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
          userId: it.userId || userId || 0,
          orderId: it.orderId,
          orderCode: it.orderCode || (it.orderId ? `DH-${it.orderId}` : undefined),
          title: it.title,
          content: it.content,
          type: it.orderId ? 'ORDER' : (it.type || 'SYSTEM'),
          isRead: Boolean(it.isRead),
          createdAt: it.createdAt || new Date().toISOString(),
        }));

        return {
          items: mappedRemote,
          unreadCount: typeof d.unreadCount === 'number' ? d.unreadCount : mappedRemote.filter((n) => !n.isRead).length,
        };
      }
    } catch {
      // Backend offline hoặc chưa đăng nhập
    }

    return {
      items: [],
      unreadCount: 0,
    };
  },

  /**
   * API 13.4: PATCH /api/v1/notifications/{id}/read
   * Đánh dấu một thông báo đã đọc trực tiếp trong Database
   */
  async markAsRead(notificationId: number): Promise<boolean> {
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`);
      emitNotificationEvent({ notificationId, isRead: true });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * API 13.4 Phụ: PATCH /api/v1/notifications/read-all
   * Đánh dấu tất cả thông báo của người dùng đã đọc trong Database
   */
  async markAllAsRead(_userId?: number): Promise<boolean> {
    try {
      await apiClient.patch('/notifications/read-all');
      emitNotificationEvent({ allRead: true });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * API: DELETE /api/v1/notifications/{id}
   * Xóa một thông báo trong Database
   */
  async deleteNotification(notificationId: number): Promise<boolean> {
    try {
      await apiClient.delete(`/notifications/${notificationId}`);
      emitNotificationEvent({ deletedId: notificationId });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Tạo thông báo (dispatch sự kiện để UI refetch)
   */
  async createNotification(
    notif: Omit<NotificationItem, 'notificationId' | 'createdAt' | 'isRead'>
  ): Promise<NotificationItem> {
    const newItem: NotificationItem = {
      ...notif,
      notificationId: Date.now(),
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    emitNotificationEvent();
    return newItem;
  },

  /**
   * Thông báo tiến trình đơn hàng (hiển thị Toast thông báo tức thì trên giao diện)
   * Không lưu fake data vào localStorage để tránh lệch với Database.
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

    try {
      useToastStore.getState().showToast(content, toastType, 4500);
    } catch {}

    emitNotificationEvent();

    return {
      notificationId: Date.now(),
      userId,
      orderId,
      orderCode,
      title,
      content,
      type: 'ORDER',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
  },
};
