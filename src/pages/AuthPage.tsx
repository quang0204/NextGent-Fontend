import React, { useState, useEffect, useRef, useId } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { OtpInput, OtpInputStatus } from '../components/common/OtpInput';
import { PasswordInput } from '../components/common/PasswordInput';
import { isValidVietnamesePhone, isValidEmail } from '../utils/validators';
import { 
  Mail, 
  KeyRound, 
  ArrowLeft, 
  CheckCircle2, 
  UserPlus, 
  LogIn, 
  RotateCcw,
  Clock,
  Smartphone,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  ShoppingBag,
  Eye,
  EyeOff
} from 'lucide-react';

type RegFieldKey = 'fullName' | 'phone' | 'email' | 'password' | 'confirmPassword' | 'terms';

const REG_FIELD_LABELS: Record<RegFieldKey, string> = {
  fullName: 'Họ và tên',
  phone: 'Số điện thoại',
  email: 'Email',
  password: 'Mật khẩu',
  confirmPassword: 'Xác nhận mật khẩu',
  terms: 'Điều khoản dịch vụ',
};

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
const PASSWORD_POLICY_MSG = 'Mật khẩu phải có tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const urlMode = searchParams.get('mode') === 'register' ? 'register' : searchParams.get('mode') === 'forgot' ? 'forgot' : 'login';

  const { 
    initiateLogin,
    verifyLoginOtp,
    resendLoginOtp,
    initiateRegister,
    verifyRegisterOtp,
    resendRegisterOtp,
    forgotPassword,
    resetPassword,
    resendForgotOtp,
    isAuthenticated, 
    user, 
    logout 
  } = useAuthStore();
  const { showToast } = useToastStore();

  // Mode: 'login' | 'register' | 'forgot'
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>(urlMode);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lockReason, setLockReason] = useState<string | null>(null);

  // -------------------------------------------------------------
  // API 1, 2, 3: Login State
  // -------------------------------------------------------------
  const [loginIdentity, setLoginIdentity] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loginSessionToken, setLoginSessionToken] = useState('');
  const [loginTargetMasked, setLoginTargetMasked] = useState('');
  const [loginChannel, setLoginChannel] = useState<'PHONE' | 'EMAIL'>('EMAIL');
  const [loginCountdown, setLoginCountdown] = useState(0); // cooldown 60s
  const [loginExpiresIn, setLoginExpiresIn] = useState(0); // TTL 120s
  const [loginFocus, setLoginFocus] = useState<'identity' | 'password' | null>(null);
  const [loginFieldError, setLoginFieldError] = useState<'identity' | 'password' | null>(null);
  const [loginInlineError, setLoginInlineError] = useState('');
  const [loginShakeCount, setLoginShakeCount] = useState(0);
  const [loginPhase, setLoginPhase] = useState<'idle' | 'busy' | 'ok'>('idle');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginOtpStatus, setLoginOtpStatus] = useState<OtpInputStatus>('idle');
  const [loginOtpShake, setLoginOtpShake] = useState(0);
  const [regOtpStatus, setRegOtpStatus] = useState<OtpInputStatus>('idle');
  const [regOtpShake, setRegOtpShake] = useState(0);
  const [forgotOtpStatus, setForgotOtpStatus] = useState<OtpInputStatus>('idle');
  const [forgotOtpShake, setForgotOtpShake] = useState(0);

  const loginUid = useId();
  const identityInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const loginSuccessTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (loginSuccessTimerRef.current !== null) {
        window.clearTimeout(loginSuccessTimerRef.current);
      }
    };
  }, []);

  // -------------------------------------------------------------
  // API 4, 5, 6: Register State
  // -------------------------------------------------------------
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regAgreeTerms, setRegAgreeTerms] = useState(true);

  const [isRegOtpStep, setIsRegOtpStep] = useState(false);
  const [regToken, setRegToken] = useState('');
  const [regOtpCode, setRegOtpCode] = useState('');
  const [regCountdown, setRegCountdown] = useState(0);
  const [regExpiresIn, setRegExpiresIn] = useState(0);
  const [regTried, setRegTried] = useState(false);
  const [regSummaryKeys, setRegSummaryKeys] = useState<RegFieldKey[]>([]);
  const [regShakeCount, setRegShakeCount] = useState(0);
  const [regSubmitDone, setRegSubmitDone] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  const regUid = useId();
  const regBoxRefs = useRef<Partial<Record<RegFieldKey, HTMLDivElement | null>>>({});
  const regInputRefs = useRef<Partial<Record<RegFieldKey, HTMLElement | null>>>({});

  // -------------------------------------------------------------
  // API 7, 8, 9: Forgot & Reset Password State
  // -------------------------------------------------------------
  const [forgotStep, setForgotStep] = useState<'REQUEST' | 'OTP_PASSWORD' | 'SUCCESS'>('REQUEST');
  const [forgotIdentity, setForgotIdentity] = useState('');
  const [forgotResetToken, setForgotResetToken] = useState('');
  const [forgotTargetMasked, setForgotTargetMasked] = useState('');
  const [forgotChannel, setForgotChannel] = useState<'PHONE' | 'EMAIL'>('EMAIL');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotCountdown, setForgotCountdown] = useState(0);
  const [forgotExpiresIn, setForgotExpiresIn] = useState(0);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('');

  // Đếm ngược cho Login OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOtpSent && (loginCountdown > 0 || loginExpiresIn > 0)) {
      timer = setInterval(() => {
        setLoginCountdown((prev) => (prev > 0 ? prev - 1 : 0));
        setLoginExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOtpSent, loginCountdown, loginExpiresIn]);

  // Đếm ngược cho Register OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRegOtpStep && (regCountdown > 0 || regExpiresIn > 0)) {
      timer = setInterval(() => {
        setRegCountdown((prev) => (prev > 0 ? prev - 1 : 0));
        setRegExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRegOtpStep, regCountdown, regExpiresIn]);

  // Đếm ngược cho Forgot Password OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (forgotStep === 'OTP_PASSWORD' && (forgotCountdown > 0 || forgotExpiresIn > 0)) {
      timer = setInterval(() => {
        setForgotCountdown((prev) => (prev > 0 ? prev - 1 : 0));
        setForgotExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [forgotStep, forgotCountdown, forgotExpiresIn]);

  // Đồng bộ searchParams URL mode
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'register') {
      setActiveTab('register');
    } else if (mode === 'forgot') {
      setActiveTab('forgot');
    } else {
      setActiveTab('login');
    }
  }, [searchParams]);

  const getOtpSuccessBeatMs = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 320 : 1050;

  const switchTab = (tab: 'login' | 'register' | 'forgot') => {
    if (loginSuccessTimerRef.current !== null) {
      window.clearTimeout(loginSuccessTimerRef.current);
      loginSuccessTimerRef.current = null;
    }
    setActiveTab(tab);
    setErrorMsg('');
    setLockReason(null);
    setIsOtpSent(false);
    setIsRegOtpStep(false);
    setForgotStep('REQUEST');
    setLoginCountdown(0);
    setRegCountdown(0);
    setForgotCountdown(0);
    setLoginFocus(null);
    setLoginFieldError(null);
    setLoginInlineError('');
    setLoginPhase('idle');
    setShowLoginPassword(false);
    setLoginOtpStatus('idle');
    setRegOtpStatus('idle');
    setForgotOtpStatus('idle');
    setRegTried(false);
    setRegSummaryKeys([]);
    setRegSubmitDone(false);
    setShowRegPassword(false);
    setShowRegConfirmPassword(false);
    const params: Record<string, string> = {};
    if (tab === 'register') params.mode = 'register';
    if (tab === 'forgot') params.mode = 'forgot';
    if (redirect && redirect !== '/') params.redirect = redirect;
    setSearchParams(params);
  };

  // Nếu người dùng đã đăng nhập (chờ nhịp tick xanh #403 / merge #406 hoàn tất trước khi chuyển trang)
  if (isAuthenticated && user && loginPhase !== 'ok' && loginOtpStatus !== 'success' && regOtpStatus !== 'success') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-surface-soft text-success rounded-full flex items-center justify-center mx-auto border border-success/30">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-xl font-medium text-ink-deep">Bạn đã đăng nhập</h2>
        <p className="text-xs text-steel">
          Tài khoản: <strong className="text-charcoal">{user.fullName}</strong> ({user.phone || user.email})
        </p>
        <div className="flex gap-2.5 justify-center pt-2">
          <Link to="/account" className="btn-marketing text-xs font-bold px-5 py-2.5 rounded-full shadow-xs">
            Quản lý tài khoản
          </Link>
          <button 
            onClick={() => {
              logout();
              showToast('Đã đăng xuất tài khoản', 'info');
            }} 
            className="btn-secondary text-xs font-bold px-5 py-2.5 rounded-full"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  const triggerLoginFieldError = (field: 'identity' | 'password', msg: string) => {
    setLoginFieldError(field);
    setLoginInlineError(msg);
    setLoginShakeCount((c) => c + 1);
    const target = field === 'identity' ? identityInputRef.current : passwordInputRef.current;
    window.requestAnimationFrame(() => target?.focus({ preventScroll: true }));
  };

  // --------------------------------------------------------------------------
  // API 1: POST /api/v1/auth/login-initiate
  // --------------------------------------------------------------------------
  const handleInitiateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || loginPhase !== 'idle') return;
    setErrorMsg('');
    setLockReason(null);
    setLoginFieldError(null);
    setLoginInlineError('');
    const cleanIdentity = loginIdentity.trim();

    if (!cleanIdentity) {
      triggerLoginFieldError('identity', 'Vui lòng nhập Số điện thoại hoặc Email của bạn.');
      return;
    }
    if (!loginPassword || loginPassword.length < 6) {
      triggerLoginFieldError('password', 'Vui lòng nhập mật khẩu tối thiểu 6 ký tự.');
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const okBeatMs = prefersReducedMotion ? 260 : 700;

    setLoading(true);
    setLoginPhase('busy');
    try {
      const data = await initiateLogin(cleanIdentity, loginPassword);
      if (data.otpRequired === false || data.accessToken) {
        setLoginPhase('ok');
        loginSuccessTimerRef.current = window.setTimeout(() => {
          loginSuccessTimerRef.current = null;
          setLoginPhase('idle');
          showToast('Đăng nhập thành công!', 'success');
          navigate(redirect);
        }, okBeatMs);
        return;
      }
      setLoginSessionToken(data.sessionToken || '');
      setLoginChannel(data.channel || 'EMAIL');
      setLoginTargetMasked(data.targetMasked || '');
      setLoginCountdown(data.cooldownSeconds || 60);
      setLoginExpiresIn(data.expiresInSeconds || 120);
      setLoginPhase('ok');
      loginSuccessTimerRef.current = window.setTimeout(() => {
        loginSuccessTimerRef.current = null;
        setLoginPhase('idle');
        setIsOtpSent(true);
        setLoginOtp('');
        showToast(
          `Mã OTP đã được gửi qua ${data.channel === 'PHONE' ? 'tin nhắn SMS' : 'Email'}!`,
          'info'
        );
      }, okBeatMs);
    } catch (err: any) {
      setLoginPhase('idle');
      if (err.statusCode === 403) {
        setErrorMsg('Tài khoản của bạn đã bị khóa.');
        setLockReason(err.reason || 'Vui lòng liên hệ bộ phận hỗ trợ chăm sóc khách hàng để được mở khóa.');
      } else if (err.statusCode === 429) {
        setErrorMsg('Bạn đã nhập sai quá 5 lần. Vui lòng thử lại sau ít phút để bảo vệ tài khoản.');
      } else {
        const msg = err.message || 'Tài khoản hoặc mật khẩu không chính xác.';
        const errField = /email|số điện thoại|sdt|tài khoản không tồn tại/i.test(msg) ? 'identity' : 'password';
        triggerLoginFieldError(errField, msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // API 2: POST /api/v1/auth/login-verify-otp
  // --------------------------------------------------------------------------
  const handleVerifyLoginOtp = async (e?: React.FormEvent, directOtp?: string) => {
    if (e) e.preventDefault();
    if (loading || loginOtpStatus === 'busy' || loginOtpStatus === 'success') return;
    setErrorMsg('');
    const code = directOtp || loginOtp;

    if (!code || code.length !== 6) {
      setErrorMsg('Vui lòng nhập đầy đủ 6 số OTP.');
      setLoginOtpStatus('error');
      setLoginOtpShake((c) => c + 1);
      return;
    }

    setLoading(true);
    setLoginOtpStatus('busy');
    try {
      await verifyLoginOtp(loginSessionToken, code);
      setLoginOtpStatus('success');
      loginSuccessTimerRef.current = window.setTimeout(() => {
        loginSuccessTimerRef.current = null;
        setLoginOtpStatus('idle');
        showToast('Đăng nhập thành công!', 'success');
        navigate(redirect);
      }, getOtpSuccessBeatMs());
    } catch (err: any) {
      setLoginOtpStatus('error');
      setLoginOtpShake((c) => c + 1);
      if (err.statusCode === 403) {
        setErrorMsg('Tài khoản của bạn đã bị khóa.');
        setLockReason(err.reason || 'Vui lòng liên hệ bộ phận hỗ trợ chăm sóc khách hàng để được mở khóa.');
      } else {
        setErrorMsg(err.message || 'Mã OTP không chính xác hoặc đã quá thời hạn 120 giây.');
      }
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // API 3: POST /api/v1/auth/login-resend-otp
  // --------------------------------------------------------------------------
  const handleResendLoginOtp = async () => {
    if (loginCountdown > 0 || loginOtpStatus === 'success') return;
    setErrorMsg('');
    setLoginOtpStatus('idle');
    setLoading(true);
    try {
      const data = await resendLoginOtp(loginSessionToken);
      setLoginCountdown(data.cooldownSeconds || 60);
      setLoginExpiresIn(data.expiresInSeconds || 120);
      setLoginOtp('');
      showToast('Mã OTP mới đã được gửi lại thành công.', 'info');
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể gửi lại mã OTP lúc này.');
    } finally {
      setLoading(false);
    }
  };

  const getRegisterErrors = (values = {
    fullName: regFullName,
    phone: regPhone,
    email: regEmail,
    password: regPassword,
    confirmPassword: regConfirmPassword,
    terms: regAgreeTerms,
  }): Partial<Record<RegFieldKey, string>> => {
    const errs: Partial<Record<RegFieldKey, string>> = {};
    if (!values.fullName.trim()) {
      errs.fullName = 'Vui lòng nhập họ và tên của bạn.';
    }
    if (!isValidVietnamesePhone(values.phone.trim())) {
      errs.phone = 'Số điện thoại không đúng định dạng di động Việt Nam (10 chữ số).';
    }
    if (!isValidEmail(values.email.trim())) {
      errs.email = 'Vui lòng nhập định dạng email hợp lệ (vd: ten@domain.com).';
    }
    if (!values.password || !PASSWORD_REGEX.test(values.password)) {
      errs.password = PASSWORD_POLICY_MSG;
    }
    if (!values.confirmPassword || values.confirmPassword !== values.password) {
      errs.confirmPassword = 'Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.';
    }
    if (!values.terms) {
      errs.terms = 'Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.';
    }
    return errs;
  };

  const focusRegField = (key: RegFieldKey) => {
    const prefersReduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    regBoxRefs.current[key]?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'center' });
    window.setTimeout(
      () => regInputRefs.current[key]?.focus({ preventScroll: true }),
      prefersReduced ? 0 : 180
    );
  };

  // --------------------------------------------------------------------------
  // API 4: POST /api/v1/auth/register-initiate
  // --------------------------------------------------------------------------
  const handleInitiateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || regSubmitDone) return;
    setErrorMsg('');

    const regErrors = getRegisterErrors();
    const badKeys = (Object.keys(REG_FIELD_LABELS) as RegFieldKey[]).filter((k) => Boolean(regErrors[k]));

    if (badKeys.length > 0) {
      setRegTried(true);
      setRegSummaryKeys(badKeys);
      setRegShakeCount((c) => c + 1);
      focusRegField(badKeys[0]);
      return;
    }

    const cleanPhone = regPhone.trim();
    const cleanEmail = regEmail.trim();
    const prefersReduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const doneBeatMs = prefersReduced ? 180 : 520;

    setLoading(true);
    try {
      const data = await initiateRegister({
        fullName: regFullName.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        password: regPassword,
        confirmPassword: regConfirmPassword,
      });

      setRegSubmitDone(true);
      loginSuccessTimerRef.current = window.setTimeout(() => {
        loginSuccessTimerRef.current = null;
        setRegSubmitDone(false);
        setRegTried(false);
        setRegSummaryKeys([]);
        setRegToken(data.registrationToken);
        setRegCountdown(data.cooldownSeconds || 60);
        setRegExpiresIn(data.expiresInSeconds || 300);
        setIsRegOtpStep(true);
        setRegOtpCode('');
        showToast(`Mã xác thực kích hoạt đã gửi về hòm thư Email ${data.targetEmail}`, 'info');
      }, doneBeatMs);
    } catch (err: any) {
      if (err.statusCode === 409) {
        setErrorMsg('Số điện thoại hoặc Email này đã được đăng ký tài khoản trên hệ thống.');
      } else {
        setErrorMsg(err.message || 'Không thể gửi yêu cầu đăng ký lúc này.');
      }
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // API 5: POST /api/v1/auth/register-verify-otp
  // --------------------------------------------------------------------------
  const handleConfirmRegister = async (e?: React.FormEvent, directOtp?: string) => {
    if (e) e.preventDefault();
    if (loading || regOtpStatus === 'busy' || regOtpStatus === 'success') return;
    setErrorMsg('');
    const code = directOtp || regOtpCode;

    if (!code || code.length !== 6) {
      setErrorMsg('Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.');
      setRegOtpStatus('error');
      setRegOtpShake((c) => c + 1);
      return;
    }

    setLoading(true);
    setRegOtpStatus('busy');
    try {
      await verifyRegisterOtp(regToken, code);
      setRegOtpStatus('success');
      loginSuccessTimerRef.current = window.setTimeout(() => {
        loginSuccessTimerRef.current = null;
        setRegOtpStatus('idle');
        showToast('Đăng ký và kích hoạt tài khoản thành công! Chào mừng thành viên mới.', 'success');
        navigate(redirect);
      }, getOtpSuccessBeatMs());
    } catch (err: any) {
      setRegOtpStatus('error');
      setRegOtpShake((c) => c + 1);
      setErrorMsg(err.message || 'Mã OTP xác thực kích hoạt không chính xác hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // API 6: POST /api/v1/auth/register-resend-otp
  // --------------------------------------------------------------------------
  const handleResendRegOtp = async () => {
    if (regCountdown > 0 || regOtpStatus === 'success') return;
    setErrorMsg('');
    setRegOtpStatus('idle');
    setLoading(true);
    try {
      const data = await resendRegisterOtp(regToken);
      setRegCountdown(data.cooldownSeconds || 60);
      setRegExpiresIn(data.expiresInSeconds || 300);
      setRegOtpCode('');
      showToast(`Mã xác thực mới đã gửi lại vào Email ${regEmail}`, 'info');
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi gửi lại mã xác thực.');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // API 7: POST /api/v1/auth/forgot-password
  // --------------------------------------------------------------------------
  const handleRequestForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const clean = forgotIdentity.trim();
    if (!clean) {
      setErrorMsg('Vui lòng nhập số điện thoại hoặc email đã đăng ký.');
      return;
    }

    setLoading(true);
    try {
      const data = await forgotPassword(clean);
      setForgotResetToken(data.resetToken);
      setForgotChannel(data.channel);
      setForgotTargetMasked(data.targetMasked);
      setForgotExpiresIn(data.expiresInSeconds || 300);
      setForgotCountdown(data.cooldownSeconds || 60);
      setForgotStep('OTP_PASSWORD');
      setForgotOtp('');
      showToast(`Mã OTP khôi phục mật khẩu đã gửi tới ${data.targetMasked}`, 'info');
    } catch (err: any) {
      if (err.statusCode === 403) {
        setErrorMsg('Tài khoản của bạn đã bị khóa.');
        setLockReason(err.reason || 'Vui lòng liên hệ bộ phận hỗ trợ chăm sóc khách hàng để được mở khóa.');
      } else if (err.statusCode === 404) {
        setErrorMsg('Không tìm thấy tài khoản nào khớp với thông tin bạn cung cấp.');
      } else {
        setErrorMsg(err.message || 'Lỗi gửi yêu cầu khôi phục mật khẩu.');
      }
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // API 8: POST /api/v1/auth/reset-password
  // --------------------------------------------------------------------------
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || forgotOtpStatus === 'busy' || forgotOtpStatus === 'success') return;
    setErrorMsg('');

    if (!forgotOtp.trim() || forgotOtp.trim().length !== 6) {
      setErrorMsg('Vui lòng nhập đúng mã OTP gồm 6 chữ số.');
      setForgotOtpStatus('error');
      setForgotOtpShake((c) => c + 1);
      return;
    }
    if (!forgotNewPassword || !PASSWORD_REGEX.test(forgotNewPassword)) {
      setErrorMsg(PASSWORD_POLICY_MSG);
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.');
      return;
    }

    setLoading(true);
    setForgotOtpStatus('busy');
    try {
      const res = await resetPassword({
        resetToken: forgotResetToken,
        otpCode: forgotOtp.trim(),
        newPassword: forgotNewPassword,
        confirmNewPassword: forgotConfirmPassword,
      });

      setForgotOtpStatus('success');
      loginSuccessTimerRef.current = window.setTimeout(() => {
        loginSuccessTimerRef.current = null;
        setForgotOtpStatus('idle');
        setForgotSuccessMsg(res.message || 'Đặt lại mật khẩu thành công!');
        setForgotStep('SUCCESS');
        showToast('Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.', 'success');
        setLoginPassword(forgotNewPassword);
        setLoginIdentity(forgotIdentity);
      }, getOtpSuccessBeatMs());
    } catch (err: any) {
      setForgotOtpStatus('error');
      setForgotOtpShake((c) => c + 1);
      if (err.statusCode === 403) {
        setErrorMsg('Tài khoản của bạn đã bị khóa.');
        setLockReason(err.reason || 'Vui lòng liên hệ bộ phận hỗ trợ chăm sóc khách hàng để được mở khóa.');
      } else {
        setErrorMsg(err.message || 'Đặt lại mật khẩu thất bại. Vui lòng kiểm tra mã OTP.');
      }
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // API 9: POST /api/v1/auth/forgot-resend-otp
  // --------------------------------------------------------------------------
  const handleResendForgotOtp = async () => {
    if (forgotCountdown > 0 || forgotOtpStatus === 'success') return;
    setErrorMsg('');
    setForgotOtpStatus('idle');
    setLoading(true);
    try {
      const data = await resendForgotOtp(forgotResetToken);
      setForgotCountdown(data.cooldownSeconds || 60);
      setForgotOtp('');
      showToast('Mã OTP khôi phục mật khẩu mới đã được gửi lại.', 'info');
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể gửi lại mã OTP khôi phục lúc này.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-canvas border border-hairline-soft rounded-xxl p-6 sm:p-8 shadow-sticky space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <img
            src="/logo.png"
            alt="NextGen Smart Tech"
            className="w-14 h-14 rounded-2xl object-contain mx-auto border border-hairline-soft p-1 bg-canvas"
          />
          <h1 className="text-xl font-medium text-ink-deep tracking-tight">
            {activeTab === 'login' && 'Đăng nhập NextGen'}
            {activeTab === 'register' && 'Tạo tài khoản mới'}
            {activeTab === 'forgot' && 'Khôi phục mật khẩu'}
          </h1>
          <p className="text-xs text-steel">
            {activeTab === 'login' && 'Trải nghiệm mua sắm thiết bị di động chính hãng và bảo hành điện tử'}
            {activeTab === 'register' && 'Tạo tài khoản để nhận ưu đãi thành viên, lưu sổ địa chỉ và tự động tạo giỏ hàng'}
            {activeTab === 'forgot' && 'Lấy lại quyền truy cập tài khoản an toàn qua mã xác thực OTP 6 số'}
          </p>
        </div>

        {/* Thông báo chuyển hướng từ Giỏ hàng */}
        {redirect === '/cart' && (
          <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl p-3 text-xs flex items-center gap-2.5 text-left">
            <ShoppingBag size={18} className="text-blue-600 flex-shrink-0" />
            <div>
              <div className="font-bold">Đã lưu sản phẩm vào giỏ tạm thời!</div>
              <div className="text-[11px] text-blue-700">Vui lòng đăng nhập hoặc đăng ký tài khoản để đồng bộ giỏ hàng và thanh toán.</div>
            </div>
          </div>
        )}

        {/* Primary Switcher: Đăng nhập vs Đăng ký vs Quên mật khẩu */}
        {activeTab !== 'forgot' ? (
          <div className="grid grid-cols-2 bg-surface-soft p-1 rounded-full text-xs font-bold text-steel">
            <button
              onClick={() => switchTab('login')}
              disabled={loading || loginPhase !== 'idle'}
              className={`py-2 rounded-full transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'login' ? 'bg-ink-deep text-canvas shadow-xs' : 'hover:text-ink'
              }`}
            >
              <LogIn size={14} />
              <span>Đăng nhập</span>
            </button>
            <button
              onClick={() => switchTab('register')}
              disabled={loading || loginPhase !== 'idle'}
              className={`py-2 rounded-full transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'register' ? 'bg-ink-deep text-canvas shadow-xs' : 'hover:text-ink'
              }`}
            >
              <UserPlus size={14} />
              <span>Đăng ký mới</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between pb-1 border-b border-hairline-soft">
            <button
              type="button"
              disabled={loading}
              onClick={() => switchTab('login')}
              className="text-xs font-bold text-steel hover:text-ink-deep flex items-center gap-1.5 py-1 px-2.5 rounded-full hover:bg-surface-soft transition"
            >
              <ArrowLeft size={14} />
              <span>Quay lại Đăng nhập</span>
            </button>
            <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              Khôi phục mật khẩu
            </span>
          </div>
        )}

        {/* Cảnh báo lỗi */}
        {errorMsg && (
          <div className="p-3.5 bg-critical/5 border border-critical/30 text-critical text-xs rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle size={15} />
              <span>{errorMsg}</span>
            </div>
            {lockReason && (
              <p className="text-[11px] text-charcoal pl-5">
                Lý do khóa: <strong>{lockReason}</strong>
              </p>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: ĐĂNG NHẬP (API 1, 2, 3)                             */}
        {/* ========================================================= */}
        {activeTab === 'login' && (
          <div className="space-y-5">
            {!isOtpSent ? (
              /* Bước 1: API 1 - login-initiate (Lucian UX/UI #403 floating-field & morph button) */
              <div className="u403">
                <form onSubmit={handleInitiateLogin} className="u403-form" noValidate>
                  <div
                    className={`u403-f${loginFocus === 'identity' ? ' is-f' : ''}${
                      loginFocus === 'identity' || loginIdentity.length > 0 ? ' is-up' : ''
                    }${
                      loginFieldError === 'identity'
                        ? ` is-err ${loginShakeCount % 2 === 1 ? 'is-shake-a' : 'is-shake-b'}`
                        : ''
                    }`}
                  >
                    <input
                      ref={identityInputRef}
                      id={`${loginUid}-identity`}
                      type="text"
                      autoComplete="username"
                      spellCheck={false}
                      disabled={loginPhase !== 'idle'}
                      value={loginIdentity}
                      aria-invalid={loginFieldError === 'identity' ? 'true' : undefined}
                      aria-describedby={loginFieldError === 'identity' ? `${loginUid}-msg` : undefined}
                      onFocus={() => setLoginFocus('identity')}
                      onBlur={() => setLoginFocus((prev) => (prev === 'identity' ? null : prev))}
                      onChange={(e) => {
                        setLoginIdentity(e.target.value);
                        if (loginFieldError === 'identity') {
                          setLoginFieldError(null);
                          setLoginInlineError('');
                        }
                      }}
                      className="u403-in"
                    />
                    <label htmlFor={`${loginUid}-identity`}>Số điện thoại hoặc Email *</label>
                  </div>

                  <div
                    className={`u403-f u403-pw${loginFocus === 'password' ? ' is-f' : ''}${
                      loginFocus === 'password' || loginPassword.length > 0 ? ' is-up' : ''
                    }${
                      loginFieldError === 'password'
                        ? ` is-err ${loginShakeCount % 2 === 1 ? 'is-shake-a' : 'is-shake-b'}`
                        : ''
                    }`}
                  >
                    <input
                      ref={passwordInputRef}
                      id={`${loginUid}-password`}
                      type={showLoginPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      disabled={loginPhase !== 'idle'}
                      value={loginPassword}
                      aria-invalid={loginFieldError === 'password' ? 'true' : undefined}
                      aria-describedby={loginFieldError === 'password' ? `${loginUid}-msg` : undefined}
                      onFocus={() => setLoginFocus('password')}
                      onBlur={() => setLoginFocus((prev) => (prev === 'password' ? null : prev))}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        if (loginFieldError === 'password') {
                          setLoginFieldError(null);
                          setLoginInlineError('');
                        }
                      }}
                      className="u403-in"
                    />
                    <label htmlFor={`${loginUid}-password`}>Mật khẩu *</label>
                    <button
                      type="button"
                      disabled={loginPhase !== 'idle'}
                      aria-label={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      aria-pressed={showLoginPassword}
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      className="u403-eye"
                    >
                      <svg viewBox="0 0 20 20" aria-hidden="true">
                        <g className="lid">
                          <path d="M2 10s3-5.2 8-5.2S18 10 18 10s-3 5.2-8 5.2S2 10 2 10z" />
                          <circle cx="10" cy="10" r="2.4" />
                        </g>
                        <g className="lash">
                          <path d="M3 10.4c2 2.4 4.4 3.4 7 3.4s5-1 7-3.4M6 13l-1 1.6M10 14v1.8M14 13l1 1.6" />
                        </g>
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-2 pt-1.5 min-h-[26px]">
                    <p
                      id={`${loginUid}-msg`}
                      className={`u403-msg flex-1${loginInlineError ? ' is-on' : ''}`}
                      aria-live="polite"
                    >
                      {loginInlineError || '\u00A0'}
                    </p>
                    <button
                      type="button"
                      disabled={loading || loginPhase !== 'idle'}
                      onClick={() => {
                        setForgotIdentity(loginIdentity);
                        switchTab('forgot');
                      }}
                      className="text-[11px] font-bold text-primary hover:underline shrink-0 pt-1"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>

                  <button
                    type="submit"
                    aria-busy={loginPhase === 'busy' || undefined}
                    aria-disabled={loginPhase !== 'idle' || undefined}
                    className={`u403-go${loginPhase === 'busy' ? ' is-busy' : ''}${loginPhase === 'ok' ? ' is-ok' : ''}`}
                  >
                    <span>Đăng nhập</span>
                    <i aria-hidden="true" />
                    <svg viewBox="0 0 22 22" aria-hidden="true">
                      <path d="M5.5 11.5l4 4L17 7.5" />
                    </svg>
                  </button>
                </form>
                <p className="u403-live" role="status">
                  {loginPhase === 'busy'
                    ? 'Đang kiểm tra thông tin đăng nhập'
                    : loginPhase === 'ok'
                    ? 'Đăng nhập thành công'
                    : ''}
                </p>
              </div>
            ) : (
              /* Bước 2: API 2 & 3 - login-verify-otp & login-resend-otp */
              <form onSubmit={handleVerifyLoginOtp} className="space-y-5 text-xs text-center">
                <div className="space-y-2 pt-1">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20 shadow-2xs">
                    {loginChannel === 'PHONE' ? <Smartphone size={26} strokeWidth={2.2} /> : <Mail size={26} strokeWidth={2.2} />}
                  </div>
                  <h3 className="text-base font-bold text-ink-deep tracking-tight">
                    Xác thực mã bảo mật 6 số
                  </h3>
                  <p className="text-xs text-steel leading-relaxed">
                    Mã xác thực OTP đã được gửi qua {loginChannel === 'PHONE' ? 'SMS' : 'Email'} đến
                  </p>
                  <div className="pt-0.5">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-charcoal bg-surface-soft px-3.5 py-1 rounded-full border border-hairline-soft font-mono text-xs shadow-2xs">
                      {loginChannel === 'PHONE' ? <Smartphone size={13} className="text-primary" /> : <Mail size={13} className="text-primary" />}
                      <span>{loginTargetMasked || loginIdentity}</span>
                    </span>
                  </div>
                </div>

                {/* 6 Ô nhập OTP rời rạc */}
                <OtpInput
                  value={loginOtp}
                  onChange={(val) => {
                    setLoginOtp(val);
                    if (loginOtpStatus === 'error') setLoginOtpStatus('idle');
                  }}
                  disabled={loading}
                  status={loginOtpStatus}
                  shakeKey={loginOtpShake}
                  statusText={errorMsg && loginOtpStatus === 'error' ? errorMsg : undefined}
                  onComplete={(val) => handleVerifyLoginOtp(undefined, val)}
                />

                {/* Thời hạn hiệu lực và cooldown */}
                <div className="space-y-1 text-xs">
                  {loginExpiresIn > 0 && (
                    <div className="text-[11px] text-steel">
                      Mã có hiệu lực trong: <strong className="font-mono text-charcoal">{loginExpiresIn}s</strong>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-1.5 text-steel py-1">
                    <span>Chưa nhận được mã?</span>
                    {loginCountdown > 0 ? (
                      <span className="font-semibold text-steel flex items-center gap-1">
                        <Clock size={13} />
                        <span>Gửi lại sau <strong className="font-mono text-primary font-bold">{loginCountdown}s</strong></span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={loading || loginOtpStatus === 'success'}
                        onClick={handleResendLoginOtp}
                        className="text-primary font-bold hover:underline inline-flex items-center gap-1 transition"
                      >
                        <RotateCcw size={13} />
                        <span>Gửi lại mã ngay</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={loading || loginOtpStatus === 'success' || loginOtp.length !== 6}
                    className="btn-marketing w-full py-3 rounded-full text-xs font-bold shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    <span>Xác nhận & Đăng nhập</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading || loginOtpStatus === 'success'}
                    onClick={() => {
                      setIsOtpSent(false);
                      setLoginCountdown(0);
                      setLoginOtpStatus('idle');
                    }}
                    className="text-steel hover:text-ink-deep text-xs font-medium py-1.5 flex items-center justify-center gap-1.5 mx-auto transition"
                  >
                    <ArrowLeft size={13} />
                    <span>Quay lại đổi thông tin</span>
                  </button>
                </div>
              </form>
            )}

            <div className="text-center text-xs text-steel pt-2">
              Bạn chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => switchTab('register')}
                className="font-bold text-primary hover:underline"
              >
                Đăng ký ngay tại đây
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ĐĂNG KÝ TÀI KHOẢN (API 4, 5, 6)                     */}
        {/* ========================================================= */}
        {activeTab === 'register' && (
          <div className="space-y-5">
            {!isRegOtpStep ? (() => {
              const liveRegErrors = getRegisterErrors();
              const remainingBadCount = regSummaryKeys.filter((k) => Boolean(liveRegErrors[k])).length;
              const hasActiveSummary = regTried && remainingBadCount > 0;
              const shakeClass = regShakeCount > 0 ? (regShakeCount % 2 === 1 ? ' is-shake-a' : ' is-shake-b') : '';

              return (
                /* Bước 1: API 4 - register-initiate (Lucian UX/UI #244 smart validation & summary card) */
                <div className={`u244${hasActiveSummary ? ' is-err' : ''}`}>
                  <form onSubmit={handleInitiateRegister} noValidate aria-label="Biểu mẫu đăng ký tài khoản">
                    <div className="u244-sm" role="alert">
                      <div>
                        <div className="u244-sb">
                          <b>
                            <i aria-hidden="true">!</i>
                            <span>{remainingBadCount} mục cần kiểm tra lại</span>
                          </b>
                          <ul>
                            {regSummaryKeys.map((key) => {
                              const fixed = !liveRegErrors[key];
                              return (
                                <li key={key} className={fixed ? 'is-fixed' : undefined}>
                                  <button type="button" onClick={() => focusRegField(key)}>
                                    {REG_FIELD_LABELS[key]}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div
                      ref={(el) => { regBoxRefs.current.fullName = el; }}
                      className={`u244-fd${
                        regTried && liveRegErrors.fullName ? ` is-bad${shakeClass}` : ''
                      }${!liveRegErrors.fullName && regFullName.trim().length > 0 ? ' is-good' : ''}`}
                    >
                      <label htmlFor={`${regUid}-fullName`}>
                        Họ và tên <span className="text-critical">*</span>
                      </label>
                      <div className="u244-bx">
                        <input
                          ref={(el) => { regInputRefs.current.fullName = el; }}
                          id={`${regUid}-fullName`}
                          type="text"
                          autoComplete="name"
                          disabled={loading || regSubmitDone}
                          placeholder="Nhập họ và tên"
                          value={regFullName}
                          aria-invalid={regTried && Boolean(liveRegErrors.fullName)}
                          aria-describedby={`${regUid}-msg-fullName`}
                          onChange={(e) => setRegFullName(e.target.value)}
                          className="u244-in"
                        />
                        <span className="u244-ok" aria-hidden="true" />
                      </div>
                      <div className="u244-ms">
                        <div>
                          <span id={`${regUid}-msg-fullName`}>
                            {liveRegErrors.fullName || 'Vui lòng nhập họ và tên của bạn.'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      ref={(el) => { regBoxRefs.current.phone = el; }}
                      className={`u244-fd${
                        regTried && liveRegErrors.phone ? ` is-bad${shakeClass}` : ''
                      }${!liveRegErrors.phone && regPhone.trim().length > 0 ? ' is-good' : ''}`}
                    >
                      <label htmlFor={`${regUid}-phone`}>
                        Số điện thoại di động <span className="text-critical">*</span>
                      </label>
                      <div className="u244-bx">
                        <input
                          ref={(el) => { regInputRefs.current.phone = el; }}
                          id={`${regUid}-phone`}
                          type="tel"
                          autoComplete="tel"
                          disabled={loading || regSubmitDone}
                          placeholder="Nhập số điện thoại (10 số)"
                          value={regPhone}
                          aria-invalid={regTried && Boolean(liveRegErrors.phone)}
                          aria-describedby={`${regUid}-msg-phone`}
                          onChange={(e) => setRegPhone(e.target.value)}
                          className="u244-in font-mono"
                        />
                        <span className="u244-ok" aria-hidden="true" />
                      </div>
                      <div className="u244-ms">
                        <div>
                          <span id={`${regUid}-msg-phone`}>
                            {liveRegErrors.phone || 'Số điện thoại không đúng định dạng.'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      ref={(el) => { regBoxRefs.current.email = el; }}
                      className={`u244-fd${
                        regTried && liveRegErrors.email ? ` is-bad${shakeClass}` : ''
                      }${!liveRegErrors.email && regEmail.trim().length > 0 ? ' is-good' : ''}`}
                    >
                      <label htmlFor={`${regUid}-email`}>
                        Địa chỉ Email <span className="text-critical">*</span>
                      </label>
                      <div className="u244-bx">
                        <input
                          ref={(el) => { regInputRefs.current.email = el; }}
                          id={`${regUid}-email`}
                          type="email"
                          autoComplete="email"
                          disabled={loading || regSubmitDone}
                          placeholder="Nhập email nhận mã kích hoạt"
                          value={regEmail}
                          aria-invalid={regTried && Boolean(liveRegErrors.email)}
                          aria-describedby={`${regUid}-msg-email`}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="u244-in"
                        />
                        <span className="u244-ok" aria-hidden="true" />
                      </div>
                      <div className="u244-ms">
                        <div>
                          <span id={`${regUid}-msg-email`}>
                            {liveRegErrors.email || 'Vui lòng nhập định dạng email hợp lệ.'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-steel mt-1">
                        Hệ thống sẽ gửi mã OTP kích hoạt tài khoản trực tiếp về Email này.
                      </p>
                    </div>

                    <div
                      ref={(el) => { regBoxRefs.current.password = el; }}
                      className={`u244-fd${
                        regTried && liveRegErrors.password ? ` is-bad${shakeClass}` : ''
                      }${!liveRegErrors.password && regPassword.length > 0 ? ' is-good' : ''}`}
                    >
                      <label htmlFor={`${regUid}-password`}>
                        Mật khẩu <span className="text-critical">*</span>
                      </label>
                      <div className="u244-bx">
                        <input
                          ref={(el) => { regInputRefs.current.password = el; }}
                          id={`${regUid}-password`}
                          type={showRegPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          disabled={loading || regSubmitDone}
                          placeholder="Tối thiểu 8 ký tự (hoa, thường, số, đặc biệt)"
                          value={regPassword}
                          aria-invalid={regTried && Boolean(liveRegErrors.password)}
                          aria-describedby={`${regUid}-msg-password`}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="u244-in u244-in-pw"
                        />
                        <button
                          type="button"
                          disabled={loading || regSubmitDone}
                          aria-label={showRegPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          aria-pressed={showRegPassword}
                          onClick={() => setShowRegPassword((prev) => !prev)}
                          className="u244-eye"
                        >
                          {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <span className="u244-ok" aria-hidden="true" />
                      </div>
                      <div className="u244-ms">
                        <div>
                          <span id={`${regUid}-msg-password`}>
                            {liveRegErrors.password || PASSWORD_POLICY_MSG}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      ref={(el) => { regBoxRefs.current.confirmPassword = el; }}
                      className={`u244-fd${
                        regTried && liveRegErrors.confirmPassword ? ` is-bad${shakeClass}` : ''
                      }${
                        !liveRegErrors.confirmPassword && regConfirmPassword.length > 0 ? ' is-good' : ''
                      }`}
                    >
                      <label htmlFor={`${regUid}-confirmPassword`}>
                        Nhập lại mật khẩu <span className="text-critical">*</span>
                      </label>
                      <div className="u244-bx">
                        <input
                          ref={(el) => { regInputRefs.current.confirmPassword = el; }}
                          id={`${regUid}-confirmPassword`}
                          type={showRegConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          disabled={loading || regSubmitDone}
                          placeholder="Nhập lại mật khẩu của bạn"
                          value={regConfirmPassword}
                          aria-invalid={regTried && Boolean(liveRegErrors.confirmPassword)}
                          aria-describedby={`${regUid}-msg-confirmPassword`}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          className="u244-in u244-in-pw"
                        />
                        <button
                          type="button"
                          disabled={loading || regSubmitDone}
                          aria-label={showRegConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                          aria-pressed={showRegConfirmPassword}
                          onClick={() => setShowRegConfirmPassword((prev) => !prev)}
                          className="u244-eye"
                        >
                          {showRegConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <span className="u244-ok" aria-hidden="true" />
                      </div>
                      <div className="u244-ms">
                        <div>
                          <span id={`${regUid}-msg-confirmPassword`}>
                            {liveRegErrors.confirmPassword || 'Mật khẩu xác nhận không khớp.'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      ref={(el) => { regBoxRefs.current.terms = el; }}
                      className={`u244-ag${regTried && liveRegErrors.terms ? ` is-bad${shakeClass}` : ''}`}
                    >
                      <button
                        ref={(el) => { regInputRefs.current.terms = el; }}
                        type="button"
                        role="checkbox"
                        aria-checked={regAgreeTerms}
                        aria-label="Đồng ý điều khoản dịch vụ và chính sách bảo mật"
                        disabled={loading || regSubmitDone}
                        onClick={() => setRegAgreeTerms((prev) => !prev)}
                        className="u244-ag-ck"
                      />
                      <span
                        className="cursor-pointer select-none leading-relaxed"
                        onClick={() => {
                          if (!loading && !regSubmitDone) setRegAgreeTerms((prev) => !prev);
                        }}
                      >
                        Tôi đồng ý với{' '}
                        <Link
                          to="/faq"
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary underline font-medium"
                        >
                          Điều khoản dịch vụ
                        </Link>{' '}
                        và{' '}
                        <Link
                          to="/faq"
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary underline font-medium"
                        >
                          Chính sách bảo mật
                        </Link>{' '}
                        của NextGen.
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || regSubmitDone}
                      className={`u244-go${regSubmitDone ? ' is-done' : ''}`}
                    >
                      {regSubmitDone ? (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Đã gửi mã OTP kích hoạt!</span>
                        </>
                      ) : loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Đang gửi yêu cầu...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={15} />
                          <span>Tiếp tục: Nhận mã kích hoạt qua Email</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              );
            })() : (
              /* Bước 2: API 5 & 6 - register-verify-otp & register-resend-otp */
              <form onSubmit={handleConfirmRegister} className="space-y-5 text-xs text-center">
                <div className="space-y-2 pt-1">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20 shadow-2xs">
                    <Mail size={26} strokeWidth={2.2} />
                  </div>
                  <h3 className="text-base font-bold text-ink-deep tracking-tight">
                    Kích hoạt tài khoản thành viên
                  </h3>
                  <p className="text-xs text-steel leading-relaxed">
                    Mã xác thực 6 số kích hoạt đã được gửi về Email:
                  </p>
                  <div className="pt-0.5">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-charcoal bg-surface-soft px-3.5 py-1 rounded-full border border-hairline-soft font-mono text-xs shadow-2xs">
                      <Mail size={13} className="text-primary" />
                      <span>{regEmail}</span>
                    </span>
                  </div>
                </div>

                {/* 6 Ô nhập OTP rời rạc */}
                <OtpInput
                  value={regOtpCode}
                  onChange={(val) => {
                    setRegOtpCode(val);
                    if (regOtpStatus === 'error') setRegOtpStatus('idle');
                  }}
                  disabled={loading}
                  status={regOtpStatus}
                  shakeKey={regOtpShake}
                  statusText={errorMsg && regOtpStatus === 'error' ? errorMsg : undefined}
                  onComplete={(val) => handleConfirmRegister(undefined, val)}
                />

                <div className="space-y-1 text-xs">
                  {regExpiresIn > 0 && (
                    <div className="text-[11px] text-steel">
                      Hiệu lực mã: <strong className="font-mono text-charcoal">{regExpiresIn}s</strong>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-1.5 text-steel py-1">
                    <span>Chưa nhận được mã?</span>
                    {regCountdown > 0 ? (
                      <span className="font-semibold text-steel flex items-center gap-1">
                        <Clock size={13} />
                        <span>Gửi lại sau <strong className="font-mono text-primary font-bold">{regCountdown}s</strong></span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={loading || regOtpStatus === 'success'}
                        onClick={handleResendRegOtp}
                        className="text-primary font-bold hover:underline inline-flex items-center gap-1 transition"
                      >
                        <RotateCcw size={13} />
                        <span>Gửi lại mã ngay</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={loading || regOtpStatus === 'success' || regOtpCode.length !== 6}
                    className="btn-marketing w-full py-3.5 rounded-full text-xs font-bold shadow-xs flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    <span>Hoàn tất Đăng ký & Kích hoạt</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading || regOtpStatus === 'success'}
                    onClick={() => {
                      setIsRegOtpStep(false);
                      setRegCountdown(0);
                      setRegOtpStatus('idle');
                    }}
                    className="text-steel hover:text-ink-deep text-xs font-medium py-1.5 flex items-center justify-center gap-1.5 mx-auto transition"
                  >
                    <ArrowLeft size={13} />
                    <span>Quay lại chỉnh sửa thông tin</span>
                  </button>
                </div>
              </form>
            )}

            <div className="text-center text-xs text-steel pt-2">
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => switchTab('login')}
                className="font-bold text-primary hover:underline"
              >
                Đăng nhập ngay
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: QUÊN MẬT KHẨU (API 7, 8, 9)                         */}
        {/* ========================================================= */}
        {activeTab === 'forgot' && (
          <div className="space-y-5">
            {forgotStep === 'REQUEST' && (
              /* Bước 1: API 7 - forgot-password */
              <form onSubmit={handleRequestForgotOtp} className="space-y-4 text-xs">
                <div className="p-3.5 bg-surface-soft border border-hairline-soft rounded-xl text-charcoal text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-ink-deep">
                    <KeyRound size={14} className="text-primary" />
                    <span>Khôi phục mật khẩu qua OTP</span>
                  </div>
                  <p className="text-[11px] text-steel leading-relaxed">
                    Nhập số điện thoại hoặc email đã đăng ký. Hệ thống sẽ tự động gửi mã OTP xác thực qua SMS hoặc Email tương ứng.
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-charcoal mb-1.5">
                    Số điện thoại hoặc Email đã đăng ký:
                  </label>
                  <input
                    type="text"
                    required
                    disabled={loading}
                    placeholder="Nhập số điện thoại hoặc email của bạn"
                    value={forgotIdentity}
                    onChange={(e) => setForgotIdentity(e.target.value)}
                    className="w-full h-11 bg-canvas border border-hairline rounded-lg px-3.5 text-xs text-ink focus:border-2 focus:border-fb-blue focus:outline-none disabled:opacity-60"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => switchTab('login')}
                    className="btn-secondary py-3 px-4 text-xs font-bold rounded-full"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-marketing flex-1 py-3 text-xs font-bold rounded-full shadow-xs flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={14} />}
                    <span>Gửi mã OTP xác thực</span>
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'OTP_PASSWORD' && (
              /* Bước 2: API 8 & 9 - reset-password & forgot-resend-otp */
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
                <div className="space-y-2 text-center pb-1">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20 shadow-2xs">
                    <KeyRound size={22} />
                  </div>
                  <h3 className="text-sm font-bold text-ink-deep">
                    Xác thực đặt lại mật khẩu mới
                  </h3>
                  <div className="text-[12px] text-steel leading-relaxed">
                    Mã xác thực 6 số đã được gửi qua {forgotChannel === 'PHONE' ? 'SMS' : 'Email'} đến
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-charcoal bg-surface-soft px-3 py-1 rounded-full border border-hairline-soft font-mono text-xs shadow-2xs">
                        {forgotChannel === 'PHONE' ? <Smartphone size={13} className="text-primary" /> : <Mail size={13} className="text-primary" />}
                        <span>{forgotTargetMasked || forgotIdentity}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6 Ô nhập OTP rời rạc */}
                <OtpInput
                  value={forgotOtp}
                  onChange={(val) => {
                    setForgotOtp(val);
                    if (forgotOtpStatus === 'error') setForgotOtpStatus('idle');
                  }}
                  disabled={loading}
                  status={forgotOtpStatus}
                  shakeKey={forgotOtpShake}
                  statusText={errorMsg && forgotOtpStatus === 'error' ? errorMsg : undefined}
                />

                <div className="flex items-center justify-between text-xs py-1 px-1 bg-surface-soft/60 rounded-xl border border-hairline-soft/80 p-2.5">
                  <span className="text-steel">Chưa nhận được mã?</span>
                  {forgotCountdown > 0 ? (
                    <span className="text-steel font-medium flex items-center gap-1.5 text-[11px]">
                      <Clock size={13} className="text-steel" />
                      <span>Gửi lại sau <strong className="font-mono text-ink-deep font-bold">{forgotCountdown}s</strong></span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleResendForgotOtp}
                      className="text-primary font-bold hover:underline flex items-center gap-1.5 transition text-[11px]"
                    >
                      <RotateCcw size={13} />
                      <span>Gửi lại mã OTP</span>
                    </button>
                  )}
                </div>

                <div>
                  <label className="block font-medium text-charcoal mb-1.5">
                    Mật khẩu mới (tối thiểu 8 ký tự, gồm hoa, thường, số, ký tự đặc biệt):
                  </label>
                  <PasswordInput
                    required
                    disabled={loading}
                    placeholder="Nhập mật khẩu mới..."
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-medium text-charcoal mb-1.5">
                    Xác nhận mật khẩu mới:
                  </label>
                  <PasswordInput
                    required
                    disabled={loading}
                    placeholder="Nhập lại mật khẩu mới..."
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setForgotStep('REQUEST');
                      setForgotCountdown(0);
                    }}
                    className="btn-secondary py-3 px-4 text-xs font-bold rounded-full"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-marketing flex-1 py-3 text-xs font-bold rounded-full shadow-xs flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    <span>Lưu mật khẩu mới</span>
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'SUCCESS' && (
              <div className="py-4 text-center space-y-4 text-xs">
                <div className="w-14 h-14 bg-surface-soft text-success rounded-full flex items-center justify-center mx-auto border border-success/30">
                  <CheckCircle2 size={30} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-ink-deep text-base">Đặt lại mật khẩu thành công!</h3>
                  <p className="text-steel text-xs">
                    {forgotSuccessMsg || 'Mật khẩu mới của bạn đã có hiệu lực trên toàn hệ thống NextGen Smart Tech.'}
                  </p>
                </div>

                <div className="p-3 bg-surface-soft border border-hairline-soft rounded-xl text-left text-[11px] text-steel space-y-1">
                  <div>Tài khoản: <strong className="text-charcoal font-medium">{forgotIdentity}</strong></div>
                  <div>Nhật ký kiểm toán (Audit_Logs) và Thông báo bảo mật đã được ghi nhận.</div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    switchTab('login');
                    setLoginIdentity(forgotIdentity);
                  }}
                  className="btn-marketing w-full py-3 rounded-full text-xs font-bold shadow-xs flex items-center justify-center gap-2"
                >
                  <span>Đăng nhập ngay với mật khẩu mới</span>
                  <LogIn size={14} />
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
