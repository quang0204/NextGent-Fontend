export interface UserAddress {
  addressId: number;
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
  isDefault: boolean;
}

export interface UserProfile {
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  status?: 'ACTIVE' | 'LOCKED';
  lockReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  addresses: UserAddress[];
  defaultAddress?: UserAddress;
}

// ----------------------------------------------------------------------------
// API DTOs: PHẦN 1: API NGƯỜI DÙNG CÁ NHÂN (/api/v1/users)
// ----------------------------------------------------------------------------
export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  email?: string;
}

export interface UpdateProfileOtpData {
  otpSessionToken: string;
  targetEmailMasked: string;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
}

export interface UpdateProfileConfirmRequest {
  otpSessionToken: string;
  otpCode: string;
}

export interface AddressRequest {
  recipientName: string;
  phone: string;
  addressLine: string;
  isDefault?: boolean;
  province?: string;
  district?: string;
  ward?: string;
}

// ----------------------------------------------------------------------------
// API DTOs: PHẦN 2: API QUẢN TRỊ NGƯỜI DÙNG DÀNH CHO ADMIN (/api/v1/admin/users)
// ----------------------------------------------------------------------------
export interface AdminUserItem {
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  status: 'ACTIVE' | 'LOCKED';
  lockReason?: string | null;
  totalOrders: number;
  totalSpent?: number;
  createdAt: string;
}

export interface UserSummary {
  totalUsers: number;
  adminCount: number;
  staffCount: number;
  customerCount: number;
  lockedCount: number;
}

export interface AdminUsersPageData {
  currentPage?: number;
  pageSize?: number;
  totalPages: number;
  totalElements: number;
  items?: AdminUserItem[];
  content?: AdminUserItem[];
  page?: number;
  size?: number;
  hasNext?: boolean;
  summary?: UserSummary;
  totalUsers?: number;
  adminCount?: number;
  staffCount?: number;
  customerCount?: number;
  lockedCount?: number;
}

export interface AdminUserDetail {
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  status: 'ACTIVE' | 'LOCKED';
  lockReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  profile?: UserProfile;
  addresses: UserAddress[];
  shoppingSummary?: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    lifetimeValue: number;
  };
  recentOrders?: Array<{
    orderId: number;
    orderCode: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
  auditLogs?: Array<{
    logId: number;
    action: string;
    entityName: string;
    oldValue: string;
    newValue: string;
    createdAt: string;
  }>;
}

export interface CreateInternalUserRequest {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: 'STAFF' | 'ADMIN';
}

export interface UpdateUserStatusRequest {
  status: 'ACTIVE' | 'LOCKED';
  lockReason?: string;
}

export interface UpdateUserRoleRequest {
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  reason?: string;
}

/**
 * Tự động phân tích chuỗi địa chỉ đầy đủ thành 4 phần riêng biệt:
 * detail (số nhà/đường), ward (phường/xã), district (quận/huyện), province (tỉnh/thành phố)
 */
export function parseAddressComponents(
  fullAddress: string = '',
  rawProvince?: string,
  rawDistrict?: string,
  rawWard?: string
): {
  detail: string;
  ward: string;
  district: string;
  province: string;
} {
  const p = rawProvince?.trim() || '';
  const d = rawDistrict?.trim() || '';
  const w = rawWard?.trim() || '';
  const str = (fullAddress || '').trim();

  // 1. Tách chuỗi theo dấu phẩy nếu chuỗi chứa đầy đủ các cấp
  const parts = str.split(',').map((s) => s.trim()).filter(Boolean);

  if (parts.length >= 4) {
    const province = p || parts[parts.length - 1];
    const district = d || parts[parts.length - 2];
    const ward = w || parts[parts.length - 3];
    const detail = parts.slice(0, parts.length - 3).join(', ');
    return {
      detail: detail || parts[0],
      ward: ward || 'Phường Dịch Vọng Hậu',
      district: district || 'Quận Cầu Giấy',
      province: province || 'Hà Nội',
    };
  }

  // 2. Nếu đã có sẵn 3 trường hành chính hợp lệ và chuỗi ngắn (VD: "số nhà 6")
  if (p && d && w) {
    return {
      detail: str || 'Số 88 đường Nguyễn Văn Linh',
      ward: w,
      district: d,
      province: p,
    };
  }

  if (parts.length === 3) {
    return {
      detail: parts[0],
      ward: w || 'Phường Dịch Vọng Hậu',
      district: d || parts[1],
      province: p || parts[2] || 'Hà Nội',
    };
  }

  if (parts.length === 2) {
    return {
      detail: parts[0],
      ward: w || 'Phường Dịch Vọng Hậu',
      district: d || parts[1],
      province: p || 'Hà Nội',
    };
  }

  // Nếu chỉ có 1 chuỗi đơn (VD: "số nhà 6") và chưa có đủ 3 trường hành chính
  return {
    detail: str || 'Số 88 đường Nguyễn Văn Linh',
    ward: w || 'Phường Dịch Vọng Hậu',
    district: d || 'Quận Cầu Giấy',
    province: p || 'Hà Nội',
  };
}

/**
 * Ghép các phần địa chỉ thành chuỗi đầy đủ và chuẩn hóa không bị dấu phẩy thừa
 */
export function formatFullAddress(
  detail: string = '',
  ward?: string,
  district?: string,
  province?: string
): string {
  const parts = [detail?.trim(), ward?.trim(), district?.trim(), province?.trim()]
    .filter(Boolean) as string[];

  const unique: string[] = [];
  parts.forEach((part) => {
    if (part && !unique.includes(part)) {
      unique.push(part);
    }
  });

  return unique.join(', ');
}

