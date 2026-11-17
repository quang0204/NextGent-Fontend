import { UserProfile, UserAddress } from './user';

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode?: number;
  message?: string;
  data?: T;
  reason?: string; // Ví dụ khi tài khoản bị khóa (403 lock_reason)
}

// 1. POST /api/v1/auth/login-initiate
export interface LoginInitiateRequest {
  identity: string; // Số điện thoại (VD: 0987654321) hoặc Email (VD: thuhuyen.tran@gmail.com)
  password: string;
}

export interface LoginInitiateData {
  user: AuthUserDTO;
  tokenType?: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// 2. POST /api/v1/auth/login-verify-otp
export interface LoginVerifyOtpRequest {
  sessionToken: string;
  otpCode: string; // 6 số OTP
}

export interface AuthUserDTO {
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  status?: 'ACTIVE' | 'LOCKED';
}

export interface LoginVerifyOtpData {
  user: AuthUserDTO;
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// 3. POST /api/v1/auth/login-resend-otp
export interface LoginResendOtpRequest {
  sessionToken: string;
}

export interface LoginResendOtpData {
  cooldownSeconds: number;
  expiresInSeconds: number;
}

// 4. POST /api/v1/auth/register-initiate
export interface RegisterInitiateRequest {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterInitiateData {
  channel: 'EMAIL';
  targetEmail: string;
  registrationToken: string;
  expiresInSeconds: number;
  cooldownSeconds: number;
}

// 5. POST /api/v1/auth/register-verify-otp
export interface RegisterVerifyOtpRequest {
  registrationToken: string;
  otpCode: string;
}

export interface RegisterVerifyOtpData {
  user: AuthUserDTO;
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// 6. POST /api/v1/auth/register-resend-otp
export interface RegisterResendOtpRequest {
  registrationToken: string;
}

export interface RegisterResendOtpData {
  cooldownSeconds: number;
  expiresInSeconds: number;
}

// 7. POST /api/v1/auth/forgot-password
export interface ForgotPasswordRequest {
  identity: string;
}

export interface ForgotPasswordData {
  resetToken: string;
  channel: 'PHONE' | 'EMAIL';
  targetMasked: string;
  expiresInSeconds: number;
  cooldownSeconds: number;
}

// 8. POST /api/v1/auth/reset-password
export interface ResetPasswordRequest {
  resetToken: string;
  otpCode: string;
  newPassword: string;
  confirmNewPassword: string;
}

// 9. POST /api/v1/auth/forgot-resend-otp
export interface ForgotResendOtpRequest {
  resetToken: string;
}

export interface ForgotResendOtpData {
  cooldownSeconds: number;
  expiresInSeconds?: number;
}

// 10. POST /api/v1/auth/refresh-token
export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenData {
  tokenType: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

// 11. POST /api/v1/auth/logout -> ApiResponse
// 12. GET /api/v1/auth/me
export interface GetMeData {
  userId: number;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  fullName: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'LOCKED';
  defaultAddress?: {
    addressId: number;
    recipientName: string;
    phone: string;
    addressLine: string;
    province?: string;
    district?: string;
    ward?: string;
    isDefault: boolean;
  };
}

// 13. PUT /api/v1/auth/change-password
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}
