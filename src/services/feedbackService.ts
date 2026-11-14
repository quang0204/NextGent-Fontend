import { apiClient, getStoredUser } from './apiClient';
import { sharedStore } from './sharedStore';
import { ProductReview } from '../types/review';
import { PortalSupportTicket, PortalFaqItem } from '../types/portal';

// ================= TYPES: REVIEWS =================
export interface ReviewPageInfo {
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
}

export interface ProductReviewsResponse {
  items: ProductReview[];
  totalReviews: number;
  averageRating: number;
  pageInfo: ReviewPageInfo;
}

export interface CreateReviewPayload {
  orderItemId: number;
  rating: number;
  comment: string;
  /** uploadId của ảnh đánh giá đã tải lên MinIO và đã confirm (tối đa 5). */
  uploadIds?: string[];
}

/** Backend trả link ảnh đánh giá trong trường `imageUrls` (giữ `images` cho dữ liệu cũ). */
const pickReviewImages = (it: any): string[] => {
  const list = it?.imageUrls ?? it?.images ?? [];
  return Array.isArray(list) ? list.filter((u: unknown): u is string => typeof u === 'string' && !!u) : [];
};

const mapApiReview = (it: any, fallback?: Partial<ProductReview>): ProductReview => ({
  reviewId: it.reviewId,
  orderItemId: it.orderItemId,
  productId: it.productId,
  productName: it.productName,
  variantName: it.variantName,
  userName: it.customerName || it.userName || fallback?.userName || 'Khách hàng',
  customerName: it.customerName,
  userPhoneMasked: it.customerPhone || fallback?.userPhoneMasked || '098****321',
  rating: it.rating,
  comment: it.comment,
  storeReply: it.reply || it.storeReply,
  reply: it.reply,
  repliedAt: it.repliedAt,
  images: pickReviewImages(it),
  createdAt: it.createdAt,
  updatedAt: it.updatedAt,
  isBuyerVerified: it.isVerifiedPurchase ?? true,
  isVerifiedPurchase: it.isVerifiedPurchase ?? true,
  status: it.status === 'HIDDEN' || sharedStore.isReviewHidden(it.reviewId) ? 'HIDDEN' : 'PUBLISHED',
});

export interface AdminReviewsQuery {
  page?: number;
  size?: number;
  status?: 'APPROVED' | 'HIDDEN' | string;
  rating?: number;
  search?: string;
}

export interface AdminReviewsResponse {
  items: ProductReview[];
  pageInfo: ReviewPageInfo;
}

// ================= TYPES: SUPPORT TICKETS =================
export interface CreateTicketPayload {
  subject: string;
  description: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export interface AdminTicketsQuery {
  page?: number;
  size?: number;
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'WAITING' | 'REJECTED' | string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;
  search?: string;
}

export interface AdminTicketsResponse {
  items: PortalSupportTicket[];
  pageInfo: ReviewPageInfo;
  statusCounts: {
    OPEN: number;
    IN_PROGRESS: number;
    RESOLVED: number;
    CLOSED: number;
  };
}

export interface UpdateAdminTicketPayload {
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | string;
  resolutionNote?: string;
}

// ================= TYPES: FAQS =================
export interface FaqGroupItem {
  category: string;
  items: PortalFaqItem[];
}

export interface CreateFaqPayload {
  question: string;
  answer: string;
  category: string;
  displayOrder?: number;
  isActive?: boolean;
}

// ================= REVIEW SERVICE =================
export const reviewService = {
  /**
   * API 12.1: GET /api/v1/reviews/product/{prodId}
   * Xem danh sách đánh giá của sản phẩm (Public)
   */
  async getProductReviews(
    prodId: number,
    page: number = 1,
    size: number = 10
  ): Promise<ProductReviewsResponse> {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: {
          items: any[];
          totalReviews: number;
          averageRating: number;
          pageInfo: ReviewPageInfo;
        };
      }>(`/reviews/product/${prodId}`, {
        params: { page, size },
      });

      if (res.data?.data) {
        const d = res.data.data;
        const rawItems: any[] = d.items || [];
        const mappedItems: ProductReview[] = rawItems
          .filter((it) => it.status !== 'HIDDEN' && !sharedStore.isReviewHidden(it.reviewId))
          .map((it) => mapApiReview(it));

        const removedCount = rawItems.length - mappedItems.length;
        const totalReviews = Math.max(0, (d.totalReviews ?? rawItems.length) - removedCount);
        const avg = removedCount > 0 && mappedItems.length > 0
          ? Number((mappedItems.reduce((sum, r) => sum + r.rating, 0) / mappedItems.length).toFixed(1))
          : (d.averageRating || 5);

        return {
          items: mappedItems,
          totalReviews,
          averageRating: avg,
          pageInfo: d.pageInfo ? {
            ...d.pageInfo,
            totalElements: totalReviews,
            totalPages: Math.ceil((totalReviews || 1) / size),
          } : {
            page,
            size,
            totalPages: Math.ceil((totalReviews || 1) / size),
            totalElements: totalReviews,
            hasNext: false,
          },
        };
      }
    } catch (err) {
      console.warn('[reviewService.getProductReviews] Fallback to sharedStore', err);
    }

    // Fallback sang sharedStore
    const localReviews = sharedStore.getReviews(prodId);
    const avg = localReviews.length > 0
      ? Number((localReviews.reduce((sum, r) => sum + r.rating, 0) / localReviews.length).toFixed(1))
      : 5;

    return {
      items: localReviews,
      totalReviews: localReviews.length,
      averageRating: avg,
      pageInfo: {
        page: 1,
        size: localReviews.length,
        totalPages: 1,
        totalElements: localReviews.length,
        hasNext: false,
      },
    };
  },

  /**
   * Tải ảnh đánh giá lên MinIO trước khi gọi API 12.2:
   * 1) POST /storage/presigned-urls (storageType = REVIEWS)
   * 2) PUT từng ảnh lên uploadUrl
   * 3) POST /storage/confirm cho từng ảnh
   * Trả về danh sách uploadId để gửi kèm khi tạo đánh giá.
   */
  async uploadReviewImages(files: File[]): Promise<string[]> {
    if (files.length === 0) return [];

    const presignedRes = await apiClient.post<{ success: boolean; message?: string; data: any[] }>(
      '/storage/presigned-urls',
      {
        storageType: 'REVIEWS',
        files: files.map((f) => ({
          fileName: f.name || `review-${Date.now()}.jpg`,
          contentType: f.type,
          fileSize: f.size,
        })),
      }
    );
    const items = presignedRes.data?.data || [];
    if (items.length !== files.length) {
      throw new Error('Không nhận đủ liên kết tải ảnh từ máy chủ.');
    }

    const uploadIds: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const item = items[i];
      if (!item?.uploadUrl || !item?.uploadId) {
        throw new Error('Máy chủ trả về liên kết tải ảnh không hợp lệ.');
      }

      let putRes: Response;
      try {
        putRes = await fetch(item.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': files[i].type || 'application/octet-stream' },
          body: files[i],
        });
      } catch (err) {
        // Lỗi mạng / MinIO tắt / trình duyệt chặn (CORS, tiện ích chặn quảng cáo): fetch ném "Failed to fetch"
        console.warn('[reviewService.uploadReviewImages] PUT lên MinIO lỗi', item.uploadUrl?.split('?')[0], err);
        throw new Error(
          `Không kết nối được máy chủ lưu ảnh (${new URL(item.uploadUrl).origin}) để tải "${files[i].name}". Vui lòng thử lại.`
        );
      }
      if (!putRes.ok) {
        console.warn('[reviewService.uploadReviewImages] MinIO từ chối', putRes.status, await putRes.text().catch(() => ''));
        throw new Error(`Tải ảnh "${files[i].name}" lên thất bại (HTTP ${putRes.status}).`);
      }

      await apiClient.post('/storage/confirm', {
        uploadId: item.uploadId,
        objectKey: item.objectKey,
      });
      uploadIds.push(item.uploadId);
    }
    return uploadIds;
  },

  /**
   * API 12.2: POST /api/v1/reviews
   * Gửi đánh giá cho sản phẩm đã mua (Client - Auth)
   */
  async createReview(payload: CreateReviewPayload): Promise<{
    success: boolean;
    message: string;
    review?: ProductReview;
  }> {
    try {
      const res = await apiClient.post<{
        success: boolean;
        message: string;
        data: any;
      }>('/reviews', payload);

      if (res.data?.data) {
        return {
          success: true,
          message: res.data.message || 'Gửi đánh giá thành công',
          review: mapApiReview(res.data.data),
        };
      }
    } catch (err: any) {
      console.warn('[reviewService.createReview] Fallback to sharedStore', err);
      if (err.response?.data?.message) {
        return {
          success: false,
          message: err.response.data.message,
        };
      }
      // Đã tải ảnh lên MinIO mà không gọi được máy chủ: không lưu "giả" vào dữ liệu mẫu trên máy
      // (sẽ báo thành công nhưng mất ảnh và không có trong hệ thống thật).
      if (payload.uploadIds && payload.uploadIds.length > 0) {
        return {
          success: false,
          message: 'Không kết nối được máy chủ để gửi đánh giá. Vui lòng thử lại.',
        };
      }
    }

    // Fallback sang sharedStore
    const user = getStoredUser();
    const localResult = sharedStore.submitReview({
      orderItemId: payload.orderItemId,
      productId: 0,
      userName: user.fullName || 'Khách hàng',
      phone: user.phone || '0987654321',
      rating: payload.rating,
      comment: payload.comment,
    });
    return localResult;
  },

  /**
   * API 12.3: GET /api/v1/admin/reviews
   * Quản lý đánh giá toàn hệ thống (Portal - STAFF / ADMIN)
   */
  async getAdminReviews(query: AdminReviewsQuery = {}): Promise<AdminReviewsResponse> {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: {
          items: any[];
          pageInfo: ReviewPageInfo;
        };
      }>('/admin/reviews', { params: query });

      if (res.data?.data) {
        const d = res.data.data;
        return {
          items: (d.items || []).map((it) => mapApiReview(it)),
          pageInfo: d.pageInfo,
        };
      }
    } catch (err) {
      console.warn('[reviewService.getAdminReviews] Fallback to sharedStore', err);
    }

    // Fallback sang sharedStore (bao gồm cả đánh giá đã ẩn để quản trị)
    const all = sharedStore.getReviews(undefined, true);
    let filtered = [...all];
    if (query.status) {
      const target = query.status === 'HIDDEN' ? 'HIDDEN' : 'PUBLISHED';
      filtered = filtered.filter((r) => (r.status === 'HIDDEN' ? 'HIDDEN' : 'PUBLISHED') === target);
    }
    if (query.rating) {
      filtered = filtered.filter((r) => r.rating === query.rating);
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.comment || '').toLowerCase().includes(q) ||
          (r.userName || '').toLowerCase().includes(q) ||
          (r.productName || '').toLowerCase().includes(q)
      );
    }
    const page = query.page || 1;
    const size = query.size || 10;
    const start = (page - 1) * size;
    const slice = filtered.slice(start, start + size);

    return {
      items: slice,
      pageInfo: {
        page,
        size,
        totalPages: Math.ceil(filtered.length / size) || 1,
        totalElements: filtered.length,
        hasNext: start + size < filtered.length,
      },
    };
  },

  /**
   * API 12.3 Phụ: PUT /api/v1/admin/reviews/{id}/reply
   * Cửa hàng phản hồi đánh giá (Portal - STAFF / ADMIN)
   */
  async replyAdminReview(id: number, replyText: string): Promise<ProductReview | null> {
    const localUpdated = sharedStore.replyReview(id, replyText);
    try {
      const res = await apiClient.put<{
        success: boolean;
        message: string;
        data: any;
      }>(`/admin/reviews/${id}/reply`, { reply: replyText });

      if (res.data?.data) {
        return mapApiReview(res.data.data);
      }
    } catch (err) {
      console.warn('[reviewService.replyAdminReview] Fallback to sharedStore', err);
    }
    return localUpdated;
  },

  /**
   * API 12.3 Phụ: PATCH /api/v1/admin/reviews/{id}/status
   * Ẩn / Hiện đánh giá trên trang sản phẩm (Portal - STAFF / ADMIN)
   */
  async updateAdminReviewStatus(
    id: number,
    status: 'PUBLISHED' | 'HIDDEN',
    reviewSnapshot?: ProductReview
  ): Promise<ProductReview | null> {
    const localUpdated = sharedStore.updateReviewStatus(id, status, reviewSnapshot);
    try {
      const apiStatus = status === 'HIDDEN' ? 'HIDDEN' : 'VISIBLE';
      const res = await apiClient.patch<{
        success: boolean;
        message: string;
        data: any;
      }>(`/admin/reviews/${id}/status`, { status: apiStatus });

      if (res.data?.data) {
        return mapApiReview(res.data.data, reviewSnapshot);
      }
    } catch (err) {
      console.warn('[reviewService.updateAdminReviewStatus] Fallback to sharedStore', err);
    }
    return localUpdated;
  },
};

// ================= SUPPORT TICKET SERVICE =================
export const ticketService = {
  /**
   * API 12.4: POST /api/v1/support-tickets
   * Gửi phiếu hỗ trợ khiếu nại / kỹ thuật (Client - Auth)
   */
  async createTicket(payload: CreateTicketPayload): Promise<{
    success: boolean;
    message: string;
    ticket?: PortalSupportTicket;
  }> {
    const user = getStoredUser();
    try {
      const res = await apiClient.post<{
        success: boolean;
        message: string;
        data: any;
      }>('/support-tickets', payload);

      if (res.data?.data) {
        const d = res.data.data;
        const mappedTicket: PortalSupportTicket = {
          ticketId: d.ticketId,
          userId: d.userId || user.userId,
          customerName: d.customerName || user.fullName || 'Khách hàng',
          customerEmail: d.customerEmail || user.email,
          customerPhone: d.customerPhone || user.phone,
          phone: d.customerPhone || user.phone || '0912345678',
          category: d.subject || payload.subject,
          content: d.description || payload.description,
          subject: d.subject || payload.subject,
          description: d.description || payload.description,
          priority: d.priority || payload.priority || 'MEDIUM',
          status: d.status || 'OPEN',
          handledById: d.handledById,
          handledByName: d.handledByName,
          resolutionNote: d.resolutionNote,
          resolvedAt: d.resolvedAt,
          createdAt: d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt,
        };
        sharedStore.addTicket(mappedTicket);
        return {
          success: true,
          message: res.data.message || 'Gửi phiếu hỗ trợ thành công',
          ticket: mappedTicket,
        };
      }
    } catch (err: any) {
      console.warn('[ticketService.createTicket] Fallback to sharedStore', err);
      if (err.response?.data?.message) {
        return {
          success: false,
          message: err.response.data.message,
        };
      }
    }

    // Fallback
    const newT: PortalSupportTicket = {
      ticketId: Date.now(),
      userId: user.userId,
      customerName: user.fullName || 'Khách hàng',
      customerEmail: user.email,
      customerPhone: user.phone || '0912345678',
      phone: user.phone || '0912345678',
      category: payload.subject,
      content: payload.description,
      subject: payload.subject,
      description: payload.description,
      priority: payload.priority || 'MEDIUM',
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };
    sharedStore.addTicket(newT);
    return {
      success: true,
      message: 'Gửi phiếu hỗ trợ thành công (đã lưu cục bộ)',
      ticket: newT,
    };
  },

  /**
   * Lấy danh sách phiếu hỗ trợ theo ID khách hàng (userId) từ Database Backend
   */
  async getUserTickets(userIdOrUser?: any): Promise<{ success: boolean; tickets: PortalSupportTicket[] }> {
    let customerId: number | undefined;
    if (typeof userIdOrUser === 'number') {
      customerId = userIdOrUser;
    } else if (userIdOrUser && typeof userIdOrUser.userId === 'number') {
      customerId = userIdOrUser.userId;
    } else {
      const stored = getStoredUser();
      customerId = stored?.userId;
    }

    if (!customerId) {
      return { success: true, tickets: [] };
    }

    // 1. Gọi trực tiếp API Backend GET /api/v1/support-tickets để lấy dữ liệu từ DB
    try {
      const res = await apiClient.get<{
        success: boolean;
        message: string;
        data: any[];
      }>('/support-tickets', {
        params: { userId: customerId }
      });

      if (res.data && Array.isArray(res.data.data)) {
        const remoteTickets: PortalSupportTicket[] = res.data.data.map((d: any) => ({
          ticketId: d.ticketId,
          userId: d.userId || customerId,
          customerName: d.customerName || 'Khách hàng',
          customerEmail: d.customerEmail,
          customerPhone: d.customerPhone,
          phone: d.customerPhone || '0912345678',
          category: d.subject || 'Hỗ trợ kỹ thuật',
          content: d.description || '',
          subject: d.subject || '',
          description: d.description || '',
          priority: d.priority || 'MEDIUM',
          status: d.status || 'OPEN',
          handledById: d.handledById,
          handledByName: d.handledByName,
          handledBy: d.handledByName,
          resolutionNote: d.resolutionNote,
          reply: d.resolutionNote,
          resolvedAt: d.resolvedAt,
          createdAt: d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt,
        }));

        // Đồng bộ lưu vào sharedStore âm thầm
        sharedStore.syncTicketsFromBackend(remoteTickets);

        // Lọc chính xác theo ID khách hàng
        const userTickets = remoteTickets.filter(t => Number(t.userId) === Number(customerId));
        return { success: true, tickets: userTickets };
      }
    } catch (err) {
      console.warn('[ticketService.getUserTickets] API /support-tickets error, falling back to local store', err);
    }

    // 2. Fallback nếu API lỗi hoặc offline
    const all = sharedStore.getTickets();
    const userTickets = all.filter(t => Number(t.userId) === Number(customerId));

    return { success: true, tickets: userTickets };
  },

  /**
   * API 12.5: GET /api/v1/admin/support-tickets
   * Quản lý phiếu hỗ trợ & thống kê trạng thái (Portal - STAFF / ADMIN)
   */
  async getAdminTickets(query: AdminTicketsQuery = {}): Promise<AdminTicketsResponse> {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: {
          items: any[];
          pageInfo: ReviewPageInfo;
          statusCounts: {
            OPEN: number;
            IN_PROGRESS: number;
            RESOLVED: number;
            CLOSED: number;
          };
        };
      }>('/admin/support-tickets', { params: query });

      if (res.data?.data) {
        const d = res.data.data;
        const mappedItems: PortalSupportTicket[] = (d.items || []).map((it) => ({
          ticketId: it.ticketId,
          userId: it.userId,
          customerName: it.customerName,
          customerEmail: it.customerEmail,
          customerPhone: it.customerPhone,
          phone: it.customerPhone || '0912345678',
          category: it.subject || it.category,
          content: it.description || it.content,
          subject: it.subject,
          description: it.description,
          priority: it.priority,
          status: it.status,
          handledById: it.handledById,
          handledByName: it.handledByName,
          handledBy: it.handledByName,
          resolutionNote: it.resolutionNote,
          reply: it.resolutionNote,
          createdAt: it.createdAt,
          updatedAt: it.updatedAt,
        }));

        return {
          items: mappedItems,
          pageInfo: d.pageInfo,
          statusCounts: d.statusCounts || {
            OPEN: 0,
            IN_PROGRESS: 0,
            RESOLVED: 0,
            CLOSED: 0,
          },
        };
      }
    } catch (err) {
      console.warn('[ticketService.getAdminTickets] Fallback to sharedStore', err);
    }

    // Fallback sang sharedStore
    const all = sharedStore.getTickets();
    const openCount = all.filter((t) => t.status === 'WAITING' || (t.status as string) === 'OPEN').length;
    const resolvedCount = all.filter((t) => t.status === 'RESOLVED').length;
    const rejectedCount = all.filter((t) => t.status === 'REJECTED' || (t.status as string) === 'CLOSED').length;

    return {
      items: all,
      pageInfo: {
        page: 1,
        size: all.length,
        totalPages: 1,
        totalElements: all.length,
        hasNext: false,
      },
      statusCounts: {
        OPEN: openCount,
        IN_PROGRESS: 0,
        RESOLVED: resolvedCount,
        CLOSED: rejectedCount,
      },
    };
  },

  /**
   * API 12.5 Phụ: PUT /api/v1/admin/support-tickets/{id}
   * Tiếp nhận, xử lý & đóng phiếu hỗ trợ (Portal - STAFF / ADMIN)
   */
  async updateAdminTicket(
    id: number,
    payload: UpdateAdminTicketPayload
  ): Promise<{ success: boolean; message: string; ticket?: PortalSupportTicket }> {
    try {
      const res = await apiClient.put<{
        success: boolean;
        message: string;
        data: any;
      }>(`/admin/support-tickets/${id}`, payload);

      if (res.data?.data) {
        const d = res.data.data;
        const mappedTicket: PortalSupportTicket = {
          ticketId: d.ticketId,
          userId: d.userId,
          customerName: d.customerName,
          customerEmail: d.customerEmail,
          customerPhone: d.customerPhone,
          phone: d.customerPhone || '0912345678',
          category: d.subject || d.category,
          content: d.description || d.content,
          subject: d.subject,
          description: d.description,
          priority: d.priority,
          status: d.status,
          handledById: d.handledById,
          handledByName: d.handledByName,
          handledBy: d.handledByName,
          resolutionNote: d.resolutionNote,
          reply: d.resolutionNote,
          resolvedAt: d.resolvedAt,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        };
        sharedStore.updateTicket(d.ticketId, mappedTicket);
        return {
          success: true,
          message: res.data.message || 'Cập nhật phiếu hỗ trợ thành công',
          ticket: mappedTicket,
        };
      }
    } catch (err: any) {
      console.warn('[ticketService.updateAdminTicket] Fallback to sharedStore', err);
      if (err.response?.data?.message) {
        return {
          success: false,
          message: err.response.data.message,
        };
      }
    }

    // Fallback: update local
    sharedStore.updateTicket(id, {
      status: (payload.status === 'RESOLVED' ? 'RESOLVED' : 'REJECTED') as any,
      reply: payload.resolutionNote,
      resolutionNote: payload.resolutionNote,
      handledBy: 'Trần Thị CSKH (STAFF)',
      handledByName: 'Trần Thị CSKH (STAFF)',
      handledAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString()
    });
    const tickets = sharedStore.getTickets();
    const t = tickets.find((item) => item.ticketId === id);
    return {
      success: true,
      message: 'Cập nhật phiếu hỗ trợ thành công (lưu cục bộ)',
      ticket: t,
    };
  },
};

// ================= FAQ SERVICE =================
export const faqService = {
  /**
   * API 12.6: GET /api/v1/faqs
   * Xem danh sách FAQ nhóm theo chuyên mục (Client - Public)
   */
  async getFaqs(category?: string): Promise<FaqGroupItem[]> {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: Array<{
          category: string;
          items: Array<{
            faqId: number;
            question: string;
            answer: string;
            category: string;
            displayOrder: number;
            isActive: boolean;
            createdAt: string;
          }>;
        }>;
      }>('/faqs', { params: category ? { category } : {} });

      if (res.data?.data && Array.isArray(res.data.data)) {
        return res.data.data.map((group) => ({
          category: group.category,
          items: (group.items || []).map((it) => ({
            faqId: it.faqId,
            topic: it.category,
            category: it.category,
            question: it.question,
            answer: it.answer,
            isVisible: it.isActive,
            isActive: it.isActive,
            sortOrder: it.displayOrder,
            displayOrder: it.displayOrder,
            createdAt: it.createdAt,
          })),
        }));
      }
    } catch (err) {
      console.warn('[faqService.getFaqs] Fallback to sharedStore', err);
    }

    // Fallback: nhóm từ sharedStore
    const localFaqs = sharedStore.getFaqs();
    const groupMap: Record<string, PortalFaqItem[]> = {};

    localFaqs.forEach((f) => {
      const cat = f.category || f.topic || 'Chung';
      if (!groupMap[cat]) groupMap[cat] = [];
      groupMap[cat].push({
        ...f,
        category: cat,
        isActive: f.isVisible,
        displayOrder: f.sortOrder,
      });
    });

    return Object.keys(groupMap).map((cat) => ({
      category: cat,
      items: groupMap[cat],
    }));
  },

  /**
   * API 12.7: POST /api/v1/admin/faqs
   * Thêm câu hỏi FAQ mới (Portal - ADMIN)
   */
  async createAdminFaq(payload: CreateFaqPayload): Promise<{
    success: boolean;
    message: string;
    faq?: PortalFaqItem;
  }> {
    try {
      const res = await apiClient.post<{
        success: boolean;
        message: string;
        data: any;
      }>('/admin/faqs', {
        question: payload.question,
        answer: payload.answer,
        category: payload.category,
        displayOrder: payload.displayOrder ?? 1,
        isActive: payload.isActive ?? true,
      });

      if (res.data?.data) {
        const d = res.data.data;
        const mappedFaq: PortalFaqItem = {
          faqId: d.faqId,
          topic: d.category,
          category: d.category,
          question: d.question,
          answer: d.answer,
          isVisible: d.isActive,
          isActive: d.isActive,
          sortOrder: d.displayOrder,
          displayOrder: d.displayOrder,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        };
        // Đồng bộ sharedStore
        sharedStore.addFaq({
          topic: mappedFaq.topic,
          question: mappedFaq.question,
          answer: mappedFaq.answer,
          isVisible: mappedFaq.isVisible,
          sortOrder: mappedFaq.sortOrder,
        });
        return {
          success: true,
          message: res.data.message || 'Thêm FAQ thành công',
          faq: mappedFaq,
        };
      }
    } catch (err: any) {
      console.warn('[faqService.createAdminFaq] Fallback to sharedStore', err);
      if (err.response?.data?.message) {
        return {
          success: false,
          message: err.response.data.message,
        };
      }
    }

    // Fallback: Lưu vào sharedStore
    const localFaq = sharedStore.addFaq({
      topic: payload.category,
      question: payload.question,
      answer: payload.answer,
      isVisible: payload.isActive ?? true,
      sortOrder: payload.displayOrder ?? 1,
    });
    return {
      success: true,
      message: 'Thêm FAQ thành công (lưu cục bộ)',
      faq: localFaq,
    };
  },
};
