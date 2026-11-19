/**
 * Reusable validation utilities across storefront & portal forms
 */

export const VIETNAMESE_PHONE_REGEX = /^(0[3|5|7|8|9])+([0-9]{8})$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidVietnamesePhone = (phone?: string): boolean => {
  if (!phone) return false;
  return VIETNAMESE_PHONE_REGEX.test(phone.trim());
};

export const isValidEmail = (email?: string): boolean => {
  if (!email) return false;
  return EMAIL_REGEX.test(email.trim());
};
