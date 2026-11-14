import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { ticketService } from '../../services/feedbackService';
import { sharedStore } from '../../services/sharedStore';
import { PortalSupportTicket } from '../../types/portal';
import { 
  Headphones, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Send, 
  X, 
  Tag, 
  HelpCircle,
  FileText,
  User
} from 'lucide-react';

// Chỉ có đúng 3 trạng thái theo yêu cầu: "Chờ phản hồi" | "Đã xử lý" | "Bị từ chối"
export type TicketDisplayStatus = 'WAITING' | 'RESOLVED' | 'REJECTED';

// Hàm chuẩn hóa trạng thái về đúng 3 trạng thái khớp chuẩn Backend & Admin Portal
export const normalizeTicketStatus = (rawStatus?: string): TicketDisplayStatus => {
  const s = (rawStatus || '').toUpperCase().trim();
  // Khớp với BE & Admin: REJECTED hoặc CLOSED đều là Bị từ chối
  if (s === 'REJECTED' || s === 'CLOSED') {
    return 'REJECTED';
  }
  // RESOLVED là Đã xử lý (có kèm câu trả lời)
  if (s === 'RESOLVED') {
    return 'RESOLVED';
  }
  // OPEN, WAITING, IN_PROGRESS là Chờ phản hồi
  return 'WAITING';
};

const TICKET_CATEGORIES = [
  'Bảo hành & Đổi trả',
  'Tư vấn chọn mua máy',
  'Hỗ trợ kỹ thuật & Cài đặt',
  'Tra cứu đơn hàng & Vận chuyển',
  'Khiếu nại dịch vụ & Nhân viên',
  'Yêu cầu hỗ trợ khác'
];

export const SupportHistoryView: React.FC = () => {
  const { user } = useAuthStore();
  const { showToast } = useToastStore();

  const [tickets, setTickets] = useState<PortalSupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | TicketDisplayStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal tạo phiếu hỗ trợ
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [category, setCategory] = useState(TICKET_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ref chống re-fetch dồn dập gây giật lag UI
  const isFetchingRef = useRef(false);

  // Tải danh sách phiếu HỖ TRỢ THEO ĐÚNG ID KHÁCH HÀNG (user.userId)
  const loadTickets = async (showLoading = false) => {
    if (!user || !user.userId) {
      setTickets([]);
      setLoading(false);
      return;
    }
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (showLoading) {
      setLoading(true);
    }
    try {
      // Gọi service truyền chính xác userId của khách hàng
      const res = await ticketService.getUserTickets(user.userId);
      if (res && res.tickets) {
        // Đảm bảo chỉ lấy phiếu của khách hàng này
        const userTickets = res.tickets.filter(t => Number(t.userId) === Number(user.userId));
        setTickets(userTickets);
      }
    } catch (err) {
      console.warn('[SupportHistoryView] loadTickets err', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    loadTickets(true);
  }, [user?.userId]);

  // Nhận thông báo thời gian thực khi có ticket được cập nhật (chạy êm, không bật spinner)
  useEffect(() => {
    const unsub = sharedStore.subscribe(() => {
      loadTickets(false);
    });
    return () => unsub();
  }, [user?.userId]);

  // Format thời gian hiển thị tiếng Việt
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'Vừa xong';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Submit phiếu mới (gắn kèm userId của khách hàng)
  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast('Vui lòng nhập nội dung chi tiết vấn đề cần hỗ trợ.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await ticketService.createTicket({
        subject: category,
        description: description.trim(),
        priority
      });

      if (res.success) {
        showToast(res.message || 'Gửi yêu cầu hỗ trợ thành công! Ban quản trị sẽ phản hồi sớm nhất.', 'success');
        setShowCreateModal(false);
        setDescription('');
        setPriority('MEDIUM');
        setCategory(TICKET_CATEGORIES[0]);
        loadTickets();
      } else {
        showToast(res.message || 'Không thể gửi yêu cầu hỗ trợ.', 'error');
      }
    } catch (err: any) {
      showToast('Có lỗi xảy ra khi gửi yêu cầu hỗ trợ.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Chỉ hiển thị 3 huy hiệu trạng thái: "Chờ phản hồi" | "Đã xử lý" | "Bị từ chối"
  const renderStatusBadge = (rawStatus?: string) => {
    const displayStatus = normalizeTicketStatus(rawStatus);

    if (displayStatus === 'RESOLVED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-success/10 text-success border border-success/30">
          <CheckCircle2 size={13} />
          <span>Đã xử lý</span>
        </span>
      );
    }

    if (displayStatus === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-critical/10 text-critical border border-critical/30">
          <XCircle size={13} />
          <span>Bị từ chối</span>
        </span>
      );
    }

    // Default: 'WAITING' -> "Chờ phản hồi"
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-warning/15 text-[#925400] border border-warning/30">
        <Clock size={13} />
        <span>Chờ phản hồi</span>
      </span>
    );
  };

  // Lọc theo từ khóa & 3 trạng thái
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const st = normalizeTicketStatus(t.status);

      // Lọc theo 3 trạng thái:
      if (statusFilter !== 'ALL' && st !== statusFilter) {
        return false;
      }

      // Lọc theo từ khóa tìm kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = String(t.ticketId).includes(q);
        const matchSub = (t.subject || t.category || '').toLowerCase().includes(q);
        const matchContent = (t.description || t.content || '').toLowerCase().includes(q);
        const matchReply = (t.reply || t.resolutionNote || '').toLowerCase().includes(q);
        if (!matchId && !matchSub && !matchContent && !matchReply) return false;
      }
      return true;
    });
  }, [tickets, statusFilter, searchQuery]);

  // Đếm số lượng theo 3 trạng thái
  const counts = useMemo(() => {
    const res = {
      ALL: tickets.length,
      WAITING: 0,
      RESOLVED: 0,
      REJECTED: 0
    };
    tickets.forEach(t => {
      const st = normalizeTicketStatus(t.status);
      res[st]++;
    });
    return res;
  }, [tickets]);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline-soft">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-ink-deep uppercase tracking-wider flex items-center gap-2">
              <Headphones size={18} className="text-primary" />
              <span>Lịch sử hỗ trợ</span>
            </h3>
            {user?.userId && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-surface-soft text-charcoal border border-hairline-soft">
                Khách hàng ID: #{user.userId}
              </span>
            )}
          </div>
          <p className="text-xs text-steel mt-1">
            Danh sách yêu cầu hỗ trợ của bạn, theo dõi trạng thái và câu trả lời chính thức từ Ban Quản trị
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 bg-ink-button hover:bg-charcoal text-on-ink-button text-xs font-bold px-4 py-2.5 rounded-full transition-all cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>Gửi yêu cầu hỗ trợ</span>
        </button>
      </div>

      {/* Search & 3 Status Filter Tabs */}
      <div className="space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-steel" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã phiếu (#TK...), vấn đề hoặc nội dung phản hồi..."
            className="w-full pl-10 pr-9 py-2 bg-surface-soft border border-hairline-soft rounded-full text-xs text-ink placeholder:text-steel/70 focus:outline-none focus:border-ink-deep focus:bg-canvas transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-steel hover:text-ink text-xs font-bold w-4 h-4 rounded-full bg-hairline-soft flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Chỉ hiện 3 trạng thái + Tất cả */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scroll-smooth no-scrollbar">
          {[
            { key: 'ALL', label: 'Tất cả', count: counts.ALL },
            { key: 'WAITING', label: 'Chờ phản hồi', count: counts.WAITING },
            { key: 'RESOLVED', label: 'Đã xử lý', count: counts.RESOLVED },
            { key: 'REJECTED', label: 'Bị từ chối', count: counts.REJECTED }
          ].map(tab => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer flex-shrink-0 ${
                  isActive
                    ? 'bg-ink-deep text-canvas shadow-xs'
                    : 'bg-surface-soft hover:bg-hairline-soft/80 text-charcoal border border-hairline-soft'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive ? 'bg-primary text-canvas' : 'bg-canvas text-steel border border-hairline-soft'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="py-12 text-center space-y-3">
          <Clock size={24} className="animate-spin text-primary mx-auto" />
          <p className="text-xs text-steel">Đang tải lịch sử hỗ trợ của bạn...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-surface-soft/40 border border-hairline-soft rounded-xxl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-surface-soft border border-hairline-soft flex items-center justify-center text-steel mx-auto">
            <HelpCircle size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-ink-deep">
              {searchQuery || statusFilter !== 'ALL' ? 'Không tìm thấy phiếu hỗ trợ phù hợp' : 'Bạn chưa có yêu cầu hỗ trợ nào'}
            </h4>
            <p className="text-xs text-steel max-w-md mx-auto">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Hãy thử thay đổi từ khóa hoặc bộ lọc trạng thái để tìm kiếm.'
                : 'Mọi yêu cầu hỗ trợ kỹ thuật, đổi trả hay tư vấn sản phẩm của bạn sẽ được hiển thị tại đây.'}
            </p>
          </div>
          {!(searchQuery || statusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-deep text-on-primary text-xs font-bold px-4 py-2 rounded-full transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Gửi yêu cầu hỗ trợ ngay</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map(ticket => {
            const displayStatus = normalizeTicketStatus(ticket.status);
            const replyContent = ticket.reply || ticket.resolutionNote;
            const staffName = ticket.handledByName || ticket.handledBy || 'Ban Quản trị NextGen';
            const replyTime = ticket.resolvedAt || ticket.handledAt;

            return (
              <div
                key={ticket.ticketId}
                className="bg-canvas border border-hairline-soft rounded-xxl p-5 space-y-4 hover:border-steel/40 transition-all shadow-none"
              >
                {/* 1. Header card: Mã phiếu, Thời gian gửi, Trạng thái (1 trong 3 trạng thái) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-hairline-soft">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                      #TK-{ticket.ticketId}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-steel">
                      <Clock size={13} className="text-steel" />
                      <span>Thời gian gửi: <strong className="text-charcoal font-medium">{formatDateTime(ticket.createdAt)}</strong></span>
                    </div>
                  </div>

                  <div>
                    {renderStatusBadge(ticket.status)}
                  </div>
                </div>

                {/* 2. Vấn đề hỗ trợ */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-steel uppercase tracking-wider flex items-center gap-1.5">
                    <Tag size={12} className="text-primary" />
                    <span>Vấn đề hỗ trợ</span>
                  </div>
                  <h4 className="text-sm font-bold text-ink-deep leading-snug">
                    {ticket.subject || ticket.category}
                  </h4>
                </div>

                {/* 3. Nội dung chi tiết */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-steel uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={12} className="text-steel" />
                    <span>Nội dung chi tiết</span>
                  </div>
                  <div className="p-3.5 bg-surface-soft/60 rounded-xl border border-hairline-soft/60 text-xs text-charcoal leading-relaxed whitespace-pre-wrap font-sans">
                    {ticket.description || ticket.content}
                  </div>
                </div>

                {/* 4. Hiện câu trả lời nếu bên admin đã xử lý hoặc bị từ chối */}
                {displayStatus === 'RESOLVED' && (
                  <div className="mt-3 bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-primary/15">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs">
                          <ShieldCheck size={14} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-ink-deep">Câu trả lời từ Ban Quản trị NextGen</span>
                          <span className="text-[11px] text-steel ml-2 font-medium">({staffName})</span>
                        </div>
                      </div>

                      {replyTime && (
                        <div className="text-[11px] text-steel flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-success" />
                          <span>Đã xử lý: {formatDateTime(replyTime)}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-ink-deep leading-relaxed bg-canvas/80 p-3 rounded-lg border border-primary/10 whitespace-pre-wrap font-medium">
                      {replyContent || 'Yêu cầu của bạn đã được kiểm tra và xử lý hoàn tất. Cảm ơn bạn đã tin tưởng dịch vụ của NextGen Smart Tech.'}
                    </div>
                  </div>
                )}

                {displayStatus === 'REJECTED' && (
                  <div className="mt-3 bg-critical/5 border border-critical/20 rounded-xl p-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-critical/15">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-critical text-canvas flex items-center justify-center font-bold text-xs">
                          <XCircle size={14} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-critical">Phản hồi từ Ban Quản trị (Từ chối yêu cầu)</span>
                          <span className="text-[11px] text-steel ml-2 font-medium">({staffName})</span>
                        </div>
                      </div>

                      {replyTime && (
                        <div className="text-[11px] text-steel flex items-center gap-1">
                          <Clock size={12} />
                          <span>Thời gian: {formatDateTime(replyTime)}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-ink-deep leading-relaxed bg-canvas/80 p-3 rounded-lg border border-critical/10 whitespace-pre-wrap font-medium">
                      {replyContent || 'Yêu cầu hỗ trợ của bạn chưa đáp ứng đủ điều kiện theo chính sách của hệ thống.'}
                    </div>
                  </div>
                )}

                {displayStatus === 'WAITING' && (
                  <div className="bg-surface-soft/60 border border-dashed border-hairline-soft rounded-xl p-3 flex items-center gap-2.5 text-xs text-steel">
                    <Clock size={14} className="text-[#925400] flex-shrink-0" />
                    <span>Yêu cầu đang chờ phản hồi từ Ban Quản trị NextGen. Chúng tôi sẽ xử lý và trả lời sớm nhất.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Gửi phiếu hỗ trợ mới */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-deep/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-canvas border border-hairline-soft rounded-xxl shadow-summary w-full max-w-lg p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-surface-soft flex items-center justify-center text-primary font-bold">
                  <Headphones size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink-deep">Gửi yêu cầu hỗ trợ mới</h3>
                  <p className="text-[11px] text-steel">Đội ngũ kỹ thuật & CSKH NextGen sẽ tiếp nhận và xử lý</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-steel hover:text-ink-deep p-1 rounded-full hover:bg-surface-soft transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateTicketSubmit} className="space-y-4">
              {/* Thông tin người gửi (Khách hàng) */}
              <div className="bg-surface-soft p-3 rounded-xl border border-hairline-soft/80 flex items-center gap-3 text-xs">
                <User size={15} className="text-steel" />
                <div className="text-charcoal">
                  <span>Khách hàng ID: <strong className="text-ink-deep">#{user?.userId}</strong> ({user?.fullName})</span>
                  <span className="text-steel mx-1.5">•</span>
                  <span>{user?.phone || 'Chưa cập nhật SĐT'}</span>
                </div>
              </div>

              {/* Vấn đề hỗ trợ */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-deep">
                  Vấn đề hỗ trợ <span className="text-critical">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-soft border border-hairline-soft rounded-xl text-xs text-ink focus:outline-none focus:border-ink-deep focus:bg-canvas transition"
                >
                  {TICKET_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Nội dung chi tiết */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-deep">
                  Nội dung chi tiết <span className="text-critical">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả cụ thể hiện tượng gặp phải hoặc câu hỏi của bạn để được hỗ trợ nhanh nhất..."
                  className="w-full px-3.5 py-2.5 bg-surface-soft border border-hairline-soft rounded-xl text-xs text-ink placeholder:text-steel/70 focus:outline-none focus:border-ink-deep focus:bg-canvas transition resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-hairline-soft">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-full text-xs font-bold text-charcoal bg-surface-soft hover:bg-hairline-soft border border-hairline-soft transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-on-ink-button bg-ink-button hover:bg-charcoal transition cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Send size={13} />
                  <span>{isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu hỗ trợ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
