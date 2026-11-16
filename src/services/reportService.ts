import { apiClient } from './apiClient';

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

export const reportService = {
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
