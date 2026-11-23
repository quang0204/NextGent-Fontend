import { apiClient } from './apiClient';
import { sharedStore } from './sharedStore';

export interface TopSellingItemResponse {
  rank: number;
  productId: number;
  variantId?: number;
  sku: string;
  productName: string;
  color?: string;
  rom?: string;
  imageUrl?: string;
  unitPrice: number;
  unitsSold: number;
  totalRevenue: number;
  revenueShare: number;
  onHandQty: number;
  availableQty: number;
  orderCount: number;
}

export interface SlowMovingItemResponse {
  productId: number;
  variantId?: number;
  sku: string;
  productName: string;
  color?: string;
  rom?: string;
  imageUrl?: string;
  onHandQty: number;
  availableQty: number;
  unitPrice: number;
  unitsSold: number;
  tiedCapital: number;
  daysInStock: number;
  severity: 'CRITICAL' | 'WARNING' | 'ATTENTION';
  recommendedPolicy: string;
  suggestedDiscountPercent: number;
}

export interface SlowMovingReportResponse {
  items: SlowMovingItemResponse[];
  totalSlowCapital: number;
  totalSlowStock: number;
  criticalCount: number;
  warningCount: number;
  attentionCount: number;
  analyzedAt: string;
}

export interface RevenueTimelinePoint {
  label: string;
  date?: string;
  dateKey?: string;
  revenue: number;
  orderCount: number;
}

export interface RevenueCategoryBreakdown {
  categoryId: number;
  categoryName: string;
  revenue: number;
  unitsSold: number;
  percentage: number;
}

export interface RevenueBrandBreakdown {
  brandId: number;
  brandName: string;
  revenue: number;
  unitsSold: number;
  percentage: number;
}

export interface RevenueAnalyticsResponse {
  period: 'DAY' | 'WEEK' | 'MONTH';
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  timeline: RevenueTimelinePoint[];
  byCategory: RevenueCategoryBreakdown[];
  byBrand: RevenueBrandBreakdown[];
}

export const reportService = {
  /**
   * API Báo cáo biểu đồ doanh thu theo Ngày, Tuần, Tháng, Danh mục và Thương hiệu từ CSDL
   */
  async getRevenueAnalytics(period: 'DAY' | 'WEEK' | 'MONTH' = 'DAY'): Promise<RevenueAnalyticsResponse> {
    try {
      const res = await apiClient.get('/admin/reports/revenue-analytics', { params: { period } });
      const body = res.data;
      const data = body?.data || body;
      if (data && (Array.isArray(data.timeline) || Array.isArray(data.byCategory))) {
        const formattedTimeline: RevenueTimelinePoint[] = Array.isArray(data.timeline)
          ? data.timeline.map((t: any) => ({
              label: t.label || t.date || '',
              date: t.date || t.dateKey || '',
              dateKey: t.date || t.dateKey || t.label || '',
              revenue: Number(t.revenue) || 0,
              orderCount: Number(t.orderCount) || 0,
            }))
          : [];

        const formattedCategory: RevenueCategoryBreakdown[] = Array.isArray(data.byCategory)
          ? data.byCategory.map((c: any) => ({
              categoryId: Number(c.categoryId) || 0,
              categoryName: c.categoryName || 'Khác',
              revenue: Number(c.revenue) || 0,
              unitsSold: Number(c.unitsSold) || 0,
              percentage: Number(c.percentage) || 0,
            }))
          : [];

        const formattedBrand: RevenueBrandBreakdown[] = Array.isArray(data.byBrand)
          ? data.byBrand.map((b: any) => ({
              brandId: Number(b.brandId) || 0,
              brandName: b.brandName || 'Khác',
              revenue: Number(b.revenue) || 0,
              unitsSold: Number(b.unitsSold) || 0,
              percentage: Number(b.percentage) || 0,
            }))
          : [];

        return {
          period: (data.period as any) || period,
          totalRevenue: Number(data.totalRevenue) || 0,
          totalOrders: Number(data.totalOrders) || 0,
          averageOrderValue: Number(data.averageOrderValue) || 0,
          timeline: formattedTimeline,
          byCategory: formattedCategory,
          byBrand: formattedBrand,
        };
      }
    } catch {
      // Khi API chưa sẵn sàng hoặc token hết hạn, tính toán thuần từ danh sách đơn hàng thực tế
    }

    // Tính toán từ dữ liệu thực tế trong store: Chỉ lấy đơn hàng ở trạng thái đã thành công (COMPLETED)
    const orders = sharedStore.getOrders().filter(o => o.status === 'COMPLETED');
    const products = sharedStore.getProducts();
    const productMap = new Map(products.map(p => [p.productId, p]));

    let totalRevenue = 0;
    const timelineMap = new Map<string, { label: string; dateKey: string; revenue: number; orderCount: number }>();
    const categoryMap = new Map<string, { categoryId: number; categoryName: string; revenue: number; unitsSold: number }>();
    const brandMap = new Map<string, { brandId: number; brandName: string; revenue: number; unitsSold: number }>();

    // Chuẩn bị các mốc thời gian hiển thị
    const now = new Date();
    if (period === 'DAY') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const dayStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        timelineMap.set(dayStr, { label: dayStr, dateKey: dayStr, revenue: 0, orderCount: 0 });
      }
    } else if (period === 'WEEK') {
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 7 * 86400000);
        const wLabel = `Tuần ${Math.ceil(d.getDate() / 7)} (${String(d.getMonth() + 1).padStart(2, '0')})`;
        timelineMap.set(wLabel, { label: wLabel, dateKey: wLabel, revenue: 0, orderCount: 0 });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mLabel = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
        timelineMap.set(mLabel, { label: mLabel, dateKey: mLabel, revenue: 0, orderCount: 0 });
      }
    }

    orders.forEach((o) => {
      // Doanh thu thực thu sau khi trừ giảm giá / voucher (finalAmount)
      const orderAmount = Number((o as any).finalAmount ?? o.totalAmount) || 0;
      totalRevenue += orderAmount;

      // Group timeline theo ngày tháng thực tế của đơn
      let key = '';
      if (period === 'DAY') {
        const d = o.createdAt ? new Date(o.createdAt) : now;
        key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else if (period === 'WEEK') {
        const d = o.createdAt ? new Date(o.createdAt) : now;
        key = `Tuần ${Math.ceil(d.getDate() / 7)} (${String(d.getMonth() + 1).padStart(2, '0')})`;
      } else {
        const d = o.createdAt ? new Date(o.createdAt) : now;
        key = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
      }

      if (!timelineMap.has(key)) {
        timelineMap.set(key, { label: key, dateKey: key, revenue: 0, orderCount: 0 });
      }
      const tPoint = timelineMap.get(key)!;
      tPoint.revenue += orderAmount;
      tPoint.orderCount += 1;

      // Nhóm theo Category và Brand từ sản phẩm thực
      (o.items || []).forEach(item => {
        const lineRev = Number(item.lineTotal ?? ((item.unitPrice || 0) * (item.quantity || 1)));
        const qty = item.quantity || 1;
        const prod = productMap.get(item.productId);

        const catName = prod?.rootCategoryName || prod?.categoryName || 'Thiết bị';
        const catId = prod?.rootCategoryId || prod?.categoryId || 1;
        if (!categoryMap.has(catName)) {
          categoryMap.set(catName, { categoryId: catId, categoryName: catName, revenue: 0, unitsSold: 0 });
        }
        const cVal = categoryMap.get(catName)!;
        cVal.revenue += lineRev;
        cVal.unitsSold += qty;

        const bName = prod?.brandName || 'Khác';
        const bId = prod?.brandId || 1;
        if (!brandMap.has(bName)) {
          brandMap.set(bName, { brandId: bId, brandName: bName, revenue: 0, unitsSold: 0 });
        }
        const bVal = brandMap.get(bName)!;
        bVal.revenue += lineRev;
        bVal.unitsSold += qty;
      });
    });

    const catTotal = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.revenue, 0) || (totalRevenue > 0 ? totalRevenue : 1);
    const byCategory: RevenueCategoryBreakdown[] = Array.from(categoryMap.values())
      .map(c => ({
        ...c,
        percentage: Number(((c.revenue / catTotal) * 100).toFixed(1))
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const brandTotal = Array.from(brandMap.values()).reduce((sum, b) => sum + b.revenue, 0) || (totalRevenue > 0 ? totalRevenue : 1);
    const byBrand: RevenueBrandBreakdown[] = Array.from(brandMap.values())
      .map(b => ({
        ...b,
        percentage: Number(((b.revenue / brandTotal) * 100).toFixed(1))
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      period,
      totalRevenue,
      totalOrders: orders.length,
      averageOrderValue: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
      timeline: Array.from(timelineMap.values()),
      byCategory,
      byBrand
    };
  },

  /**
   * API Báo cáo Top 10 sản phẩm/biến thể bán chạy nhất & doanh thu cao nhất
   */
  async getTopSelling(params?: {
    metric?: 'REVENUE' | 'UNITS';
    scope?: 'VARIANT' | 'PRODUCT';
    limit?: number;
    timeRange?: 'ALL' | 'MONTH' | '7DAYS';
  }): Promise<TopSellingItemResponse[]> {
    const res = await apiClient.get('/admin/reports/top-selling', { params });
    const body = res.data;
    return body?.data || body || [];
  },

  /**
   * API Báo cáo hàng bán chậm, tồn kho lâu ngày để có chính sách xả hàng
   */
  async getSlowMoving(params?: {
    minDays?: number;
    maxUnitsSold?: number;
    keyword?: string;
    severity?: string;
    sortBy?: 'CAPITAL' | 'STOCK' | 'AGE';
  }): Promise<SlowMovingReportResponse> {
    const res = await apiClient.get('/admin/reports/slow-moving', { params });
    const body = res.data;
    return body?.data || body || {
      items: [],
      totalSlowCapital: 0,
      totalSlowStock: 0,
      criticalCount: 0,
      warningCount: 0,
      attentionCount: 0,
      analyzedAt: new Date().toISOString()
    };
  }
};
