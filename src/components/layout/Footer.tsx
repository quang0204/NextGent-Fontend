import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  CreditCard, 
  RotateCcw, 
  Truck, 
  Headphones,
  GraduationCap,
  Award,
  CheckCircle2,
  ChevronRight,
  QrCode,
  Wallet
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-canvas border-t border-hairline-soft mt-16 text-sm text-steel">
      
      {/* Main Footer Links (DESIGN-meta footer-region) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-10">
        
        {/* Col 1: Thương hiệu & Thông tin liên hệ */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="NextGen Smart Tech" 
              className="w-11 h-11 rounded-xl object-contain border border-hairline-soft shadow-xs" 
            />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-ink-deep tracking-tight leading-none">
                Next<span className="text-primary">Gen</span>
              </span>
              <span className="text-[10px] text-steel font-bold tracking-widest uppercase mt-1">
                Smart Tech Retail
              </span>
            </div>
          </div>
          <p className="text-xs text-charcoal leading-relaxed">
            Hệ thống bán lẻ thiết bị di động chuẩn hóa thương mại điện tử, tối ưu hóa quy trình giữ chỗ kho khả dụng và kiểm soát vận hành thời gian thực.
          </p>
          <div className="text-xs space-y-2.5 pt-1">
            <div className="flex items-start gap-2.5 text-charcoal">
              <MapPin size={15} className="text-primary flex-shrink-0 mt-0.5" />
              <span>Kho trung tâm: Hà Nội & TP. Hồ Chí Minh</span>
            </div>
            <a 
              href="tel:18006018" 
              className="flex items-center gap-2.5 text-charcoal hover:text-primary font-medium transition-colors"
            >
              <Phone size={15} className="text-success flex-shrink-0" />
              <span>Tổng đài CSKH: <strong className="text-ink-deep">1800 6018</strong> (Miễn phí)</span>
            </a>
            <a 
              href="mailto:hou.edu.vn" 
              className="flex items-center gap-2.5 text-charcoal hover:text-primary transition-colors"
            >
              <Mail size={15} className="text-primary flex-shrink-0" />
              <span>hou.edu.vn</span>
            </a>
          </div>
        </div>

        {/* Col 2: Chính sách & Dịch vụ */}
        <div>
          <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Chính sách & Dịch vụ
          </h4>
          <ul className="space-y-2.5 text-xs text-charcoal">
            <li>
              <Link to="/faq" className="hover:text-primary hover:translate-x-1 transition-all inline-flex items-center gap-1.5 group">
                <ChevronRight size={12} className="text-hairline group-hover:text-primary transition-colors" />
                <span>Chính sách bảo hành thiết bị chính hãng</span>
              </Link>
            </li>
            <li>
              <Link to="/orders" className="hover:text-primary hover:translate-x-1 transition-all inline-flex items-center gap-1.5 group">
                <ChevronRight size={12} className="text-hairline group-hover:text-primary transition-colors" />
                <span>Quy trình đổi trả 1-1 trong 30 ngày</span>
              </Link>
            </li>
            <li>
              <Link to="/faq" className="hover:text-primary hover:translate-x-1 transition-all inline-flex items-center gap-1.5 group">
                <ChevronRight size={12} className="text-hairline group-hover:text-primary transition-colors" />
                <span>Chính sách giao nhận & đồng kiểm COD</span>
              </Link>
            </li>
            <li>
              <Link to="/orders" className="hover:text-primary hover:translate-x-1 transition-all inline-flex items-center gap-1.5 group">
                <ChevronRight size={12} className="text-hairline group-hover:text-primary transition-colors" />
                <span>Đơn hàng của tôi & Tra cứu vận đơn</span>
              </Link>
            </li>
            <li>
              <Link to="/faq" className="hover:text-primary hover:translate-x-1 transition-all inline-flex items-center gap-1.5 group">
                <ChevronRight size={12} className="text-primary font-bold transition-colors" />
                <span className="font-bold text-ink-deep">Hỏi đáp thường gặp & CSKH (FAQ)</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Thanh toán & Vận chuyển */}
        <div className="space-y-5">
          <div>
            <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-3 flex items-center gap-2">
              <CreditCard size={14} className="text-primary" />
              Phương thức thanh toán
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="px-2.5 py-1.5 bg-surface-soft/80 border border-hairline-soft rounded-lg font-medium text-ink flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Tiền mặt COD
              </span>
              <span className="px-2.5 py-1.5 bg-surface-soft/80 border border-hairline-soft rounded-lg font-medium text-ink flex items-center gap-1.5">
                <QrCode size={12} className="text-primary" />
                Chuyển khoản QR
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-ink-deep uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Truck size={14} className="text-primary" />
              Đơn vị vận chuyển liên kết
            </h4>
            <p className="text-xs text-charcoal leading-relaxed mb-2">
              Hợp tác đối tác giao vận hàng đầu: Hỏa tốc 2H nội thành, Viettel Post, Giao Hàng Tiết Kiệm (GHTK) phủ sóng 63 tỉnh thành.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-steel font-bold flex-wrap">
              <span className="bg-surface-soft px-2 py-0.5 rounded border border-hairline-soft">Giao nhanh 2H</span>
              <span className="bg-surface-soft px-2 py-0.5 rounded border border-hairline-soft">Viettel Post</span>
              <span className="bg-surface-soft px-2 py-0.5 rounded border border-hairline-soft">GHTK Toàn quốc</span>
            </div>
          </div>
        </div>

        {/* Col 4: Thẻ Đồ án Khóa luận Tốt nghiệp CNTT */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-surface-soft via-canvas to-primary/5 p-5 shadow-xs">
          {/* Subtle decorative glow */}
          <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-primary/10 blur-xl pointer-events-none" />

          {/* Academic Header Badge */}
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary text-canvas flex items-center justify-center shadow-xs">
              <GraduationCap size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary block leading-none">
                Đồ án Tốt nghiệp
              </span>
              <h4 className="font-bold text-ink-deep text-xs mt-0.5">
                Cử nhân Công nghệ Thông tin
              </h4>
            </div>
          </div>

          {/* University & Faculty */}
          <div className="space-y-0.5 mb-3 pb-3 border-b border-hairline-soft/80 text-xs">
            <div className="font-bold text-ink-deep">
              Trường Đại học Mở Hà Nội
            </div>
            <div className="text-steel text-[11px]">
              Khoa Công nghệ Thông tin
            </div>
          </div>

          {/* Thesis Code Chip */}
          <div className="bg-canvas border border-primary/20 rounded-xl p-2.5 mb-3 shadow-2xs">
            <div className="text-[10px] text-steel font-medium mb-1 flex items-center justify-between">
              <span>Mã đề tài nghiên cứu:</span>
              <CheckCircle2 size={12} className="text-success" />
            </div>
            <div className="font-mono font-black text-ink-deep text-xs tracking-wider select-all bg-surface-soft/80 px-2 py-1 rounded-md border border-hairline-soft inline-block w-full text-center">
              KLVLVHHK1262704
            </div>
          </div>

          {/* Scope and Technical Specifications */}
          <div className="text-[11px] text-charcoal/90 leading-relaxed space-y-1">
            
            
          </div>

          {/* Academic Footer Tag */}
          <div className="mt-3 pt-2.5 border-t border-hairline-soft/60 flex items-center justify-between text-[10px] text-steel">
            <span>Niên khóa: <strong>2022 - 2026</strong></span>
            <span className="text-primary font-bold">Hội đồng chấm 2026</span>
          </div>
        </div>

      </div>

      {/* Copyright & System Status */}
      <div className="bg-surface-soft/50 py-4 px-4 sm:px-6 border-t border-hairline-soft">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-steel">
          <div>
            © 2026 NextGen Smart Tech. Nền tảng bán lẻ thiết bị di động thông minh.
          </div>
          <div className="flex items-center gap-4 text-[11px] flex-wrap justify-center">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Hệ thống trực tuyến 24/7</span>
            </span>
            <span className="text-hairline">|</span>
            <span>Bảo mật SSL 256-bit</span>
            <span className="text-hairline">|</span>
            <span className="font-mono font-bold text-ink-deep">Phiên bản 2.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
