import { apiClient } from './apiClient';
import { sharedStore } from './sharedStore';
import { PortalAuditLog } from '../types/portal';

export interface AdminAuditLogsQuery {
  page?: number;
  size?: number;
  userId?: number;
  action?: string;
  entityName?: string;
  fromDate?: string;
  toDate?: string;
}

export interface AdminAuditLogsResponse {
  items: PortalAuditLog[];
  pageInfo: {
    page: number;
    size: number;
    totalPages: number;
    totalElements: number;
    hasNext: boolean;
  };
}

export const auditService = {
  /**
   * API 13.5: GET /api/v1/admin/audit-logs
   * Tra cứu nhật ký kiểm toán hệ thống (Portal - ADMIN)
   */
  async getAdminAuditLogs(query: AdminAuditLogsQuery = {}): Promise<AdminAuditLogsResponse> {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: {
          items: any[];
          pageInfo: any;
        };
      }>('/admin/audit-logs', { params: query });

      if (res.data?.data) {
        const d = res.data.data;
        const mappedItems: PortalAuditLog[] = (d.items || []).map((it) => ({
          logId: it.logId,
          createdAt: it.createdAt,
          performedBy: it.userName || it.performedBy || 'Admin',
          action: it.action,
          entityName: it.entityName,
          entityId: String(it.entityId),
          oldValue: it.oldValue || '—',
          newValue: it.newValue || '—',
        }));

        return {
          items: mappedItems,
          pageInfo: d.pageInfo,
        };
      }
    } catch (err) {
      console.warn('[auditService.getAdminAuditLogs] Fallback to sharedStore', err);
    }

    // Fallback: sharedStore
    const all = sharedStore.getAuditLogs();
    let filtered = [...all];
    if (query.action && query.action !== 'ALL') {
      filtered = filtered.filter(
        (l) => l.action === query.action || l.action.startsWith(query.action!)
      );
    }
    const page = query.page || 1;
    const size = query.size || 20;
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
};
