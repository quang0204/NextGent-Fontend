import React, { useState, useMemo, useEffect } from 'react';
import { 
  MessageSquare, 
  HelpCircle, 
  Star, 
  CheckCircle, 
  Eye, 
  EyeOff, 
  Send, 
  Clock, 
  User, 
  Phone, 
  Search, 
  Filter, 
  Check, 
  X,
  BadgeCheck
} from 'lucide-react';
import { sharedStore } from '../../services/sharedStore';
import { reviewService, ticketService } from '../../services/feedbackService';

import { ProductReview } from '../../types/review';
import { PortalSupportTicket } from '../../types/portal';
import { RatingStars } from '../../components/common/RatingStars';
import { PortalPagination } from '../../components/portal/PortalPagination';

interface ModeratedReview extends ProductReview {
  status: 'PUBLISHED' | 'HIDDEN';
}

const isTicketWaiting = (st?: string) => st === 'WAITING' || st === 'OPEN' || st === 'IN_PROGRESS';
const isTicketRejected = (st?: string) => st === 'REJECTED' || st === 'CLOSED';

export const PortalReviewsTicketsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'REVIEWS' | 'TICKETS'>('REVIEWS');

  // Reviews State
  const [reviews, setReviews] = useState<ModeratedReview[]>(() =>
    sharedStore.getReviews(undefined, true).map(r => ({
      ...r,
      status: r.status === 'HIDDEN' || sharedStore.isReviewHidden(r.reviewId) ? 'HIDDEN' : 'PUBLISHED',
    }))
  );

  React.useEffect(() => {
    const unsub = sharedStore.subscribe(() => {
      setReviews(prev =>
        (prev.length > 0 ? prev : sharedStore.getReviews(undefined, true)).map(r => ({
          ...r,
          status: sharedStore.isReviewHidden(r.reviewId) || r.status === 'HIDDEN' ? 'HIDDEN' : 'PUBLISHED',
        }))
      );
      setTickets([...sharedStore.getTickets()]);
    });
    return () => unsub();
  }, []);

  const [ratingFilter, setRatingFilter] = useState<number | 'ALL'>('ALL');
  const [reviewSearch, setReviewSearch] = useState('');
  const [replyingReviewId, setReplyingReviewId] = useState<number | null>(null);
  const [storeReplyText, setStoreReplyText] = useState('');

  // Tickets State
  const [tickets, setTickets] = useState<PortalSupportTicket[]>([]);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'ALL' | 'WAITING' | 'RESOLVED' | 'REJECTED'>('ALL');
  const [selectedTicket, setSelectedTicket] = useState<PortalSupportTicket | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');

  // API 12.3: Load Admin Reviews
  useEffect(() => {
    reviewService.getAdminReviews({
      rating: ratingFilter !== 'ALL' ? ratingFilter : undefined,
      search: reviewSearch.trim() || undefined,
    }).then(res => {
      if (res?.items && res.items.length > 0) {
        setReviews(res.items.map(r => ({ ...r, status: (r.status === 'HIDDEN' ? 'HIDDEN' : 'PUBLISHED') as any })));
      }
    }).catch(() => {});
  }, [ratingFilter, reviewSearch]);

  // API 12.5: Load Admin Tickets
  useEffect(() => {
    ticketService.getAdminTickets().then(res => {
      if (res?.items && res.items.length > 0) {
        setTickets(res.items);
      }
    }).catch(() => {});
  }, []);

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // Moderation Handlers
  const handleToggleReviewStatus = async (reviewId: number) => {
    const target = reviews.find(r => Number(r.reviewId) === Number(reviewId));
    const currentStatus = target?.status === 'HIDDEN' || sharedStore.isReviewHidden(reviewId) ? 'HIDDEN' : 'PUBLISHED';
    const nextStatus: 'PUBLISHED' | 'HIDDEN' = currentStatus === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED';

    setReviews(prev =>
      prev.map(r => (Number(r.reviewId) === Number(reviewId) ? { ...r, status: nextStatus } : r))
    );
    showToast(
      nextStatus === 'HIDDEN'
        ? 'Đã ẩn đánh giá khỏi giao diện người dùng'
        : 'Đã công khai đánh giá lên sản phẩm'
    );

    await reviewService.updateAdminReviewStatus(reviewId, nextStatus, target);
  };

  const handleSendStoreReply = async (reviewId: number) => {
    if (!storeReplyText.trim()) return;
    try {
      await reviewService.replyAdminReview(reviewId, storeReplyText.trim());
    } catch (err) {
      console.warn('[PortalReviewsTicketsView] replyAdminReview error', err);
    }
    setReviews(prev => prev.map(r => {
      if (r.reviewId === reviewId) {
        return {...r,
          storeReply: storeReplyText.trim(),
          reply: storeReplyText.trim(),
          repliedAt: new Date().toISOString()
        };
      }
      return r;
    }));
    setReplyingReviewId(null);
    setStoreReplyText('');
    showToast('Đã đăng phản hồi chính thức từ NextGen Smart Tech thành công!');
  };

  const handleResolveTicket = async (ticketId: number, status: 'RESOLVED' | 'REJECTED') => {
    if (!ticketReplyText.trim() && status === 'RESOLVED') {
      alert('Vui lòng nhập nội dung trả lời hỗ trợ khách hàng');
      return;
    }

    try {
      await ticketService.updateAdminTicket(ticketId, {
        status: status === 'RESOLVED' ? 'RESOLVED' : 'REJECTED',
        resolutionNote: ticketReplyText.trim(),
      });
    } catch (err) {
      console.warn('[PortalReviewsTicketsView] updateAdminTicket error', err);
    }

    setTickets(prev => prev.map(t => {
      if (t.ticketId === ticketId) {
        return {...t,
          status,
          reply: ticketReplyText.trim() || undefined,
          resolutionNote: ticketReplyText.trim() || undefined,
          handledBy: 'Nguyễn Thanh Hùng (Staff)',
          handledAt: new Date().toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
        };
      }
      return t;
    }));

    setSelectedTicket(null);
    setTicketReplyText('');
    showToast(`Đã cập nhật trạng thái phiếu hỗ trợ #${ticketId} thành ${status === 'RESOLVED'? 'Đã giải quyết': 'Từ chối'}`);
  };

  // Phân trang đánh giá
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPageSize, setReviewPageSize] = useState(5);

  // Phân trang phiếu hỗ trợ
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketPageSize, setTicketPageSize] = useState(8);

  // Filtered lists
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      const matchRating = ratingFilter === 'ALL' || r.rating === ratingFilter;
      const matchSearch = (r.comment || '').toLowerCase().includes(reviewSearch.toLowerCase()) ||
        (r.userName || '').toLowerCase().includes(reviewSearch.toLowerCase());
      return matchRating && matchSearch;
    });
  }, [reviews, ratingFilter, reviewSearch]);

  const paginatedReviews = useMemo(() => {
    const start = (reviewPage - 1) * reviewPageSize;
    return filteredReviews.slice(start, start + reviewPageSize);
  }, [filteredReviews, reviewPage, reviewPageSize]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (ticketStatusFilter === 'ALL') return true;
      if (ticketStatusFilter === 'WAITING') return isTicketWaiting(t.status);
      if (ticketStatusFilter === 'REJECTED') return isTicketRejected(t.status);
      return t.status === ticketStatusFilter;
    });
  }, [tickets, ticketStatusFilter]);

  const paginatedTickets = useMemo(() => {
    const start = (ticketPage - 1) * ticketPageSize;
    return filteredTickets.slice(start, start + ticketPageSize);
  }, [filteredTickets, ticketPage, ticketPageSize]);

  useEffect(() => {
    setReviewPage(1);
  }, [ratingFilter, reviewSearch]);

  useEffect(() => {
    setTicketPage(1);
  }, [ticketStatusFilter]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-lg flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="text-blue-600" size={22} />
            Quản trị Đánh giá Sản phẩm & Phiếu Hỗ trợ Khách hàng
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Kiểm duyệt đánh giá, phản hồi chính thức từ cửa hàng và xử lý ticket hỗ trợ đổi trả bảo hành
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('REVIEWS')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'REVIEWS'? 'bg-white text-blue-700 shadow-xs': 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Star size={14} className={activeTab === 'REVIEWS'? 'text-amber-500 fill-amber-500': 'text-slate-400'} />
            Đánh giá sản phẩm ({reviews.length})
          </button>
          <button
            onClick={() => setActiveTab('TICKETS')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'TICKETS'? 'bg-white text-blue-700 shadow-xs': 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle size={14} className={activeTab === 'TICKETS'? 'text-blue-600': 'text-slate-400'} />
            Phiếu hỗ trợ & Khiếu nại ({tickets.filter(t => isTicketWaiting(t.status)).length} chờ xử lý)
          </button>
        </div>
      </div>

      {/* TAB 1: PRODUCT REVIEWS MODERATION */}
      {activeTab === 'REVIEWS' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Tìm theo nội dung đánh giá hoặc người đăng..."
                value={reviewSearch}
                onChange={e => setReviewSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-slate-500 font-medium">Lọc số sao:</span>
              <select
                value={ratingFilter}
                onChange={e => setRatingFilter(e.target.value === 'ALL'? 'ALL': Number(e.target.value))}
                className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
              >
                <option value="ALL">Tất cả sao</option>
                <option value="5">5 sao ⭐⭐⭐⭐⭐</option>
                <option value="4">4 sao ⭐⭐⭐⭐</option>
                <option value="3">3 sao ⭐⭐⭐</option>
                <option value="2">2 sao ⭐⭐</option>
                <option value="1">1 sao ⭐</option>
              </select>
            </div>
          </div>

          {/* Review items list */}
          <div className="space-y-3">
            {paginatedReviews.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400 text-xs">
                Không tìm thấy đánh giá nào thỏa mãn điều kiện lọc
              </div>
            ) : (
              paginatedReviews.map(r => (
                <div 
                  key={r.reviewId} 
                  className={`bg-white border rounded-lg p-4 shadow-xs transition ${
                    r.status === 'HIDDEN'? 'border-rose-200 bg-rose-50/20': 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">{r.userName}</span>
                        <span className="text-[11px] text-slate-400 font-mono">({r.userPhoneMasked})</span>
                        {r.isBuyerVerified && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            <BadgeCheck size={11} className="text-emerald-600" />
                            Đã mua hàng{r.orderItemId? ` (Dòng đơn #${r.orderItemId})`: ''}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.status === 'PUBLISHED'? 'bg-emerald-50 text-emerald-700 border border-emerald-200': 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {r.status === 'PUBLISHED'? 'Đang hiển thị': 'Đã ẩn (Spam / Vi phạm)'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <RatingStars rating={r.rating} size={13} />
                        <span className="text-[11px] text-slate-400">
                          {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleReviewStatus(r.reviewId)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition ${
                          r.status === 'PUBLISHED'? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200': 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                        }`}
                      >
                        {r.status === 'PUBLISHED'? (
                          <>
                            <EyeOff size={13} />
                            Ẩn đánh giá
                          </>
                        ): (
                          <>
                            <Eye size={13} />
                            Khôi phục hiển thị
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setReplyingReviewId(replyingReviewId === r.reviewId? null: r.reviewId);
                          setStoreReplyText(r.storeReply || '');
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition"
                      >
                        <MessageSquare size={13} />
                        {r.storeReply? 'Sửa phản hồi': 'Trả lời'}
                      </button>
                    </div>
                  </div>

                  {/* Comment content */}
                  <div className="mt-3 text-xs text-slate-700 bg-slate-50 p-3 rounded border border-slate-100 leading-relaxed">
                    "{r.comment}"
                  </div>

                  {/* Ảnh khách gửi kèm (API 12.3 trả về imageUrls) */}
                  {r.images && r.images.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.images.map((img, i) => (
                        <a key={img} href={img} target="_blank" rel="noopener noreferrer" title="Xem ảnh gốc">
                          <img
                            src={img}
                            alt={`Ảnh đánh giá ${i + 1}`}
                            className="w-16 h-16 object-cover rounded border border-slate-200 hover:opacity-90 transition"
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Existing Store Reply */}
                  {r.storeReply && replyingReviewId!== r.reviewId && (
                    <div className="mt-2.5 ml-4 p-3 bg-blue-50/60 border-l-2 border-blue-600 rounded-r text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-blue-900 font-semibold text-[11px]">
                        <span className="bg-blue-600 text-white text-[9px] px-1 py-0.2 rounded">QTV</span>
                        <span>Phản hồi từ NextGen Smart Tech Official</span>
                        {r.repliedAt && (
                          <span className="text-slate-400 font-normal">
                            • {new Date(r.repliedAt).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700">{r.storeReply}</p>
                    </div>
                  )}

                  {/* Inline Reply Form */}
                  {replyingReviewId === r.reviewId && (
                    <div className="mt-3 ml-4 p-3 bg-slate-50 border border-blue-200 rounded-lg space-y-2">
                      <label className="block text-xs font-semibold text-slate-800">
                        Nội dung phản hồi chính thức cho khách hàng #{r.userName}:
                      </label>
                      <textarea
                        rows={2}
                        value={storeReplyText}
                        onChange={e => setStoreReplyText(e.target.value)}
                        placeholder="Dạ NextGen cảm ơn quý khách..."
                        className="w-full p-2 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setReplyingReviewId(null)}
                          className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={() => handleSendStoreReply(r.reviewId)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs"
                        >
                          <Send size={12} />
                          Đăng phản hồi
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Phân trang danh sách đánh giá */}
          {filteredReviews.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
              <PortalPagination
                currentPage={reviewPage}
                totalItems={filteredReviews.length}
                pageSize={reviewPageSize}
                onPageChange={setReviewPage}
                onPageSizeChange={setReviewPageSize}
                pageSizeOptions={[5, 10, 20]}
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUPPORT TICKETS */}
      {activeTab === 'TICKETS' && (
        <div className="space-y-4">
          {/* Status filter */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Trạng thái phiếu:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'WAITING', label: 'Đang chờ xử lý' },
                { key: 'RESOLVED', label: 'Đã giải quyết' },
                { key: 'REJECTED', label: 'Từ chối' }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setTicketStatusFilter(f.key as any)}
                  className={`text-xs px-3 py-1 rounded-md font-medium transition ${
                    ticketStatusFilter === f.key? 'bg-blue-600 text-white': 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tickets Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Mã & Thời gian</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Chuyên mục</th>
                  <th className="py-3 px-4">Nội dung khiếu nại / yêu cầu</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Không có phiếu hỗ trợ nào phù hợp
                    </td>
                  </tr>
                ) : (
                  paginatedTickets.map(t => (
                    <tr key={t.ticketId} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono">
                        <div className="font-semibold text-slate-900">#TK-{t.ticketId}</div>
                        <div className="text-[11px] text-slate-400">{t.createdAt}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{t.customerName}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Phone size={11} />
                          {t.phone}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {t.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="line-clamp-2 text-slate-700">{t.content}</p>
                        {t.reply && (
                          <div className="mt-1 text-[11px] text-emerald-700 font-medium">
                            ✓ Đã phản hồi: "{t.reply.slice(0, 45)}..."
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isTicketWaiting(t.status)? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock size={12} />
                            {t.status === 'IN_PROGRESS' ? 'Đang xử lý' : 'Chờ phản hồi'}
                          </span>
                        ): t.status === 'RESOLVED'? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle size={12} />
                            Đã xử lý
                          </span>
                        ): (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <X size={12} />
                            Đã từ chối
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedTicket(t);
                            setTicketReplyText(t.reply || '');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition"
                        >
                          {isTicketWaiting(t.status)? 'Xử lý ngay': 'Xem chi tiết'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Phân trang danh sách phiếu hỗ trợ */}
            <PortalPagination
              currentPage={ticketPage}
              totalItems={filteredTickets.length}
              pageSize={ticketPageSize}
              onPageChange={setTicketPage}
              onPageSizeChange={setTicketPageSize}
              pageSizeOptions={[5, 8, 15, 30]}
            />
          </div>
        </div>
      )}

      {/* Modal Reply Ticket */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <HelpCircle className="text-blue-600" size={18} />
                Xử lý phiếu yêu cầu #{selectedTicket.ticketId}
              </h3>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Khách hàng:</span>
                  <span className="font-bold text-slate-900">{selectedTicket.customerName} - {selectedTicket.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Chuyên mục:</span>
                  <span className="font-semibold text-blue-700">{selectedTicket.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Thời gian gửi:</span>
                  <span className="text-slate-700 font-mono">{selectedTicket.createdAt}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nội dung phản ánh của khách hàng:
                </label>
                <div className="p-3 bg-amber-50/50 border border-amber-200 rounded text-xs text-slate-800 leading-relaxed">
                  {selectedTicket.content}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Phản hồi từ bộ phận Chăm sóc khách hàng / Kỹ thuật:
                </label>
                <textarea
                  rows={4}
                  value={ticketReplyText}
                  onChange={e => setTicketReplyText(e.target.value)}
                  placeholder="Nhập nội dung giải pháp hướng dẫn đổi máy theo quy định đổi trả hoặc hướng dẫn khách hàng gửi máy..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {selectedTicket.handledBy && (
                <div className="text-[11px] text-slate-500 italic">
                  Đã xử lý bởi {selectedTicket.handledBy} vào lúc {selectedTicket.handledAt}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleResolveTicket(selectedTicket.ticketId, 'REJECTED')}
                className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-md transition"
              >
                Từ chối xử lý
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-md transition"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => handleResolveTicket(selectedTicket.ticketId, 'RESOLVED')}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition"
                >
                  Lưu & Gửi thông báo đến khách hàng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
