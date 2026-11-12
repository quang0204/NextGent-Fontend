import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Package, Tag, Info, ChevronRight } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';
import { useAuthStore } from '../../stores/authStore';
import { NotificationItem, NotificationType } from '../../types/notification';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { user, isAuthenticated } = useAuthStore();
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    loadNotifications, 
    markAsRead, 
    markAllAsRead, 
    clearOnLogout 
  } = useNotificationStore();

  const effectiveUserId = user?.userId ?? (isAuthenticated ? 1 : null);

  useEffect(() => {
    if (isAuthenticated && effectiveUserId) {
      loadNotifications(effectiveUserId);
    } else {
      clearOnLogout();
    }
  }, [isAuthenticated, effectiveUserId]);

  // Lắng nghe sự kiện cập nhật thông báo toàn hệ thống (Real-time custom event)
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

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await markAsRead(item.notificationId);
    }
    setIsOpen(false);
    if (item.orderCode) {
      navigate(`/orders?code=${item.orderCode}`);
    } else if (item.orderId) {
      navigate(`/orders?code=${item.orderId}`);
    } else {
      navigate('/notifications');
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'ORDER':
        return <Package size={15} className="text-primary flex-shrink-0" />;
      case 'PROMO':
        return <Tag size={15} className="text-attention flex-shrink-0" />;
      case 'SYSTEM':
      default:
        return <Info size={15} className="text-steel flex-shrink-0" />;
    }
  };

  const formatNotifDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return `${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, ${d.toLocaleDateString('vi-VN')}`;
    } catch {
      return dateStr;
    }
  };

  const latestFive = notifications.slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next && isAuthenticated && effectiveUserId) {
            loadNotifications(effectiveUserId);
          }
        }}
        className="btn-icon-circular relative text-ink hover:text-ink-deep hover:bg-surface-soft transition"
        title="Trung tâm Thông báo"
        aria-label="Thông báo"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-critical text-on-primary text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-canvas border border-hairline-soft rounded-2xl shadow-summary p-0 z-50 animate-in fade-in duration-150 overflow-hidden">
          {/* Header */}
          <div className="p-3.5 border-b border-hairline-soft flex items-center justify-between bg-surface-soft/50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-ink-deep uppercase tracking-wider">Thông báo</span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 transition"
                title="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck size={13} />
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-hairline-soft">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-steel">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Đang tải thông báo...</span>
              </div>
            ) : latestFive.length === 0 ? (
              <div className="p-8 text-center text-xs text-steel space-y-1">
                <Bell size={24} className="mx-auto text-steel/50 mb-1" />
                <p className="font-bold text-charcoal">Không có thông báo mới</p>
                <p className="text-[11px]">Các cập nhật đơn hàng và khuyến mãi sẽ xuất hiện tại đây.</p>
              </div>
            ) : (
              latestFive.map((item) => (
                <div
                  key={item.notificationId}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 text-xs transition cursor-pointer flex gap-3 items-start group hover:bg-surface-soft ${
                    !item.isRead ? 'bg-primary/5 font-medium' : 'bg-canvas text-charcoal'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-surface-soft flex items-center justify-center flex-shrink-0 mt-0.5 border border-hairline-soft">
                    {getNotificationIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs truncate ${!item.isRead ? 'font-bold text-ink-deep' : 'text-ink font-semibold'}`}>
                        {item.title}
                      </span>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-steel line-clamp-2 leading-relaxed">
                      {item.content}
                    </p>
                    <div className="text-[10px] text-steel/80 pt-0.5 flex items-center justify-between">
                      <span>{formatNotifDate(item.createdAt)}</span>
                      {item.orderCode && (
                        <span className="text-primary font-mono font-bold group-hover:underline">
                          #{item.orderCode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-hairline-soft bg-surface-soft/40 text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 py-1"
            >
              <span>Xem tất cả thông báo</span>
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
