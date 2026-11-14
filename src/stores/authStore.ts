import { create } from 'zustand';
import { UserProfile, UserAddress, parseAddressComponents } from '../types/user';
import {
  LoginInitiateData,
  LoginVerifyOtpData,
  LoginResendOtpData,
  RegisterInitiateRequest,
  RegisterInitiateData,
  RegisterVerifyOtpData,
  RegisterResendOtpData,
  ForgotPasswordData,
  ResetPasswordRequest,
  ForgotResendOtpData,
} from '../types/auth';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { useCartStore } from './cartStore';
import { useWishlistStore } from './wishlistStore';
import { sharedStore } from '../services/sharedStore';

export interface RegisterPayload {
  fullName: string;
  phone: string;
  email: string;
  password?: string;
  province?: string;
  district?: string;
  ward?: string;
  addressLine?: string;
}

interface AuthStore {
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // 12 Full Auth APIs Actions
  initiateLogin: (identity: string, password: string) => Promise<LoginInitiateData>;
  verifyLoginOtp: (sessionToken: string, otpCode: string) => Promise<LoginVerifyOtpData>;
  resendLoginOtp: (sessionToken: string) => Promise<LoginResendOtpData>;

  initiateRegister: (data: RegisterInitiateRequest) => Promise<RegisterInitiateData>;
  verifyRegisterOtp: (registrationToken: string, otpCode: string) => Promise<RegisterVerifyOtpData>;
  resendRegisterOtp: (registrationToken: string) => Promise<RegisterResendOtpData>;

  forgotPassword: (identity: string) => Promise<ForgotPasswordData>;
  resetPassword: (payload: ResetPasswordRequest) => Promise<{ success?: boolean; message?: string }>;
  resendForgotOtp: (resetToken: string) => Promise<ForgotResendOtpData>;

  logout: () => Promise<void>;
  fetchMe: () => Promise<UserProfile | null>;
  fetchProfile: () => Promise<UserProfile | null>;
  fetchAddresses: () => Promise<UserAddress[]>;

  // Legacy & Storefront Helper Actions
  switchRole: (role: 'CUSTOMER' | 'STAFF' | 'ADMIN') => void;
  updateProfile: (fullName: string, email: string, phone?: string) => void;
  addAddress: (address: Omit<UserAddress, 'addressId'>) => void;
  updateAddress: (addressId: number, address: Partial<UserAddress>) => void;
  setDefaultAddress: (addressId: number) => void;
  deleteAddress: (addressId: number) => void;
  changePassword: (currentPass: string, newPass: string, confirmNewPass?: string) => Promise<{ success: boolean; message: string }>;
}

const STORAGE_USER_KEY = 'nextpick_user_v2';
const STORAGE_ACCESS_TOKEN_KEY = 'access_token';
const STORAGE_REFRESH_TOKEN_KEY = 'refresh_token';

export const SAMPLE_USERS: Record<'CUSTOMER' | 'STAFF' | 'ADMIN', UserProfile> = {
  CUSTOMER: {
    userId: 5,
    fullName: 'Hoàng Minh Khôi',
    email: 'khoi.hoang@gmail.com',
    phone: '0971234567',
    role: 'CUSTOMER',
    status: 'ACTIVE',
    createdAt: '2026-01-15T08:30:00Z',
    addresses: [
      {
        addressId: 3,
        recipientName: 'Hoàng Minh Khôi',
        phone: '0971234567',
        province: 'Đà Nẵng',
        district: 'Hải Châu',
        ward: 'Phường Nam Dương',
        addressLine: 'Số 88 đường Nguyễn Văn Linh, Phường Nam Dương, Hải Châu, Đà Nẵng',
        isDefault: true,
      },
    ],
  },
  STAFF: {
    userId: 102,
    fullName: 'Thắng Staff',
    email: 'staff.thang@nextgen.vn',
    phone: '0912345678',
    role: 'STAFF',
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:00:00Z',
    addresses: [
      {
        addressId: 2,
        recipientName: 'Thắng Staff (Kho Vận)',
        phone: '0912345678',
        province: 'Hà Nội',
        district: 'Quận Cầu Giấy',
        ward: 'Phường Dịch Vọng Hậu',
        addressLine: 'Kho hàng NextGen Smart Tech, Lô B11, Phố Duy Tân',
        isDefault: true,
      },
    ],
  },
  ADMIN: {
    userId: 1,
    fullName: 'Trịnh Văn Quang (Admin)',
    email: 'trinhvanquang02042004@gmail.com',
    phone: '0977889900',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    addresses: [
      {
        addressId: 1,
        recipientName: 'Trịnh Văn Quang (Trụ sở)',
        phone: '0977889900',
        province: 'Hà Nội',
        district: 'Quận Hai Bà Trưng',
        ward: 'Phường Bách Khoa',
        addressLine: 'Trụ sở NextGen Smart Tech, Tầng 8, Tháp A',
        isDefault: true,
      },
    ],
  },
};

const getStoredUser = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthStore>((set, get) => {
  // Lắng nghe phiên làm việc hết hạn từ interceptor
  if (typeof window !== 'undefined') {
    window.addEventListener('auth:session-expired', () => {
      localStorage.removeItem(STORAGE_USER_KEY);
      localStorage.removeItem(STORAGE_ACCESS_TOKEN_KEY);
      localStorage.removeItem(STORAGE_REFRESH_TOKEN_KEY);
      set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      useCartStore.getState().switchUser(null);
      useWishlistStore.getState().switchUser(null);
    });
  }

  const initialUser = getStoredUser();
  const initialToken = localStorage.getItem(STORAGE_ACCESS_TOKEN_KEY);
  const initialRefreshToken = localStorage.getItem(STORAGE_REFRESH_TOKEN_KEY);

  return {
    user: initialUser,
    token: initialToken,
    refreshToken: initialRefreshToken,
    isAuthenticated: !!(initialToken && initialUser),
    isLoading: false,
    error: null,

    // API 1: Đăng nhập trực tiếp (Tài khoản + Mật khẩu)
    initiateLogin: async (identity: string, password: string) => {
      set({ isLoading: true, error: null });
      try {
        const res = await authService.loginInitiate({ identity, password });
        set({ isLoading: false });
        if (!res.data) throw new Error(res.message || 'Lỗi gửi yêu cầu đăng nhập');

        const { user: userDto, accessToken, refreshToken: newRefreshToken } = res.data;
        const profile: UserProfile = {
          userId: userDto.userId,
          fullName: userDto.fullName,
          email: userDto.email,
          phone: userDto.phone,
          role: userDto.role,
          status: userDto.status,
          addresses: [],
        };

        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(profile));
        localStorage.setItem(STORAGE_ACCESS_TOKEN_KEY, accessToken);
        if (newRefreshToken) {
          localStorage.setItem(STORAGE_REFRESH_TOKEN_KEY, newRefreshToken);
        }

        set({
          user: profile,
          token: accessToken,
          refreshToken: newRefreshToken || null,
          isAuthenticated: true,
        });

        useCartStore.getState().syncOnLogin(profile.userId);
        useWishlistStore.getState().switchUser(profile.userId);

        return res.data;
      } catch (err: any) {
        set({ isLoading: false, error: err.message || 'Lỗi đăng nhập' });
        throw err;
      }
    },

    // API 2: Xác thực OTP Đăng nhập
    verifyLoginOtp: async (sessionToken: string, otpCode: string) => {
      set({ isLoading: true, error: null });
      try {
        const res = await authService.loginVerifyOtp({ sessionToken, otpCode });
        set({ isLoading: false });
        if (!res.data) throw new Error(res.message || 'Xác thực OTP thất bại');

        const { user: userDto, accessToken, refreshToken: newRefreshToken } = res.data;
        const profile: UserProfile = {
          userId: userDto.userId,
          fullName: userDto.fullName,
          email: userDto.email,
          phone: userDto.phone,
          role: userDto.role,
          status: userDto.status,
          addresses: SAMPLE_USERS[userDto.role]?.addresses || [],
        };

        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(profile));
        localStorage.setItem(STORAGE_ACCESS_TOKEN_KEY, accessToken);
        if (newRefreshToken) {
          localStorage.setItem(STORAGE_REFRESH_TOKEN_KEY, newRefreshToken);
        }

        set({
          user: profile,
          token: accessToken,
          refreshToken: newRefreshToken || null,
          isAuthenticated: true,
        });

        // Bảng 14 Carts: Đồng bộ giỏ hàng vãng lai khi đăng nhập
        useCartStore.getState().syncOnLogin(profile.userId);
        useWishlistStore.getState().switchUser(profile.userId);

        return res.data;
      } catch (err: any) {
        set({ isLoading: false, error: err.message || 'Mã OTP không hợp lệ' });
        throw err;
      }
    },

    // API 3: Gửi lại OTP Đăng nhập
    resendLoginOtp: async (sessionToken: string) => {
      try {
        const res = await authService.loginResendOtp({ sessionToken });
        if (!res.data) throw new Error(res.message || 'Không thể gửi lại mã OTP');
        return res.data;
      } catch (err: any) {
        throw err;
      }
    },

    // API 4: Khởi tạo Đăng ký
    initiateRegister: async (data: RegisterInitiateRequest) => {
      set({ isLoading: true, error: null });
      try {
        const res = await authService.registerInitiate(data);
        set({ isLoading: false });
        if (!res.data) throw new Error(res.message || 'Lỗi gửi yêu cầu đăng ký');
        return res.data;
      } catch (err: any) {
        set({ isLoading: false, error: err.message || 'Lỗi đăng ký' });
        throw err;
      }
    },

    // API 5: Xác thực OTP Đăng ký & Kích hoạt tài khoản
    verifyRegisterOtp: async (registrationToken: string, otpCode: string) => {
      set({ isLoading: true, error: null });
      try {
        const res = await authService.registerVerifyOtp({ registrationToken, otpCode });
        set({ isLoading: false });
        if (!res.data) throw new Error(res.message || 'Xác thực kích hoạt thất bại');

        const { user: userDto, accessToken, refreshToken: newRefreshToken } = res.data;
        const profile: UserProfile = {
          userId: userDto.userId,
          fullName: userDto.fullName,
          phone: userDto.phone,
          email: userDto.email,
          role: userDto.role,
          status: userDto.status,
          addresses: [],
        };

        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(profile));
        localStorage.setItem(STORAGE_ACCESS_TOKEN_KEY, accessToken);
        if (newRefreshToken) {
          localStorage.setItem(STORAGE_REFRESH_TOKEN_KEY, newRefreshToken);
        }

        set({
          user: profile,
          token: accessToken,
          refreshToken: newRefreshToken || null,
          isAuthenticated: true,
        });

        // Bảng 14 Carts: Tự động khởi tạo và đồng bộ giỏ hàng
        useCartStore.getState().syncOnLogin(profile.userId);
        useWishlistStore.getState().switchUser(profile.userId);

        return res.data;
      } catch (err: any) {
        set({ isLoading: false, error: err.message || 'Lỗi kích hoạt tài khoản' });
        throw err;
      }
    },

    // API 6: Gửi lại OTP Đăng ký
    resendRegisterOtp: async (registrationToken: string) => {
      try {
        const res = await authService.registerResendOtp({ registrationToken });
        if (!res.data) throw new Error(res.message || 'Lỗi gửi lại mã xác thực');
        return res.data;
      } catch (err: any) {
        throw err;
      }
    },

    // API 7: Yêu cầu Quên mật khẩu
    forgotPassword: async (identity: string) => {
      set({ isLoading: true, error: null });
      try {
        const res = await authService.forgotPassword({ identity });
        set({ isLoading: false });
        if (!res.data) throw new Error(res.message || 'Không thể tạo yêu cầu quên mật khẩu');
        return res.data;
      } catch (err: any) {
        set({ isLoading: false, error: err.message || 'Lỗi quên mật khẩu' });
        throw err;
      }
    },

    // API 8: Xác thực OTP & Đặt mật khẩu mới
    resetPassword: async (payload: ResetPasswordRequest) => {
      set({ isLoading: true, error: null });
      try {
        const res = await authService.resetPassword(payload);
        set({ isLoading: false });
        return { success: true, message: res.message || 'Đặt lại mật khẩu thành công!' };
      } catch (err: any) {
        set({ isLoading: false, error: err.message || 'Đặt lại mật khẩu thất bại' });
        throw err;
      }
    },

    // API 9: Gửi lại OTP Quên mật khẩu
    resendForgotOtp: async (resetToken: string) => {
      try {
        const res = await authService.forgotResendOtp({ resetToken });
        if (!res.data) throw new Error(res.message || 'Không thể gửi lại mã OTP');
        return res.data;
      } catch (err: any) {
        throw err;
      }
    },

    // API 11: Đăng xuất
    logout: async () => {
      try {
        await authService.logout();
      } catch (e) {
        console.warn('Logout API error:', e);
      } finally {
        localStorage.removeItem(STORAGE_USER_KEY);
        localStorage.removeItem(STORAGE_ACCESS_TOKEN_KEY);
        localStorage.removeItem(STORAGE_REFRESH_TOKEN_KEY);
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
        useCartStore.getState().switchUser(null);
        useWishlistStore.getState().switchUser(null);
      }
    },

    // API 12: GET /api/v1/auth/me (Lấy profile + địa chỉ mặc định)
    fetchMe: async () => {
      const token = localStorage.getItem(STORAGE_ACCESS_TOKEN_KEY);
      if (!token) {
        set({ user: null, isAuthenticated: false });
        return null;
      }
      try {
        const res = await authService.getMe();
        if (res.data) {
          const remoteUser = res.data;
          const current = get().user;
          let defaultAddr: UserAddress | undefined = undefined;
          if (remoteUser.defaultAddress) {
            const comp = parseAddressComponents(
              remoteUser.defaultAddress.addressLine,
              remoteUser.defaultAddress.province,
              remoteUser.defaultAddress.district,
              remoteUser.defaultAddress.ward
            );
            defaultAddr = {
              addressId: remoteUser.defaultAddress.addressId,
              recipientName: remoteUser.defaultAddress.recipientName,
              phone: remoteUser.defaultAddress.phone,
              province: comp.province,
              district: comp.district,
              ward: comp.ward,
              addressLine: comp.detail,
              isDefault: true,
            };
          }

          const addresses: UserAddress[] = defaultAddr
            ? [
                defaultAddr,
                ...(current?.addresses.filter((a) => a.addressId !== defaultAddr.addressId) || []),
              ]
            : current?.addresses || [];

          const updatedUser: UserProfile = {
            userId: remoteUser.userId,
            fullName: remoteUser.fullName,
            email: remoteUser.email,
            phone: remoteUser.phone,
            role: remoteUser.role,
            status: remoteUser.status,
            addresses,
            defaultAddress: defaultAddr,
          };

          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updatedUser));
          set({ user: updatedUser, isAuthenticated: true });
          return updatedUser;
        }
      } catch (e: any) {
        // Nếu lỗi 401 hoặc tài khoản bị khóa
        if (e.statusCode === 401 || e.statusCode === 403) {
          get().logout();
        }
      }
      return get().user;
    },

    // API 2.1: GET /api/v1/users/profile
    fetchProfile: async () => {
      try {
        const res = await userService.getProfile();
        if (res.data) {
          const u = get().user;
          const updatedUser: UserProfile = {
            ...(u || ({} as UserProfile)),
            userId: res.data.userId,
            fullName: res.data.fullName,
            email: res.data.email,
            phone: res.data.phone,
            role: res.data.role,
            status: res.data.status,
            createdAt: res.data.createdAt || u?.createdAt,
            updatedAt: res.data.updatedAt,
            addresses: u?.addresses || [],
            defaultAddress: u?.defaultAddress,
          };
          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updatedUser));
          set({ user: updatedUser });
          return updatedUser;
        }
      } catch (err) {
        console.warn('API getProfile error', err);
      }
      return get().user;
    },

    // API 2.3: GET /api/v1/users/addresses
    fetchAddresses: async () => {
      try {
        const res = await userService.getAddresses();
        if (res.data && Array.isArray(res.data)) {
          const u = get().user;
          if (u) {
            const parsedAddresses: UserAddress[] = res.data.map((a: any) => {
              const comp = parseAddressComponents(a.addressLine, a.province, a.district, a.ward);
              return {
                addressId: a.addressId,
                recipientName: a.recipientName,
                phone: a.phone,
                province: comp.province,
                district: comp.district,
                ward: comp.ward,
                addressLine: comp.detail,
                isDefault: !!a.isDefault,
              };
            });
            const def = parsedAddresses.find((a) => a.isDefault);
            const updated: UserProfile = {
              ...u,
              addresses: parsedAddresses,
              defaultAddress: def,
            };
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updated));
            set({ user: updated });
            return parsedAddresses;
          }
        }
      } catch (err) {
        console.warn('API getAddresses error', err);
      }
      return get().user?.addresses || [];
    },

    // Legacy Helpers cho Storefront & Admin Demo
    switchRole: (role) => {
      const u = SAMPLE_USERS[role];
      const token = `mock_jwt_${role.toLowerCase()}_token`;
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(u));
      localStorage.setItem(STORAGE_ACCESS_TOKEN_KEY, token);
      set({ user: u, token, isAuthenticated: true });
      useCartStore.getState().switchUser(u.userId);
      useWishlistStore.getState().switchUser(u.userId);
    },

    updateProfile: (fullName: string, email: string, phone?: string) => {
      const u = get().user;
      if (u) {
        const updated = { 
          ...u, 
          fullName: fullName.trim(), 
          email: email.trim(),
          phone: phone ? phone.trim() : u.phone 
        };
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updated));
        set({ user: updated });
      }
    },

    addAddress: (addrData) => {
      const u = get().user;
      if (u) {
        const newAddr: UserAddress = {
          ...addrData,
          addressId: Date.now(),
          isDefault: u.addresses.length === 0 ? true : addrData.isDefault,
        };
        let list = [...u.addresses];
        if (newAddr.isDefault) {
          list = list.map((a) => ({ ...a, isDefault: false }));
        }
        list.push(newAddr);
        const updated = { ...u, addresses: list };
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updated));
        set({ user: updated });
      }
    },

    updateAddress: (addressId: number, addrData: Partial<UserAddress>) => {
      const u = get().user;
      if (u) {
        let list = u.addresses.map((a) => {
          if (a.addressId === addressId) {
            return { ...a, ...addrData };
          }
          return a;
        });
        if (addrData.isDefault) {
          list = list.map((a) => ({
            ...a,
            isDefault: a.addressId === addressId,
          }));
        }
        const updated = { ...u, addresses: list };
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updated));
        set({ user: updated });
      }
    },

    setDefaultAddress: (addressId: number) => {
      const u = get().user;
      if (u) {
        const list = u.addresses.map((a) => ({
          ...a,
          isDefault: a.addressId === addressId,
        }));
        const updated = { ...u, addresses: list };
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updated));
        set({ user: updated });
      }
    },

    deleteAddress: (addressId: number) => {
      const u = get().user;
      if (u) {
        const list = u.addresses.filter((a) => a.addressId !== addressId);
        if (list.length > 0 && !list.some((a) => a.isDefault)) {
          list[0].isDefault = true;
        }
        const updated = { ...u, addresses: list };
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updated));
        set({ user: updated });
      }
    },

    // API 13: PUT /api/v1/auth/change-password
    changePassword: async (currentPass: string, newPass: string, confirmNewPass?: string) => {
      const u = get().user;
      if (!u) {
        return { success: false, message: 'Bạn chưa đăng nhập.' };
      }

      try {
        const res = await authService.changePassword({
          currentPassword: currentPass,
          newPassword: newPass,
          confirmNewPassword: confirmNewPass || newPass,
        });

        // Ghi Audit Log vào hệ thống (Bảng 26 Audit_Logs)
        try {
          sharedStore.addAuditLog({
            performedBy: u.fullName,
            action: 'CHANGE_PASSWORD',
            entityName: 'Users',
            entityId: `USER-${u.userId}`,
            oldValue: 'MASKED_PASSWORD',
            newValue: 'MASKED_PASSWORD_UPDATED (Đổi mật khẩu thành công qua API 13)',
          });
        } catch (e) {
          console.warn('Audit log write error', e);
        }

        return {
          success: true,
          message: res.message || 'Đổi mật khẩu thành công. Vui lòng ghi nhớ mật khẩu mới của bạn.',
        };
      } catch (err: any) {
        // Fallback mô phỏng nếu Backend chưa bật
        if (err.statusCode === 500 && (err.message?.includes('Network Error') || err.message?.includes('kết nối'))) {
          if (newPass.trim() === currentPass.trim()) {
            return { success: false, message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.' };
          }
          return { success: true, message: 'Đổi mật khẩu thành công. Vui lòng ghi nhớ mật khẩu mới của bạn.' };
        }
        return {
          success: false,
          message: err.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại.',
        };
      }
    },
  };
});
