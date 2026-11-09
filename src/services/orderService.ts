import { apiClient } from './apiClient';
import { 
  CreateOrderPayload, 
  OrderResponse, 
  OrderDetail, 
  OrderStatus, 
  AdminOrdersPageResponse,
  OrderPipelineSummary 
} from '../types/order';
import { sharedStore } from './sharedStore';

export const orderService = {
  /**
   * API 8.1: POST /api/v1/orders
   * Đặt hàng Checkout (Tạo Phiếu MB01 & Giữ Chỗ Tồn Kho)
   */
  async createOrder(payload: CreateOrderPayload, userRole = 'CUSTOMER', userName = 'Khách hàng'): Promise<OrderResponse> {
    try {
      const response = await apiClient.post<{ success: boolean; data: any }>('/orders', payload, {
        headers: {
          'Idempotency-Key': crypto.randomUUID(),
        }
      });
      if (response.data?.data) {
        const d = response.data.data;
        const mappedRes: OrderResponse = {
          orderId: d.orderId,
          orderCode: d.orderCode,
          status: (d.status as OrderStatus) || 'WAITING_CONFIRMATION',
          totalAmount: d.totalAmount,
          paymentDeadline: d.paymentDeadline,
          createdAt: d.createdAt || new Date().toISOString(),
        };

        // Đồng bộ đơn hàng mới vào sharedStore để các view khác đọc được
        try {
          sharedStore.createOrder(payload, userRole, userName);
        } catch {
          // Bỏ qua nếu sharedStore đã có
        }

        return mappedRes;
      }
    } catch (err: any) {
      console.warn('[orderService.createOrder] Backend failed, fallback to sharedStore', err);
      if (err.response?.data?.message) {
        // Nếu lỗi 400 từ Backend (ví dụ hết hàng), ném lỗi để hiển thị toast
        throw new Error(err.response.data.message);
      }
    }

    return sharedStore.createOrder(payload, userRole, userName);
  },

  /**
   * API 8.2: GET /api/v1/orders/my-orders
   * Khách hàng tra cứu lịch sử mua hàng cá nhân
   */
  async getMyOrders(params?: { page?: number; size?: number; status?: string }): Promise<OrderDetail[]> {
    const page = params?.page || 1;
    const size = params?.size || 10;
    const status = params?.status || 'ALL';

    try {
      const res = await apiClient.get<{
        success: boolean;
        data: {
          content: any[];
          totalElements: number;
        };
      }>('/orders/my-orders', {
        params: { page, size, status: status === 'ALL' ? undefined : status }
      });

      if (res.data?.data?.content) {
        return res.data.data.content.map((o: any) => ({
          orderId: o.orderId,
          orderCode: o.orderCode,
          status: (o.status as OrderStatus) || 'WAITING_CONFIRMATION',
          recipientName: o.recipientName || 'Khách hàng',
          recipientPhone: o.recipientPhone || '',
          shippingAddress: o.shippingAddress || '',
          paymentMethod: o.paymentMethod || 'COD',
          paymentStatus: o.paymentStatus || 'UNPAID',
          shippingFee: o.shippingFee || 0,
          subtotal: o.subtotal || o.totalAmount || 0,
          voucherDiscount: o.voucherDiscount || 0,
          totalAmount: o.totalAmount,
          carrier: o.carrier,
          trackingCode: o.trackingCode,
          cancelReason: o.cancelReason,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt || o.createdAt,
          items: (o.items || []).map((it: any, idx: number) => ({
            orderItemId: it.orderItemId || idx + 1,
            variantId: it.variantId || idx + 1,
            productId: it.productId || idx + 1,
            productNameSnapshot: it.productNameSnapshot || it.productName || 'Sản phẩm',
            skuSnapshot: it.skuSnapshot || it.sku || '',
            colorSnapshot: it.colorSnapshot || it.color || '',
            romSnapshot: it.romSnapshot || it.romGb ? `${it.romGb}GB` : '',
            unitPrice: it.unitPrice || 0,
            quantity: it.quantity || 1,
            lineTotal: it.lineTotal || (it.unitPrice * it.quantity) || 0,
            imageUrl: it.imageUrl || '/assets/products/iphone-16-pro-max.png',
          })),
          statusHistory: (o.statusHistory || []).map((h: any) => ({
            status: (h.status as OrderStatus) || 'WAITING_CONFIRMATION',
            time: h.time || h.changedAt ? new Date(h.time || h.changedAt).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN'),
            note: h.note || h.description || '',
          }))
        }));
      }
    } catch (err) {
      console.warn('[orderService.getMyOrders] Backend offline or failed, fallback to sharedStore', err);
    }

    return sharedStore.getOrders();
  },

  /**
   * API 8.3: GET /api/v1/orders/{orderCode}
   * Chi tiết đơn hàng theo mã đơn
   */
  async getOrderByCode(orderCode: string): Promise<OrderDetail | null> {
    const clean = orderCode.trim().replace(/^#/, '');

    try {
      const res = await apiClient.get<{ success: boolean; data: any }>(`/orders/${encodeURIComponent(clean)}`);
      if (res.data?.data) {
        const d = res.data.data;
        return {
          orderId: d.orderId,
          orderCode: d.orderCode,
          status: (d.status as OrderStatus) || 'WAITING_CONFIRMATION',
          recipientName: d.recipientName,
          recipientPhone: d.recipientPhone,
          shippingAddress: d.shippingAddress,
          paymentMethod: d.paymentMethod,
          paymentStatus: d.paymentStatus,
          subtotal: d.subtotal,
          voucherDiscount: d.voucherDiscount || 0,
          shippingFee: d.shippingFee || 0,
          totalAmount: d.totalAmount,
          carrier: d.carrier,
          trackingCode: d.trackingCode,
          cancelReason: d.cancelReason,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
          completedAt: d.completedAt,
          items: (d.items || []).map((it: any, idx: number) => ({
            orderItemId: it.orderItemId || idx + 1,
            variantId: it.variantId || idx + 1,
            productId: it.productId || idx + 1,
            productNameSnapshot: it.productNameSnapshot || it.productName || 'Sản phẩm',
            skuSnapshot: it.skuSnapshot || it.sku || '',
            colorSnapshot: it.colorSnapshot || it.color || '',
            romSnapshot: it.romSnapshot || '',
            unitPrice: it.unitPrice || 0,
            quantity: it.quantity || 1,
            lineTotal: it.lineTotal || (it.unitPrice * it.quantity) || 0,
            imageUrl: it.imageUrl || '/assets/products/iphone-16-pro-max.png',
          })),
          statusHistory: (d.statusHistory || []).map((h: any) => ({
            status: (h.status as OrderStatus) || 'WAITING_CONFIRMATION',
            time: h.time || h.changedAt ? new Date(h.time || h.changedAt).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN'),
            note: h.note || '',
          }))
        };
      }
    } catch {
      // Fallback
    }

    return sharedStore.getOrderByCode(clean) || null;
  },

  /**
   * API 8.4: POST /api/v1/orders/{orderCode}/cancel
   * Khách hàng hủy đơn & Giải phóng kho tự động
   */
  async cancelOrder(orderIdOrCode: number | string, reason: string, performedBy = 'Khách hàng'): Promise<boolean> {
    let orderCode = typeof orderIdOrCode === 'string' ? orderIdOrCode : '';
    let numericId = typeof orderIdOrCode === 'number' ? orderIdOrCode : 0;

    if (!orderCode && numericId) {
      const existing = sharedStore.getOrderById(numericId);
      orderCode = existing?.orderCode || String(numericId);
    } else if (!numericId && orderCode) {
      const existing = sharedStore.getOrderByCode(orderCode);
      numericId = existing?.orderId || 0;
    }
    const clean = orderCode.trim().replace(/^#/, '');

    try {
      const res = await apiClient.post<{ success: boolean; message: string }>(`/orders/${encodeURIComponent(clean)}/cancel`, {
        reason
      });
      if (res.data?.success) {
        if (numericId) {
          sharedStore.cancelOrder(numericId, reason, performedBy);
        }
        return true;
      }
    } catch (err: any) {
      console.warn('[orderService.cancelOrder] Backend failed, fallback to sharedStore', err);
    }

    return numericId ? sharedStore.cancelOrder(numericId, reason, performedBy) : false;
  },

  /**
   * API 8.5: GET /api/v1/admin/orders
   * Quản trị danh sách đơn hàng & Pipeline Funnel
   */
  async getAdminOrders(params?: {
    page?: number;
    size?: number;
    status?: string;
    paymentStatus?: string;
  }): Promise<AdminOrdersPageResponse> {
    const page = params?.page || 1;
    const size = params?.size || 10;
    const status = params?.status || 'ALL';
    const paymentStatus = params?.paymentStatus || 'ALL';

    try {
      const res = await apiClient.get<{
        success: boolean;
        data: AdminOrdersPageResponse;
      }>('/admin/orders', {
        params: {
          page,
          size,
          status: status === 'ALL' ? undefined : status,
          paymentStatus: paymentStatus === 'ALL' ? undefined : paymentStatus,
        }
      });

      if (res.data?.data?.content) {
        const d = res.data.data;
        const mappedContent: OrderDetail[] = d.content.map((o: any) => {
          const existing = sharedStore.getOrderByCode(o.orderCode) || sharedStore.getOrderById(o.orderId);
          return {
            orderId: o.orderId,
            orderCode: o.orderCode,
            status: (o.status as OrderStatus) || existing?.status || 'WAITING_CONFIRMATION',
            recipientName: o.recipientName || existing?.recipientName || 'Khách hàng',
            recipientPhone: o.recipientPhone || existing?.recipientPhone || '',
            shippingAddress: o.shippingAddress || existing?.shippingAddress || '',
            paymentMethod: o.paymentMethod || existing?.paymentMethod || 'COD',
            paymentStatus: o.paymentStatus || existing?.paymentStatus || 'UNPAID',
            shippingFee: o.shippingFee ?? existing?.shippingFee ?? 0,
            subtotal: o.subtotal ?? existing?.subtotal ?? o.totalAmount,
            voucherDiscount: o.voucherDiscount ?? existing?.voucherDiscount ?? 0,
            totalAmount: o.totalAmount ?? existing?.totalAmount ?? 0,
            carrier: o.carrier || existing?.carrier,
            trackingCode: o.trackingCode || existing?.trackingCode,
            cancelReason: o.cancelReason || existing?.cancelReason,
            createdAt: o.createdAt || existing?.createdAt || new Date().toISOString(),
            updatedAt: o.updatedAt || existing?.updatedAt || new Date().toISOString(),
            completedAt: o.completedAt || existing?.completedAt,
            items: existing?.items || [],
            statusHistory: existing?.statusHistory || [
              {
                status: (o.status as OrderStatus) || 'WAITING_CONFIRMATION',
                time: new Date(o.createdAt || Date.now()).toLocaleString('vi-VN'),
                note: o.itemsSummary || 'Khởi tạo đơn hàng thành công'
              }
            ]
          };
        });

        return {
          content: mappedContent,
          page: d.page || page,
          size: d.size || size,
          totalElements: d.totalElements || mappedContent.length,
          totalPages: d.totalPages || 1,
          hasNext: d.hasNext ?? false,
          pipelineSummary: d.pipelineSummary
        };
      }
    } catch (err) {
      console.warn('[orderService.getAdminOrders] Backend offline or failed, fallback to sharedStore', err);
    }

    // Fallback: Lấy từ sharedStore
    const all = sharedStore.getOrders();
    const filtered = all.filter(o => {
      const matchStatus = status === 'ALL' || o.status === status;
      const matchPayment = paymentStatus === 'ALL' || o.paymentStatus === paymentStatus;
      return matchStatus && matchPayment;
    });

    const start = (page - 1) * size;
    const paginated = filtered.slice(start, start + size);

    // Tính pipelineSummary từ sharedStore
    const pipelineSummary: OrderPipelineSummary = {
      pendingPayment: all.filter(o => o.status === 'PENDING_PAYMENT').length,
      waitingConfirmation: all.filter(o => o.status === 'WAITING_CONFIRMATION').length,
      confirmed: all.filter(o => o.status === 'CONFIRMED').length,
      preparing: all.filter(o => o.status === 'PREPARING' || o.status === 'PICKED_UP').length,
      shipping: all.filter(o => o.status === 'SHIPPING').length,
      completed: all.filter(o => o.status === 'COMPLETED').length,
      cancelled: all.filter(o => o.status === 'CANCELLED').length,
    };

    return {
      content: paginated,
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size) || 1,
      hasNext: page * size < filtered.length,
      pipelineSummary
    };
  },

  /**
   * API 8.6: POST /api/v1/admin/orders/{id}/confirm
   * Duyệt đơn hàng (Phiếu MB02) & Tự động khởi tạo vận đơn
   */
  async confirmOrder(orderId: number, payload?: { carrier?: string; note?: string }): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      const res = await apiClient.post<{ success: boolean; message: string; data: any }>(
        `/admin/orders/${orderId}/confirm`,
        {
          carrier: payload?.carrier || 'Giao Hàng Nhanh (GHN)',
          note: payload?.note || 'Duyệt xác nhận đơn hàng MB02 và tự động tạo vận đơn'
        }
      );

      // Cập nhật trạng thái CONFIRMED vào sharedStore
      sharedStore.transitionOrderStatus(orderId, 'CONFIRMED', {
        carrier: payload?.carrier,
        performedBy: 'Nhân viên duyệt đơn (STAFF)'
      });

      return {
        success: res.data?.success ?? true,
        message: res.data?.message || 'Đã duyệt xác nhận đơn hàng MB02 thành công!',
        data: res.data?.data
      };
    } catch (err: any) {
      console.warn(`[orderService.confirmOrder] Backend failed for order ${orderId}, fallback to sharedStore`, err);
      const res = sharedStore.transitionOrderStatus(orderId, 'CONFIRMED', {
        carrier: payload?.carrier,
        performedBy: 'Nhân viên duyệt đơn (STAFF)'
      });
      return {
        success: res.success,
        message: res.message
      };
    }
  },

  /**
   * API 8.7: POST /api/v1/admin/orders/{id}/pack-export
   * Đóng gói & Xuất kho vật lý (Phiếu MB03 - Bàn giao vận chuyển)
   */
  async packExportOrder(orderId: number, payload?: {
    packageWeightGrams?: number;
    exportNote?: string;
    assignedShipper?: string;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const res = await apiClient.post<{ success: boolean; message: string; data: any }>(
        `/admin/orders/${orderId}/pack-export`,
        {
          packageWeightGrams: payload?.packageWeightGrams || 650,
          exportNote: payload?.exportNote || 'Đã dán niêm phong bảo hành và bọc bóng khí 4 lớp',
          assignedShipper: payload?.assignedShipper || 'Tài xế GHN'
        }
      );

      // Cập nhật trạng thái SHIPPING vào sharedStore
      sharedStore.transitionOrderStatus(orderId, 'SHIPPING', {
        reason: payload?.exportNote || 'Đã xuất kho vật lý (Phiếu MB03)'
      });

      return {
        success: res.data?.success ?? true,
        message: res.data?.message || 'Hoàn tất đóng gói và xuất kho MB03 thành công!',
        data: res.data?.data
      };
    } catch (err: any) {
      console.warn(`[orderService.packExportOrder] Backend failed for order ${orderId}, fallback to sharedStore`, err);
      const res = sharedStore.transitionOrderStatus(orderId, 'SHIPPING', {
        reason: payload?.exportNote || 'Đã xuất kho vật lý (Phiếu MB03)'
      });
      return {
        success: res.success,
        message: res.message
      };
    }
  },

  /**
   * API 9.1: Tra cứu hành trình vận chuyển Public theo Mã vận đơn hoặc Mã đơn hàng
   */
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
      // Fallback API 8.3
    }

    // 2. Thử gọi API 8.3: GET /api/v1/orders/{orderCode}
    try {
      const orderRes = await this.getOrderByCode(clean);
      if (orderRes) return orderRes;
    } catch {
      // Fallback sharedStore
    }

    const trimmed = orderCode.trim().toUpperCase().replace('#', '');
    const orders = sharedStore.getOrders();
    const found = orders.find(o => 
      o.orderCode.toUpperCase().includes(trimmed) || 
      (phone && o.recipientPhone.includes(phone.trim()))
    );
    return found || null;
  },

  async getAllOrders(): Promise<OrderDetail[]> {
    return this.getMyOrders();
  },

  async requestReturn(orderId: number, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      await apiClient.post(`/customer/orders/${orderId}/return-requests`, { reason });
      return { success: true, message: 'Đã gửi yêu cầu đổi trả thành công!' };
    } catch {
      const order = sharedStore.getOrderById(orderId);
      if (!order) return { success: false, message: 'Không tìm thấy đơn hàng' };
      if (order.status !== 'COMPLETED') {
        return { success: false, message: 'Chỉ có thể yêu cầu đổi trả với đơn hàng đã Hoàn tất.' };
      }

      order.statusHistory.unshift({
        status: 'COMPLETED',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
        note: `Khách hàng gửi yêu cầu Đổi trả / Hoàn tiền: ${reason}. Bộ phận CSKH đang xử lý.`
      });

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
