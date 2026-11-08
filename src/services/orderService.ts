import { apiClient } from './apiClient';
import { CreateOrderPayload, OrderResponse, OrderDetail, OrderStatus } from '../types/order';
import { sharedStore } from './sharedStore';

export const orderService = {
  // Tạo đơn hàng & Kích hoạt cơ chế Giữ chỗ tồn kho
  async createOrder(payload: CreateOrderPayload, userRole = 'CUSTOMER', userName = 'Khách hàng'): Promise<OrderResponse> {
    try {
      const response = await apiClient.post<{ success: boolean; data: OrderResponse }>('/customer/orders', payload, {
        headers: {
          'Idempotency-Key': crypto.randomUUID(),
        }
      });
      return response.data.data;
    } catch {
      return sharedStore.createOrder(payload, userRole, userName);
    }
  },

  // API 9.1: Tra cứu hành trình vận chuyển Public theo Mã vận đơn hoặc Mã đơn hàng
  async trackOrder(orderCode: string, phone?: string): Promise<OrderDetail | null> {
    const clean = orderCode.trim().replace(/^#/, '');

    // 1. Thử gọi API 9.1: GET /api/v1/shipments/track/{trackingCode}
    try {
      const trackRes = await apiClient.get<{ success: boolean; data: any }>(
        `/shipments/track/${encodeURIComponent(clean)}`
      );
      if (trackRes.data?.data) {
        const d = trackRes.data.data;
        const statusMap: Record<string, OrderStatus> = {
          READY_TO_PICK: 'PREPARING',
          PICKED: 'PICKED_UP',
          IN_TRANSIT: 'SHIPPING',
          DELIVERED: 'COMPLETED',
          FAILED_DELIVERY: 'CANCELLED',
          CANCELLED: 'CANCELLED',
        };

        const existingOrder = sharedStore.getOrderByCode(d.orderCode);

        const mappedOrder: OrderDetail = {
          orderId: d.shipmentId || existingOrder?.orderId || 1,
          orderCode: d.orderCode || clean,
          trackingCode: d.trackingCode,
          carrier: d.carrier,
          status: statusMap[d.status] || (d.status as OrderStatus) || 'SHIPPING',
          recipientName: d.recipientName,
          recipientPhone: d.recipientPhone,
          shippingAddress: d.shippingAddress,
          paymentMethod: existingOrder?.paymentMethod || 'COD',
          paymentStatus: d.status === 'DELIVERED' ? 'PAID' : (existingOrder?.paymentStatus || 'UNPAID'),
          shippingFee: existingOrder?.shippingFee || 0,
          subtotal: existingOrder?.subtotal || 34490000,
          voucherDiscount: existingOrder?.voucherDiscount || 0,
          totalAmount: existingOrder?.totalAmount || 34490000,
          cancelReason: d.status === 'FAILED_DELIVERY' ? 'Giao hàng thất bại' : existingOrder?.cancelReason,
          createdAt: existingOrder?.createdAt || d.timeline?.[0]?.time || new Date().toISOString(),
          updatedAt: existingOrder?.updatedAt || new Date().toISOString(),
          items: d.items?.map((it: any, idx: number) => ({
            orderItemId: idx + 1,
            variantId: idx + 1,
            productId: idx + 1,
            productNameSnapshot: it.productName,
            skuSnapshot: it.color || 'Tiêu chuẩn',
            colorSnapshot: it.color || '',
            romSnapshot: '',
            unitPrice: existingOrder?.items?.[idx]?.unitPrice || 34490000,
            quantity: it.quantity || 1,
            lineTotal: existingOrder?.items?.[idx]?.lineTotal || 34490000,
            imageUrl: existingOrder?.items?.[idx]?.imageUrl || '/assets/products/iphone-16-pro-max.png',
          })) || existingOrder?.items || [],
          statusHistory: d.timeline?.map((t: any) => ({
            time: new Date(t.time).toLocaleString('vi-VN', {
              hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
            }),
            status: statusMap[t.status] || 'SHIPPING',
            note: t.description || t.status,
          })) || existingOrder?.statusHistory || []
        };
        return mappedOrder;
      }
    } catch {
      // Bỏ qua lỗi 404 để tiếp tục fallback
    }

    try {
      const response = await apiClient.get<OrderDetail>(`/customer/orders/track`, {
        params: { orderCode, phone }
      });
      return response.data;
    } catch {
      const trimmed = orderCode.trim().toUpperCase().replace('#', '');
      const orders = sharedStore.getOrders();
      const found = orders.find(o => 
        o.orderCode.toUpperCase().includes(trimmed) || 
        (phone && o.recipientPhone.includes(phone.trim()))
      );
      return found || null;
    }
  },

  // Lấy danh sách tất cả đơn hàng (cho tài khoản cá nhân hoặc Admin/Staff)
  async getAllOrders(): Promise<OrderDetail[]> {
    try {
      const response = await apiClient.get<OrderDetail[]>(`/customer/orders`);
      return response.data;
    } catch {
      return sharedStore.getOrders();
    }
  },

  // Khách hàng tự hủy đơn khi còn ở trạng thái Chờ xác nhận hoặc Chờ thanh toán
  async cancelOrder(orderId: number, reason: string, performedBy = 'Khách hàng'): Promise<boolean> {
    try {
      await apiClient.post(`/customer/orders/${orderId}/cancellations`, { reason });
      return true;
    } catch {
      return sharedStore.cancelOrder(orderId, reason, performedBy);
    }
  },

  // Yêu cầu đổi trả trong 7 ngày sau khi đơn hoàn tất
  async requestReturn(orderId: number, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      await apiClient.post(`/customer/orders/${orderId}/return-requests`, { reason });
      return { success: true, message: 'Đã gửi yêu cầu đổi trả thành công!' };
    } catch {
      const order = sharedStore.getOrderById(orderId);
      if (!order) return { success: false, message: 'Không tìm thấy đơn hàng' };
      if (order.status!== 'COMPLETED') {
        return { success: false, message: 'Chỉ có thể yêu cầu đổi trả với đơn hàng đã Hoàn tất.' };
      }

      order.statusHistory.unshift({
        status: 'COMPLETED',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
        note: `Khách hàng gửi yêu cầu Đổi trả / Hoàn tiền: ${reason}. Bộ phận CSKH đang xử lý.`
      });

      // Tạo bản ghi trong Bảng Return_Requests (Bảng 21)
      sharedStore.createReturnRequest({
        orderId: order.orderId,
        orderCode: order.orderCode,
        userId: 101,
        requestedBy: order.recipientName,
        phone: order.recipientPhone,
        reason: reason,
        items: order.items.map(it => ({
          productName: it.productNameSnapshot,
          sku: it.skuSnapshot,
          quantity: it.quantity,
          unitPrice: it.unitPrice
        }))
      });

      return {
        success: true,
        message: 'Yêu cầu đổi trả của bạn đã được ghi nhận. Nhân viên CSKH sẽ liên hệ trong vòng 24h để hướng dẫn gửi máy về kho kiểm tra!'
      };
    }
  }
};
