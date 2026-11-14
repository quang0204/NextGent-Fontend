import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { OtpInput } from '../components/common/OtpInput';
import { PasswordInput } from '../components/common/PasswordInput';
import { sharedStore } from '../services/sharedStore';
import { userService } from '../services/userService';
import { UserAddress, parseAddressComponents, formatFullAddress } from '../types/user';
import { 
  User, 
  MapPin, 
  Plus, 
  Trash2, 
  CheckCircle, 
  CheckCircle2,
  LogOut, 
  Edit3,
  Phone,
  Mail,
  X,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  RotateCcw,
  Clock,
  Smartphone,
  Loader2,
  Headphones
} from 'lucide-react';
import { SupportHistoryView } from '../components/account/SupportHistoryView';

export const AccountPage: React.FC = () => {
  const { 
    user, 
    updateProfile, 
    addAddress, 
    updateAddress, 
    setDefaultAddress, 
    deleteAddress, 
    logout,
    changePassword,
    fetchProfile,
    fetchAddresses
  } = useAuthStore();
  const { showToast } = useToastStore();
  
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const validTabs = ['profile', 'addresses', 'password', 'support'];
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'password' | 'support'>(
    urlTab && validTabs.includes(urlTab) ? (urlTab as any) : (window.location.pathname === '/support-history' ? 'support' : 'profile')
  );

  const [supportCount, setSupportCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      const all = sharedStore.getTickets();
      if (!user || !user.userId) {
        setSupportCount(0);
        return;
      }
      // Lọc chính xác theo ID khách hàng (userId)
      const myTickets = all.filter(t => Number(t.userId) === Number(user.userId));
      setSupportCount(myTickets.length);
    };

    updateCount();
    const unsub = sharedStore.subscribe(updateCount);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'orders') {
      navigate('/orders', { replace: true });
      return;
    }
    if (window.location.pathname === '/support-history') {
      setActiveTab('support');
      return;
    }
    if (tabParam && validTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams, navigate]);

  const handleSelectTab = (tab: 'profile' | 'addresses' | 'password' | 'support') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Edit profile state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Profile OTP Verification Modal state
  const [showProfileOtpModal, setShowProfileOtpModal] = useState(false);
  const [profileOtp, setProfileOtp] = useState('');
  const [generatedProfileOtp, setGeneratedProfileOtp] = useState('');
  const [profileOtpCountdown, setProfileOtpCountdown] = useState(0);
  const [profileOtpError, setProfileOtpError] = useState('');
  const [otpTargetMasked, setOtpTargetMasked] = useState('');
  const [otpChannel, setOtpChannel] = useState<'PHONE' | 'EMAIL'>('PHONE');
  const [pendingProfileData, setPendingProfileData] = useState<{ fullName: string; email: string; phone: string } | null>(null);
  const [isVerifyingProfileOtp, setIsVerifyingProfileOtp] = useState(false);
  const [otpSessionToken, setOtpSessionToken] = useState('');
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  // Bộ đếm ngược thời gian gửi lại mã OTP (60s)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showProfileOtpModal && profileOtpCountdown > 0) {
      timer = setInterval(() => {
        setProfileOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showProfileOtpModal, profileOtpCountdown]);

  // Đồng bộ thông tin khi user thay đổi hoặc sau khi tải từ backend
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  // Tải profile mới nhất và danh sách địa chỉ từ API khi vào trang
  useEffect(() => {
    fetchProfile();
    fetchAddresses();
  }, [fetchProfile, fetchAddresses]);

  // New address state
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddressLine, setNewAddressLine] = useState('');
  const [newProvince, setNewProvince] = useState('Hà Nội');
  const [newDistrict, setNewDistrict] = useState('Quận Cầu Giấy');
  const [newWard, setNewWard] = useState('Phường Dịch Vọng Hậu');
  const [newIsDefault, setNewIsDefault] = useState(false);

  // Edit address state
  const [editingAddr, setEditingAddr] = useState<UserAddress | null>(null);
  const [editRecipient, setEditRecipient] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddressLine, setEditAddressLine] = useState('');
  const [editProvince, setEditProvince] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editWard, setEditWard] = useState('');
  const [editIsDefault, setEditIsDefault] = useState(false);



  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-medium text-ink-deep">Vui lòng đăng nhập</h2>
        <p className="text-xs text-steel">Bạn cần đăng nhập để quản lý thông tin tài khoản và sổ địa chỉ.</p>
        <Link to="/auth" className="btn-marketing inline-block text-xs font-bold px-6 py-3 rounded-full mt-2">
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  // Luồng Bước 1: API 2.2 POST /api/v1/users/profile/update-request
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');

    if (!user) return;

    const trimmedFullName = fullName.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();

    if (!trimmedFullName) {
      setProfileError('Vui lòng nhập họ và tên của bạn.');
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setProfileError('Vui lòng nhập định dạng email hợp lệ (VD: user@example.com).');
      return;
    }

    if (!cleanPhone || !/^(0[3|5|7|8|9])+([0-9]{8})$/.test(cleanPhone)) {
      setProfileError('Số điện thoại không đúng định dạng di động Việt Nam (10 chữ số, VD: 0987654321).');
      return;
    }

    // Kiểm tra xem người dùng có thực sự thay đổi trường nào không
    const isUnchanged = 
      trimmedFullName === user.fullName &&
      cleanEmail === user.email &&
      cleanPhone === (user.phone || '');

    if (isUnchanged) {
      setProfileError('Thông tin cá nhân mới không có sự thay đổi so với hiện tại!');
      return;
    }

    const targetEmail = cleanEmail || user.email;
    const maskedEmail = targetEmail.replace(/(.{2})(.*)(?=@)/, (_gp, a, b) => a + '*'.repeat(Math.max(1, b.length)));
    const mockCode = Math.floor(100000 + Math.random() * 900000).toString();

    setIsSubmittingProfile(true);
    try {
      const res = await userService.requestUpdateProfile({
        fullName: trimmedFullName,
        email: cleanEmail,
        phone: cleanPhone,
      });

      if (res.data) {
        setOtpSessionToken(res.data.otpSessionToken);
        setOtpChannel('EMAIL');
        setOtpTargetMasked(res.data.targetEmailMasked || maskedEmail);
        setPendingProfileData({ fullName: trimmedFullName, email: cleanEmail, phone: cleanPhone });
        setProfileOtp('');
        setProfileOtpError('');
        setProfileOtpCountdown(res.data.resendCooldownSeconds || 60);
        setShowProfileOtpModal(true);
        showToast(res.message || `Mã xác thực OTP đã được gửi đến email ${res.data.targetEmailMasked || maskedEmail}`, 'info');
      }
    } catch (err: any) {
      if (err.statusCode === 400 || err.statusCode === 409) {
        setProfileError(err.message || 'Thông tin không hợp lệ hoặc đã được sử dụng bởi tài khoản khác.');
        return;
      }
      // Demo fallback nếu offline
      setOtpSessionToken('mock_session_' + Date.now());
      setGeneratedProfileOtp(mockCode);
      setOtpChannel('EMAIL');
      setOtpTargetMasked(maskedEmail);
      setPendingProfileData({ fullName: trimmedFullName, email: cleanEmail, phone: cleanPhone });
      setProfileOtp('');
      setProfileOtpError('');
      setProfileOtpCountdown(60);
      setShowProfileOtpModal(true);
      showToast(`Mã xác thực OTP đã gửi về hòm thư Email ${maskedEmail}: ${mockCode}`, 'info');
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  // Luồng Bước 3: API 2.2 POST /api/v1/users/profile/resend-otp
  const handleResendProfileOtp = async () => {
    if (profileOtpCountdown > 0) return;
    setProfileOtpError('');

    if (otpSessionToken && !otpSessionToken.startsWith('mock_session_')) {
      try {
        const res = await userService.resendUpdateProfileOtp(otpSessionToken);
        if (res.data) {
          setOtpSessionToken(res.data.otpSessionToken);
          setProfileOtpCountdown(res.data.resendCooldownSeconds || 60);
          setProfileOtp('');
          showToast(res.message || 'Mã xác thực OTP mới đã được gửi lại vào email của bạn!', 'info');
          return;
        }
      } catch (err: any) {
        if (err.statusCode === 429) {
          setProfileOtpError(err.message || 'Vui lòng chờ hết thời gian đếm ngược trước khi gửi lại mã.');
          return;
        }
      }
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedProfileOtp(newCode);
    setProfileOtpCountdown(60);
    setProfileOtp('');
    showToast(`Mã xác thực OTP mới đã được gửi lại vào Email ${otpTargetMasked}: ${newCode}`, 'info');
  };

  // Luồng Bước 2: API 2.2 POST /api/v1/users/profile/update-confirm
  const handleConfirmProfileOtp = async (directCode?: string) => {
    const code = directCode || profileOtp;
    setProfileOtpError('');

    if (!code || code.length !== 6) {
      setProfileOtpError('Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.');
      return;
    }

    setIsVerifyingProfileOtp(true);

    if (otpSessionToken && !otpSessionToken.startsWith('mock_session_')) {
      try {
        const res = await userService.confirmUpdateProfile({
          otpSessionToken,
          otpCode: code,
        });

        if (res.data) {
          updateProfile(res.data.fullName, res.data.email, res.data.phone);
          setIsVerifyingProfileOtp(false);
          setShowProfileOtpModal(false);
          setProfileSaved(true);
          showToast(res.message || 'Xác thực OTP thành công. Thông tin cá nhân đã được cập nhật!', 'success');
          setTimeout(() => setProfileSaved(false), 3000);
          return;
        }
      } catch (err: any) {
        setIsVerifyingProfileOtp(false);
        setProfileOtpError(err.message || 'Mã xác thực OTP không chính xác hoặc đã hết hạn.');
        return;
      }
    }

    // Demo fallback
    if (code !== generatedProfileOtp && code !== '123456') {
      setIsVerifyingProfileOtp(false);
      setProfileOtpError('Mã xác thực OTP không chính xác hoặc đã hết hạn.');
      return;
    }

    if (pendingProfileData) {
      updateProfile(pendingProfileData.fullName, pendingProfileData.email, pendingProfileData.phone);
      setIsVerifyingProfileOtp(false);
      setShowProfileOtpModal(false);
      setProfileSaved(true);
      showToast('Xác thực OTP thành công! Đã cập nhật thông tin cá nhân.', 'success');
      setTimeout(() => setProfileSaved(false), 3000);
    } else {
      setIsVerifyingProfileOtp(false);
    }
  };

  // API 13: PUT /api/v1/auth/change-password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!currentPassword) {
      setPasswordFeedback({ text: 'Vui lòng nhập mật khẩu hiện tại của bạn.', type: 'error' });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordFeedback({ text: 'Mật khẩu mới phải có tối thiểu 6 ký tự.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ text: 'Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.', type: 'error' });
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordFeedback({ text: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.', type: 'error' });
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const res = await changePassword(currentPassword, newPassword, confirmPassword);
      setIsSubmittingPassword(false);

      if (res.success) {
        setPasswordFeedback({ text: res.message, type: 'success' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('Đổi mật khẩu thành công!', 'success');
      } else {
        setPasswordFeedback({ text: res.message, type: 'error' });
      }
    } catch (err: any) {
      setIsSubmittingPassword(false);
      setPasswordFeedback({ text: err.message || 'Lỗi đổi mật khẩu', type: 'error' });
    }
  };

  // API 2.4: POST /api/v1/users/addresses
  const handleAddNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipient.trim() || !newPhone.trim() || !newAddressLine.trim()) return;

    const fullAddr = formatFullAddress(
      newAddressLine.trim(),
      newWard.trim(),
      newDistrict.trim(),
      newProvince.trim()
    );

    try {
      const res = await userService.addAddress({
        recipientName: newRecipient.trim(),
        phone: newPhone.trim(),
        addressLine: fullAddr,
        isDefault: newIsDefault,
        province: newProvince.trim(),
        district: newDistrict.trim(),
        ward: newWard.trim(),
      });

      if (res.data) {
        addAddress({
          recipientName: res.data.recipientName,
          phone: res.data.phone,
          province: newProvince.trim(),
          district: newDistrict.trim(),
          ward: newWard.trim(),
          addressLine: newAddressLine.trim(),
          isDefault: res.data.isDefault,
        });
        showToast('Thêm địa chỉ giao hàng mới thành công!', 'success');
      }
    } catch (err: any) {
      if (err.statusCode === 400) {
        showToast(err.message || 'Số lượng địa chỉ đã đạt giới hạn tối đa (tối đa 10 địa chỉ).', 'error');
        return;
      }
      addAddress({
        recipientName: newRecipient.trim(),
        phone: newPhone.trim(),
        province: newProvince.trim(),
        district: newDistrict.trim(),
        ward: newWard.trim(),
        addressLine: newAddressLine.trim(),
        isDefault: newIsDefault,
      });
      showToast('Đã thêm địa chỉ nhận hàng!', 'success');
    }

    setNewRecipient('');
    setNewPhone('');
    setNewAddressLine('');
    setNewIsDefault(false);
    setShowAddAddr(false);
  };

  const startEditAddress = (addr: UserAddress) => {
    const comp = parseAddressComponents(addr.addressLine, addr.province, addr.district, addr.ward);
    setEditingAddr(addr);
    setEditRecipient(addr.recipientName);
    setEditPhone(addr.phone);
    setEditAddressLine(comp.detail);
    setEditProvince(comp.province || 'Hà Nội');
    setEditDistrict(comp.district || 'Quận Cầu Giấy');
    setEditWard(comp.ward || 'Phường Dịch Vọng Hậu');
    setEditIsDefault(addr.isDefault);
  };

  // API 2.5: PUT /api/v1/users/addresses/{addressId}
  const handleSaveEditAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddr || !editRecipient.trim() || !editPhone.trim() || !editAddressLine.trim()) return;

    const fullAddr = formatFullAddress(
      editAddressLine.trim(),
      editWard.trim(),
      editDistrict.trim(),
      editProvince.trim()
    );

    try {
      await userService.updateAddress(editingAddr.addressId, {
        recipientName: editRecipient.trim(),
        phone: editPhone.trim(),
        addressLine: fullAddr,
        isDefault: editIsDefault,
        province: editProvince.trim(),
        district: editDistrict.trim(),
        ward: editWard.trim(),
      });
      showToast('Cập nhật địa chỉ nhận hàng thành công!', 'success');
    } catch (err: any) {
      console.warn('API updateAddress err', err);
    }

    updateAddress(editingAddr.addressId, {
      recipientName: editRecipient.trim(),
      phone: editPhone.trim(),
      province: editProvince.trim(),
      district: editDistrict.trim(),
      ward: editWard.trim(),
      addressLine: editAddressLine.trim(),
      isDefault: editIsDefault,
    });

    setEditingAddr(null);
  };

  // API 2.6: PATCH /api/v1/users/addresses/{addressId}/default
  const handleSetDefaultAddress = async (addressId: number) => {
    try {
      await userService.setDefaultAddress(addressId);
      showToast('Đã đặt làm địa chỉ nhận hàng mặc định!', 'success');
    } catch (err: any) {
      console.warn('API setDefaultAddress err', err);
    }
    setDefaultAddress(addressId);
  };

  // API 2.7: DELETE /api/v1/users/addresses/{addressId}
  const handleDeleteAddress = async (addressId: number) => {
    const target = user.addresses.find((a) => a.addressId === addressId);
    if (target?.isDefault && user.addresses.length > 1) {
      showToast('Không thể xóa địa chỉ mặc định khi tài khoản vẫn còn các địa chỉ khác.', 'error');
      return;
    }

    try {
      await userService.deleteAddress(addressId);
      showToast('Đã xóa địa chỉ nhận hàng thành công!', 'success');
    } catch (err: any) {
      if (err.statusCode === 400) {
        showToast(err.message, 'error');
        return;
      }
    }
    deleteAddress(addressId);
  };



  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner Profile Summary */}
      <div className="bg-canvas border border-hairline-soft rounded-xxl p-6 shadow-sticky flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full bg-surface-soft border border-hairline-soft flex items-center justify-center font-bold text-ink-deep text-xl">
            {user.fullName.charAt(0)}
          </div>
          <div>
            <h1 className="text-lg font-medium text-ink-deep">{user.fullName}</h1>
            <div className="text-xs text-steel flex items-center gap-2 mt-0.5">
              <span>{user.phone}</span> • <span>{user.email}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowLogoutModal(true)}
          className="text-xs text-steel hover:text-critical flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
        >
          <LogOut size={14} />
          <span>Đăng xuất</span>
        </button>
      </div>

      {/* Grid Tabs and Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Nav Sidebar (4 cols) */}
        <div className="md:col-span-4 bg-canvas border border-hairline-soft rounded-xxl p-2.5 shadow-none space-y-1.5 text-xs">
          <button
            onClick={() => handleSelectTab('profile')}
            className={`w-full text-left px-4 py-3 rounded-full flex items-center gap-2.5 transition-all ${
              activeTab === 'profile'? 'bg-ink-deep text-canvas font-bold shadow-xs': 'text-charcoal hover:bg-surface-soft'
            }`}
          >
            <User size={15} />
            <span>Thông tin cá nhân</span>
          </button>

          <button
            onClick={() => handleSelectTab('addresses')}
            className={`w-full text-left px-4 py-3 rounded-full flex items-center justify-between transition-all ${
              activeTab === 'addresses'? 'bg-ink-deep text-canvas font-bold shadow-xs': 'text-charcoal hover:bg-surface-soft'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MapPin size={15} />
              <span>Sổ địa chỉ</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'addresses'? 'bg-canvas text-ink-deep': 'bg-surface-soft text-charcoal'
            }`}>
              {user.addresses.length}
            </span>
          </button>



          <button
            onClick={() => handleSelectTab('support')}
            className={`w-full text-left px-4 py-3 rounded-full flex items-center justify-between transition-all ${
              activeTab === 'support' ? 'bg-ink-deep text-canvas font-bold shadow-xs' : 'text-charcoal hover:bg-surface-soft'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Headphones size={15} />
              <span>Lịch sử hỗ trợ</span>
            </div>
            {supportCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'support' ? 'bg-canvas text-ink-deep' : 'bg-surface-soft text-charcoal'
              }`}>
                {supportCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { handleSelectTab('password'); setPasswordFeedback(null); }}
            className={`w-full text-left px-4 py-3 rounded-full flex items-center gap-2.5 transition-all ${
              activeTab === 'password'? 'bg-ink-deep text-canvas font-bold shadow-xs': 'text-charcoal hover:bg-surface-soft'
            }`}
          >
            <KeyRound size={15} />
            <span>Đổi mật khẩu</span>
          </button>
        </div>

        {/* Tab Content (8 cols) */}
        <div className="md:col-span-8 bg-canvas border border-hairline-soft rounded-xxl p-6 sm:p-8 shadow-sticky">
          
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-ink-deep uppercase tracking-wider pb-3 border-b border-hairline-soft">
                Chỉnh sửa thông tin cá nhân
              </h3>

              {profileSaved && (
                <div className="p-3.5 bg-surface-soft text-charcoal text-xs rounded-xl border border-success/30 flex items-center gap-2">
                  <CheckCircle size={15} className="text-success" />
                  <span>Đã cập nhật thông tin thành công!</span>
                </div>
              )}

              {profileError && (
                <div className="p-3.5 bg-critical/5 text-critical text-xs rounded-xl border border-critical/30 flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-charcoal mb-1.5">Họ và tên:</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nhập họ và tên..."
                    className="w-full h-11 bg-canvas border border-hairline rounded-lg px-3.5 text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-charcoal mb-1.5">Địa chỉ Email:</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-11 bg-canvas border border-hairline rounded-lg px-3.5 text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-charcoal mb-1.5">
                    Số điện thoại di động:
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0987654321"
                    className="w-full h-11 bg-canvas border border-hairline rounded-lg px-3.5 text-ink font-mono text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
                  />
                  <p className="text-[11px] text-steel mt-1">
                    Số điện thoại dùng để nhận mã xác thực OTP, liên hệ giao nhận và quản lý đơn hàng.
                  </p>
                </div>

                <button
                  type="submit"
                  className="btn-marketing py-2.5 px-6 rounded-full text-xs font-bold shadow-xs cursor-pointer hover:opacity-90 active:scale-98 transition-all"
                >
                  Lưu thay đổi
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
                <h3 className="text-sm font-bold text-ink-deep uppercase tracking-wider">
                  Sổ địa chỉ nhận hàng
                </h3>
                <button
                  onClick={() => setShowAddAddr(!showAddAddr)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                >
                  <Plus size={14} />
                  <span>Thêm địa chỉ mới</span>
                </button>
              </div>

              {/* Add form */}
              {showAddAddr && (
                <form onSubmit={handleAddNewAddress} className="p-5 bg-surface-soft border border-hairline-soft rounded-xl space-y-3.5 text-xs">
                  <h4 className="font-bold text-ink-deep">Thêm địa chỉ nhận hàng mới</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-steel mb-1">Họ tên người nhận:</label>
                      <input
                        type="text"
                        required
                        placeholder="Nguyễn Văn A..."
                        value={newRecipient}
                        onChange={(e) => setNewRecipient(e.target.value)}
                        className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-steel mb-1">Số điện thoại:</label>
                      <input
                        type="tel"
                        required
                        placeholder="09xxxxxxxx..."
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs font-mono focus:border-2 focus:border-fb-blue focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-steel mb-1">Tỉnh / Thành phố:</label>
                      <input
                        type="text"
                        required
                        value={newProvince}
                        onChange={(e) => setNewProvince(e.target.value)}
                        className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-steel mb-1">Quận / Huyện:</label>
                      <input
                        type="text"
                        required
                        value={newDistrict}
                        onChange={(e) => setNewDistrict(e.target.value)}
                        className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-steel mb-1">Phường / Xã:</label>
                      <input
                        type="text"
                        required
                        value={newWard}
                        onChange={(e) => setNewWard(e.target.value)}
                        className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-steel mb-1">Địa chỉ chi tiết:</label>
                    <input
                      type="text"
                      required
                      placeholder="Số nhà, tên đường, tòa nhà..."
                      value={newAddressLine}
                      onChange={(e) => setNewAddressLine(e.target.value)}
                      className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={newIsDefault}
                      onChange={(e) => setNewIsDefault(e.target.checked)}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span className="text-xs text-charcoal">Đặt làm địa chỉ nhận hàng mặc định</span>
                  </label>

                  <div className="flex gap-2.5 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddAddr(false)}
                      className="btn-ghost px-4 py-2 text-xs font-bold"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="btn-marketing px-5 py-2 text-xs font-bold rounded-full"
                    >
                      Lưu địa chỉ
                    </button>
                  </div>
                </form>
              )}

              {/* Edit Address Modal */}
              {editingAddr && (
                <div className="fixed inset-0 z-50 bg-ink-deep/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <form onSubmit={handleSaveEditAddress} className="max-w-lg w-full bg-canvas border border-hairline-soft rounded-2xl p-6 shadow-2xl space-y-4 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
                      <h4 className="font-bold text-ink-deep text-sm flex items-center gap-2">
                        <Edit3 size={15} className="text-primary" />
                        <span>Chỉnh sửa địa chỉ nhận hàng</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setEditingAddr(null)}
                        className="p-1 text-steel hover:text-ink rounded-lg hover:bg-surface-soft"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-steel mb-1">Họ tên người nhận:</label>
                        <input
                          type="text"
                          required
                          value={editRecipient}
                          onChange={(e) => setEditRecipient(e.target.value)}
                          className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-steel mb-1">Số điện thoại:</label>
                        <input
                          type="tel"
                          required
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs font-mono focus:border-2 focus:border-fb-blue focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-steel mb-1">Tỉnh / Thành:</label>
                        <input
                          type="text"
                          required
                          value={editProvince}
                          onChange={(e) => setEditProvince(e.target.value)}
                          className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-steel mb-1">Quận / Huyện:</label>
                        <input
                          type="text"
                          required
                          value={editDistrict}
                          onChange={(e) => setEditDistrict(e.target.value)}
                          className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-steel mb-1">Phường / Xã:</label>
                        <input
                          type="text"
                          required
                          value={editWard}
                          onChange={(e) => setEditWard(e.target.value)}
                          className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-steel mb-1">Địa chỉ chi tiết:</label>
                      <input
                        type="text"
                        required
                        value={editAddressLine}
                        onChange={(e) => setEditAddressLine(e.target.value)}
                        className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={editIsDefault}
                        onChange={(e) => setEditIsDefault(e.target.checked)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span className="text-xs text-charcoal">Đặt làm địa chỉ nhận hàng mặc định</span>
                    </label>

                    <div className="flex gap-2.5 justify-end pt-3 border-t border-hairline-soft">
                      <button
                        type="button"
                        onClick={() => setEditingAddr(null)}
                        className="btn-ghost px-4 py-2 text-xs font-bold"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="btn-marketing px-5 py-2 text-xs font-bold rounded-full"
                      >
                        Cập nhật địa chỉ
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Address list */}
              <div className="space-y-3">
                {user.addresses.map((addr) => (
                  <div
                    key={addr.addressId}
                    className={`p-4 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                      addr.isDefault? 'border-2 border-primary bg-surface-soft/40': 'border-hairline-soft bg-canvas'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-ink-deep font-bold">{addr.recipientName}</strong>
                        <span className="text-hairline">|</span>
                        <span className="font-mono text-charcoal">{addr.phone}</span>
                        {addr.isDefault && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary text-canvas">
                            Mặc định
                          </span>
                        )}
                      </div>
                      <p className="text-charcoal">
                        {(() => {
                          const comp = parseAddressComponents(addr.addressLine, addr.province, addr.district, addr.ward);
                          return formatFullAddress(comp.detail, comp.ward, comp.district, comp.province);
                        })()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditAddress(addr)}
                        className="p-1.5 text-steel hover:text-primary rounded-lg hover:bg-surface-soft transition-colors"
                        title="Chỉnh sửa địa chỉ"
                      >
                        <Edit3 size={14} />
                      </button>

                      {!addr.isDefault && (
                        <button
                          onClick={() => handleSetDefaultAddress(addr.addressId)}
                          className="text-[11px] text-primary hover:underline font-medium px-2 py-1"
                        >
                          Đặt mặc định
                        </button>
                      )}

                      {user.addresses.length > 1 && (
                        <button
                          onClick={() => handleDeleteAddress(addr.addressId)}
                          className="p-1.5 text-steel hover:text-critical rounded-lg hover:bg-surface-soft transition-colors"
                          title="Xóa địa chỉ"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}



          {/* TAB 4: PASSWORD (ĐỔI MẬT KHẨU) */}
          {activeTab === 'password' && (
            <div className="space-y-6">
              <div className="pb-3 border-b border-hairline-soft flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink-deep uppercase tracking-wider">
                    Đổi mật khẩu tài khoản
                  </h3>
                  <p className="text-[11px] text-steel mt-0.5">
                    Quản lý mật khẩu đăng nhập để bảo vệ an toàn thông tin cá nhân và đơn hàng.
                  </p>
                </div>
                
              </div>

              {passwordFeedback && (
                <div className={`p-3.5 text-xs rounded-xl border flex items-center gap-2 ${
                  passwordFeedback.type === 'success'? 'bg-success/10 border-success/30 text-success font-medium': 'bg-critical/10 border-critical/30 text-critical font-medium'
                }`}>
                  {passwordFeedback.type === 'success'? <CheckCircle size={15} />: <AlertCircle size={15} />}
                  <span>{passwordFeedback.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 text-xs max-w-lg">
                <div>
                  <label className="block font-medium text-charcoal mb-1.5">
                    Mật khẩu hiện tại: <span className="text-critical">*</span>
                  </label>
                  <PasswordInput
                    required
                    placeholder="Nhập mật khẩu hiện tại của bạn"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-medium text-charcoal mb-1.5">
                    Mật khẩu mới: <span className="text-critical">*</span>
                  </label>
                  <PasswordInput
                    required
                    placeholder="Nhập mật khẩu mới của bạn"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-medium text-charcoal mb-1.5">
                    Xác nhận mật khẩu mới: <span className="text-critical">*</span>
                  </label>
                  <PasswordInput
                    required
                    placeholder="Nhập lại mật khẩu mới của bạn"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingPassword}
                    className="btn-marketing px-6 py-3 rounded-full text-xs font-bold shadow-xs flex items-center gap-2"
                  >
                    <KeyRound size={14} />
                    <span>Cập nhật mật khẩu mới</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: SUPPORT HISTORY */}
          {activeTab === 'support' && (
            <SupportHistoryView />
          )}

        </div>

      </div>

      {/* Modal xác nhận đăng xuất */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-ink-deep/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-canvas border border-hairline-soft rounded-2xl p-6 shadow-2xl space-y-4 text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
              <h4 className="font-bold text-ink-deep text-sm flex items-center gap-2">
                <LogOut size={16} className="text-critical" />
                <span>Xác nhận đăng xuất</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="p-1 text-steel hover:text-ink rounded-lg hover:bg-surface-soft transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-charcoal text-xs leading-relaxed">
              Bạn có chắc chắn muốn đăng xuất khỏi tài khoản <strong className="text-ink-deep font-bold">{user.fullName}</strong> không?
            </p>

            <div className="flex gap-2.5 justify-end pt-2 border-t border-hairline-soft">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="btn-ghost px-4 py-2 text-xs font-bold rounded-full"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                  navigate('/');
                }}
                className="bg-critical hover:bg-critical-strong text-canvas px-5 py-2 text-xs font-bold rounded-full shadow-xs transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác thực OTP Cập nhật Thông tin Cá nhân */}
      {showProfileOtpModal && pendingProfileData && (
        <div className="fixed inset-0 z-50 bg-ink-deep/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-canvas border border-hairline-soft rounded-2xl p-6 shadow-2xl space-y-4 text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
              <h4 className="font-bold text-ink-deep text-sm flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" />
                <span>Xác thực OTP đổi thông tin</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowProfileOtpModal(false)}
                className="p-1 text-steel hover:text-ink rounded-lg hover:bg-surface-soft transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-charcoal text-xs leading-relaxed">
              Mã xác thực OTP gồm 6 chữ số đã được gửi về hòm thư Email: <strong className="text-ink-deep font-mono">{otpTargetMasked}</strong>
            </p>

            {profileOtpError && (
              <div className="p-2.5 bg-critical/5 text-critical text-xs rounded-xl border border-critical/30 flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{profileOtpError}</span>
              </div>
            )}

            <div className="py-1">
              <label className="block text-center text-steel font-medium mb-1">
                Nhập 6 số mã OTP xác thực:
              </label>
              <OtpInput
                value={profileOtp}
                onChange={setProfileOtp}
                length={6}
                autoFocus={true}
                disabled={isVerifyingProfileOtp}
                onComplete={(val) => handleConfirmProfileOtp(val)}
              />
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-steel py-1">
              <span>Chưa nhận được mã?</span>
              {profileOtpCountdown > 0 ? (
                <span className="font-semibold text-steel flex items-center gap-1">
                  <Clock size={13} />
                  <span>Gửi lại sau <strong className="font-mono text-primary font-bold">{profileOtpCountdown}s</strong></span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendProfileOtp}
                  className="text-primary font-bold hover:underline inline-flex items-center gap-1 transition cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Gửi lại mã ngay</span>
                </button>
              )}
            </div>

            <div className="flex gap-2.5 justify-end pt-2 border-t border-hairline-soft">
              <button
                type="button"
                onClick={() => setShowProfileOtpModal(false)}
                className="btn-ghost px-4 py-2 text-xs font-bold rounded-full cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isVerifyingProfileOtp || profileOtp.length !== 6}
                onClick={() => handleConfirmProfileOtp()}
                className="btn-marketing px-5 py-2 text-xs font-bold rounded-full shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isVerifyingProfileOtp && <Loader2 size={14} className="animate-spin" />}
                <span>Xác nhận & Cập nhật</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
