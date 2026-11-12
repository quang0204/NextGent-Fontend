import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCheck, 
  Package, 
  Tag, 
  Info, 
  Trash2, 
  Check, 
  ArrowLeft,
  Filter
} from 'lucide-react';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';
import { NotificationType } from '../types/notification';

export const NotificationsPage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    loadNotifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotificationStore();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | NotificationType>('ALL');
  const navigate = useNavigate();

  const effectiveUserId = user?.userId ?? (isAuthenticated ? 1 : null);

  useEffect(() => {
    if (isAuthenticated && effectiveUserId) {
      loadNotifications(effectiveUserId);
    }
  }, [isAuthenticated, effectiveUserId]);

  useEffect(() => {
    const handleUpdate = () => {
      if (isAuthenticated && effectiveUserId) {
        loadNotifications(effectiveUserId);
      }
    };
    window.addEventListener('notification:updated', handleUpdate);
    return () => {
      window.removeEventListener('notification:updated', handleUpdate);
    };
  }, [isAuthenticated, effectiveUserId]);

  const formatNotifDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString('vi-VN');
    } catch {
      return dateStr;
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-surface-soft border border-hairline-soft flex items-center justify-center mx-auto text-steel">
          <Bell size={28} />
        </div>
        <h2 className="text-xl font-medium text-ink-deep">Vui lòng đăng nhập</h2>
        <p className="text-xs text-steel">Bạn cần đăng nhập để theo dõi các thông báo đơn hàng và ưu đãi dành riêng cho bạn.</p>
        <Link to="/auth?mode=login" className="btn-marketing inline-block text-xs font-bold px-6 py-2.5 rounded-full mt-2">
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'UNREAD') return !item.isRead;
    return item.type === activeFilter;
  });

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'ORDER':
        return <Package size={17} className="text-primary flex-shrink-0" />;
      case 'PROMO':
        return <Tag size={17} className="text-attention flex-shrink-0" />;
      case 'SYSTEM':
      default:
        return <Info size={17} className="text-steel flex-shrink-0" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      
      {/* Top Header Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline-soft">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-xs text-steel hover:text-primary transition flex items-center gap-1 font-medium">
              <ArrowLeft size={13} />
              <span>Trang chủ</span>
            </Link>
            <span className="text-hairline">/</span>
            <span className="text-xs font-bold text-ink-deep">Trung tâm thông báo</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-deep flex items-center gap-2.5">
            <Bell size={22} className="text-primary" />
            <span>Thông báo của bạn</span>
            {unreadCount > 0 && (
              <span className="text-xs bg-primary text-on-primary font-bold px-2.5 py-0.5 rounded-full">
                {unreadCount} chưa đọc
              </span>
            )}
          </h1>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="btn-secondary self-start sm:self-auto py-2 px-4 text-xs font-bold rounded-full flex items-center gap-1.5 shadow-xs"
          >
            <CheckCheck size={14} className="text-primary" />
            <span>Đánh dấu tất cả đã đọc</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-hairline-soft scrollbar-none text-xs">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-full font-bold transition whitespace-nowrap ${
            activeFilter === 'ALL'
              ? 'bg-ink-deep text-canvas'
              : 'bg-surface-soft text-charcoal hover:bg-hairline-soft'
          }`}
        >
          Tất cả ({notifications.length})
        </button>

        <button
          onClick={() => setActiveFilter('UNREAD')}
          className={`px-3.5 py-1.5 rounded-full font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
            activeFilter === 'UNREAD'
              ? 'bg-ink-deep text-canvas'
              : 'bg-surface-soft text-charcoal hover:bg-hairline-soft'
          }`}
        >
          <span>Chưa đọc</span>
          {unreadCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-critical text-on-primary text-[10px] flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveFilter('ORDER')}
          className={`px-3.5 py-1.5 rounded-full font-bold transition whitespace-nowrap ${
            activeFilter === 'ORDER'
              ? 'bg-ink-deep text-canvas'
              : 'bg-surface-soft text-charcoal hover:bg-hairline-soft'
          }`}
        >
          Đơn hàng & Giao vận
        </button>

        <button
          onClick={() => setActiveFilter('PROMO')}
          className={`px-3.5 py-1.5 rounded-full font-bold transition whitespace-nowrap ${
            activeFilter === 'PROMO'
              ? 'bg-ink-deep text-canvas'
              : 'bg-surface-soft text-charcoal hover:bg-hairline-soft'
          }`}
        >
          Ưu đãi & Khuyến mãi
        </button>

        <button
          onClick={() => setActiveFilter('SYSTEM')}
          className={`px-3.5 py-1.5 rounded-full font-bold transition whitespace-nowrap ${
            activeFilter === 'SYSTEM'
              ? 'bg-ink-deep text-canvas'
              : 'bg-surface-soft text-charcoal hover:bg-hairline-soft'
          }`}
        >
          Hệ thống & Tài khoản
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-canvas border border-hairline-soft rounded-2xl shadow-sticky overflow-hidden divide-y divide-hairline-soft">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-steel">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span>Đang đồng bộ dữ liệu thông báo...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-16 text-center text-xs text-steel space-y-2">
            <Bell size={32} className="mx-auto text-steel/40 mb-2" />
            <h3 className="text-sm font-bold text-ink-deep">Không tìm thấy thông báo nào</h3>
            <p className="max-w-xs mx-auto text-steel">
              {activeFilter === 'UNREAD' 
                ? 'Tuyệt vời! Bạn đã đọc toàn bộ các thông báo quan trọng.'
                : 'Chưa có thông báo nào trong danh mục đã chọn.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => (
            <div
              key={item.notificationId}
              className={`p-4 sm:p-5 text-xs transition flex flex-col sm:flex-row sm:items-start justify-between gap-4 group hover:bg-surface-soft/60 ${
                !item.isRead ? 'bg-primary/[0.03]' : 'bg-canvas'
              }`}
            >
              <div className="flex gap-3.5 items-start flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-surface-soft flex items-center justify-center flex-shrink-0 border border-hairline-soft mt-0.5">
                  {getNotificationIcon(item.type)}
                </div>

                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`text-sm tracking-tight ${!item.isRead ? 'font-bold text-ink-deep' : 'font-semibold text-charcoal'}`}>
                      {item.title}
                    </h4>
                    {!item.isRead && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        Mới
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-steel leading-relaxed">
                    {item.content}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-steel/80 pt-1">
                    <span>
                      {formatNotifDate(item.createdAt)}
                    </span>

                    {item.orderCode && (
                      <>
                        <span className="text-hairline">•</span>
                        <button
                          onClick={() => navigate(`/orders?code=${item.orderCode}`)}
                          className="text-primary font-bold font-mono hover:underline inline-flex items-center gap-1"
                        >
                          <Package size={12} />
                          <span>Chi tiết đơn #{item.orderCode} &rarr;</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 self-end sm:self-start flex-shrink-0 pt-2 sm:pt-0">
                {!item.isRead && (
                  <button
                    onClick={() => markAsRead(item.notificationId)}
                    className="p-1.5 text-steel hover:text-primary rounded-lg hover:bg-surface-soft transition"
                    title="Đánh dấu đã đọc"
                  >
                    <Check size={16} />
                  </button>
                )}
                <button
                  onClick={() => deleteNotification(item.notificationId)}
                  className="p-1.5 text-steel hover:text-critical rounded-lg hover:bg-surface-soft transition"
                  title="Xóa thông báo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
