import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Boxes, 
  Package, 
  TicketPercent, 
  Users, 
  MessageSquare, 
  History, 
  ExternalLink, 
  ShieldCheck, 
  Bell, 
  Store,
  ChevronRight,
  Menu,
  X,
  Truck,
  RotateCcw,
  FolderTree,
  Award,
  HelpCircle,
  AlertTriangle,
  LucideIcon
} from 'lucide-react';

import { sharedStore } from '../services/sharedStore';
import { useAuthStore } from '../stores/authStore';
import { PortalDashboardView } from './portal/PortalDashboardView';
import { PortalOrdersView } from './portal/PortalOrdersView';
import { PortalInventoryView } from './portal/PortalInventoryView';
import { PortalProductsView } from './portal/PortalProductsView';
import { PortalPromotionsView } from './portal/PortalPromotionsView';
import { PortalUsersView } from './portal/PortalUsersView';
import { PortalReviewsTicketsView } from './portal/PortalReviewsTicketsView';
import { PortalAuditLogView } from './portal/PortalAuditLogView';
import { PortalCategoriesView } from './portal/PortalCategoriesView';
import { PortalBrandsView } from './portal/PortalBrandsView';
import { PortalShipmentsView } from './portal/PortalShipmentsView';
import { PortalReturnRequestsView } from './portal/PortalReturnRequestsView';
import { PortalFaqManagerView } from './portal/PortalFaqManagerView';

type PortalTab = 
  | 'DASHBOARD' 
  | 'ORDERS' 
  | 'SHIPMENTS'
  | 'RETURNS'
  | 'INVENTORY' 
  | 'PRODUCTS' 
  | 'CATEGORIES'
  | 'BRANDS'
  | 'PROMOTIONS' 
  | 'USERS' 
  | 'REVIEWS' 
  | 'FAQS'
  | 'AUDIT';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class PortalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Portal ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-slate-800 space-y-4">
          <div className="flex items-center gap-3 text-rose-600">
            <AlertTriangle size={24} />
            <h2 className="text-lg font-bold">Đã xảy ra lỗi khi hiển thị giao diện này</h2>
          </div>
          <p className="text-sm text-slate-600">
            Dữ liệu lưu trữ trình duyệt (localStorage) có thể đang chứa cấu trúc dữ liệu không đồng bộ hoặc bị lỗi tạm thời.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => {
                sharedStore.resetToDefault();
                window.location.reload();
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow-xs"
            >
              Đặt lại dữ liệu mẫu chuẩn & Tải lại
            </button>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition"
            >
              Thử lại màn hình này
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AdminPortalPage: React.FC = () => {
  const { user, isAuthenticated, token } = useAuthStore();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // 1. Nếu chưa đăng nhập hoặc phiên làm việc đã hết hạn -> chuyển hướng đến trang đăng nhập (kèm redirect param)
  if (!user || !isAuthenticated || !token) {
    return <Navigate to="/auth?redirect=/admin" replace />;
  }

  // 2. Chỉ tài khoản ADMIN hoặc STAFF mới được vào Portal, tài khoản CUSTOMER bị chặn -> về trang chủ
  if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
    return <Navigate to="/" replace />;
  }

  const userRole = user.role;
  const isAdmin = userRole === 'ADMIN';
  const isStaffOnly = userRole === 'STAFF';

  // Khởi tạo tab mặc định theo vai trò: Admin -> DASHBOARD, Staff -> ORDERS
  const [activeTab, setActiveTab] = useState<PortalTab>(() => {
    return isAdmin ? 'DASHBOARD' : 'ORDERS';
  });

  // Tự động bảo vệ: nếu tài khoản là STAFF mà activeTab trỏ vào mục chỉ dành cho ADMIN -> fallback về ORDERS
  useEffect(() => {
    if (isStaffOnly) {
      const adminOnlyTabs: PortalTab[] = ['DASHBOARD', 'PROMOTIONS', 'USERS', 'AUDIT'];
      if (adminOnlyTabs.includes(activeTab)) {
        setActiveTab('ORDERS');
      }
    }
  }, [isStaffOnly, activeTab]);

  interface NavSection {
    sectionTitle: string;
    items: {
      id: PortalTab;
      label: string;
      icon: LucideIcon;
      badge?: string;
      adminOnly?: boolean;
      description?: string;
    }[];
  }

  const navSections: NavSection[] = [
    {
      sectionTitle: 'Tổng quan & Báo cáo',
      items: [
        { id: 'DASHBOARD', label: 'Bảng tổng quan', icon: LayoutDashboard, adminOnly: true, description: 'KPI tài chính & vận hành' },
      ]
    },
    {
      sectionTitle: 'Quản trị Đơn hàng & Vận chuyển',
      items: [
        { id: 'ORDERS', label: 'Điều phối Đơn hàng', icon: ShoppingCart, description: 'Quy trình xử lý đơn hàng' },
        { id: 'SHIPMENTS', label: 'Quản lý Vận đơn', icon: Truck, description: 'Theo dõi GHN/ViettelPost & sự cố' },
        { id: 'RETURNS', label: 'Đổi trả & Hoàn hàng', icon: RotateCcw, description: 'Biên bản giám định RMA 30 ngày' },
      ]
    },
    {
      sectionTitle: 'Catalog & Tồn kho',
      items: [
        { id: 'INVENTORY', label: 'Kho hàng & Kiểm kê', icon: Boxes, description: 'Tồn kho khả dụng & kiểm kê' },
        { id: 'PRODUCTS', label: 'Sản phẩm & Biến thể', icon: Package, description: 'Catalog đa SKU, ảnh & thông số' },
        { id: 'CATEGORIES', label: 'Quản lý Danh mục', icon: FolderTree, description: 'Phân cấp cây danh mục cha/con' },
        { id: 'BRANDS', label: 'Quản lý Thương hiệu', icon: Award, description: 'Hãng đối tác & logo thương hiệu' },
        { id: 'PROMOTIONS', label: 'Voucher & Khuyến mãi', icon: TicketPercent, adminOnly: true, description: 'Chương trình chiết khấu' },
      ]
    },
    {
      sectionTitle: 'Hệ thống & Khách hàng',
      items: [
        { id: 'USERS', label: 'Người dùng & Phân quyền', icon: Users, adminOnly: true, description: 'Quản lý tài khoản RBAC' },
        { id: 'REVIEWS', label: 'Đánh giá & Hỗ trợ', icon: MessageSquare, description: 'Phản hồi khách hàng & ticket' },
        { id: 'FAQS', label: 'Quản lý FAQ', icon: HelpCircle, description: 'Biên tập câu hỏi trợ giúp CSKH' },
        { id: 'AUDIT', label: 'Nhật ký Kiểm toán', icon: History, adminOnly: true, description: 'Vết lịch sử thay đổi' },
      ]
    }
  ];

  const currentTabInfo = navSections.flatMap(s => s.items).find(item => item.id === activeTab);

  return (
    <div className="min-h-screen bg-surface-soft flex flex-col font-sans text-ink antialiased">
      
      {/* Top Navbar */}
      <header className="bg-canvas text-ink sticky top-0 z-40 border-b border-hairline-soft shadow-xs backdrop-blur-xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-2 text-steel hover:text-ink rounded-full hover:bg-surface-soft transition"
              aria-label="Toggle Navigation"
            >
              {isMobileSidebarOpen? <X size={20} />: <Menu size={20} />}
            </button>

            <Link to="/" className="flex items-center gap-2.5 group">
              <img
                src="/logo.png"
                alt="NextGen Smart Tech"
                className="w-9 h-9 rounded-xl object-contain bg-surface-soft p-0.5 border border-hairline-soft group-hover:scale-105 transition-transform"
              />
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-wider text-charcoal">
                  NEXT<span className="text-primary">GEN</span>
                </span>
                <span className="bg-surface-soft text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-widest uppercase">
                  PORTAL
                </span>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-hairline-soft text-xs text-steel">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
              <span className="font-medium text-charcoal">Phân hệ Quản trị & Điều phối Bán lẻ</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* RBAC Role Indicator Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-surface-soft border border-hairline-soft px-3 py-1.5 rounded-full text-xs">
              <ShieldCheck size={14} className={userRole === 'ADMIN'? 'text-attention': 'text-primary'} />
              <span className="text-steel text-[11px] font-medium">Vai trò:</span>
              <span className={`font-bold uppercase text-[11px] tracking-wide ${
                userRole === 'ADMIN'? 'text-attention': 'text-primary'
              }`}>
                {userRole === 'ADMIN'? 'Quản trị viên': 'Nhân viên vận hành'}
              </span>
            </div>

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-charcoal hover:text-ink bg-canvas hover:bg-surface-soft border border-hairline-soft rounded-full transition"
              title="Mở giao diện mua sắm Storefront"
            >
              <Store size={14} className="text-primary" />
              <span className="hidden md:inline">Xem Cửa hàng</span>
              <ExternalLink size={12} className="text-steel" />
            </Link>

            {/* User Profile Badge */}
            <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-hairline-soft">
              <div className="w-8 h-8 rounded-full bg-surface-soft border border-hairline-soft text-ink font-bold text-xs flex items-center justify-center">
                {user.fullName.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-ink-deep line-clamp-1">{user.fullName}</div>
                <div className="text-[10px] text-steel font-mono">{user.phone}</div>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* Main Body with Sidebar & Content */}
      <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 flex gap-6 items-start">
        
        {/* Desktop Sidebar */}
        <aside className="w-64 bg-canvas border border-hairline-soft rounded-xxl p-3.5 shadow-none flex-shrink-0 hidden lg:block sticky top-22">
          
          <div className="space-y-5">
            {navSections.map((section, idx) => {
              const visibleItems = section.items.filter(item =>!(isStaffOnly && item.adminOnly));
              if (visibleItems.length === 0) return null;

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="text-[10px] font-bold text-steel uppercase tracking-wider px-3 py-1">
                    {section.sectionTitle}
                  </div>

                  <nav className="space-y-1">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-semibold transition-all text-left group ${
                            isActive? 'bg-ink-deep text-canvas shadow-xs font-bold': 'text-charcoal hover:bg-surface-soft hover:text-ink'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon size={16} className={`flex-shrink-0 transition-colors ${
                              isActive? 'text-canvas': 'text-steel group-hover:text-charcoal'
                            }`} />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {item.badge && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex-shrink-0 ${
                              isActive? 'bg-canvas/20 text-canvas': 'bg-surface-soft text-steel group-hover:bg-hairline-soft'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Mobile Sidebar Modal */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 bg-ink-deep/60 backdrop-blur-xs lg:hidden flex">
            <div className="w-72 bg-canvas h-full p-5 space-y-5 shadow-2xl overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
                <div className="flex items-center gap-2">
                  <img
                    src="/logo.png"
                    alt="NextGen Smart Tech"
                    className="w-7 h-7 rounded-lg object-contain bg-surface-soft p-0.5 border border-hairline-soft"
                  />
                  <span className="font-bold text-sm text-ink-deep">NEXTGEN PORTAL</span>
                </div>
                <button 
                  onClick={() => setIsMobileSidebarOpen(false)} 
                  className="p-1.5 text-steel hover:text-ink rounded-full hover:bg-surface-soft transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {navSections.map((section, idx) => {
                  const visibleItems = section.items.filter(item =>!(isStaffOnly && item.adminOnly));
                  if (visibleItems.length === 0) return null;

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="text-[10px] font-bold text-steel uppercase tracking-wider px-2">
                        {section.sectionTitle}
                      </div>
                      <nav className="space-y-1">
                        {visibleItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                setActiveTab(item.id);
                                setIsMobileSidebarOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-semibold text-left transition ${
                                isActive? 'bg-ink-deep text-canvas font-bold': 'text-charcoal hover:bg-surface-soft'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Icon size={16} />
                                <span>{item.label}</span>
                              </div>
                              {item.badge && (
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                  isActive? 'bg-canvas/20 text-canvas': 'bg-surface-soft text-steel'
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </nav>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex-1" onClick={() => setIsMobileSidebarOpen(false)} />
          </div>
        )}

        {/* Dynamic Content Panel */}
        <main className="flex-1 min-w-0">
          <PortalErrorBoundary key={activeTab}>
            {activeTab === 'DASHBOARD' && isAdmin && <PortalDashboardView />}
            {activeTab === 'ORDERS' && <PortalOrdersView />}
            {activeTab === 'SHIPMENTS' && <PortalShipmentsView />}
            {activeTab === 'RETURNS' && <PortalReturnRequestsView />}
            {activeTab === 'INVENTORY' && <PortalInventoryView />}
            {activeTab === 'PRODUCTS' && <PortalProductsView />}
            {activeTab === 'CATEGORIES' && <PortalCategoriesView />}
            {activeTab === 'BRANDS' && <PortalBrandsView />}
            {activeTab === 'PROMOTIONS' && isAdmin && <PortalPromotionsView />}
            {activeTab === 'USERS' && isAdmin && <PortalUsersView />}
            {activeTab === 'REVIEWS' && <PortalReviewsTicketsView />}
            {activeTab === 'FAQS' && <PortalFaqManagerView />}
            {activeTab === 'AUDIT' && isAdmin && <PortalAuditLogView />}
          </PortalErrorBoundary>
        </main>

      </div>

    </div>
  );
};
