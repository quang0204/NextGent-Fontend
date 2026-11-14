import React, { useState, useEffect } from 'react';
import { sharedStore } from '../../services/sharedStore';
import { faqService } from '../../services/feedbackService';
import { PortalFaqItem } from '../../types/portal';
import { 
  HelpCircle, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  X, 
  CheckCircle, 
  AlertCircle,
  MessageSquare
} from 'lucide-react';

export const PortalFaqManagerView: React.FC = () => {
  const [faqs, setFaqs] = useState<PortalFaqItem[]>(sharedStore.getFaqs());
  const [searchTerm, setSearchTerm] = useState('');
  const [topicFilter, setTopicFilter] = useState('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<PortalFaqItem | null>(null);
  const [topic, setTopic] = useState('Chính sách bảo hành & Đổi trả ');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadFaqs = () => {
    faqService.getAdminFaqs().then(items => {
      setFaqs(items);
    }).catch(() => {
      faqService.getFaqs().then(groups => {
        if (groups && groups.length > 0) {
          setFaqs(groups.flatMap(g => g.items));
        }
      }).catch(() => {});
    });
  };

  useEffect(() => {
    loadFaqs();
  }, []);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const topicsList = [
    'Chính sách bảo hành & Đổi trả ',
    'Cơ chế Giữ chỗ tồn kho',
    'Giao hàng & Kiểm hàng COD',
    'Thanh toán & Trả góp 0%',
    'Tư vấn sản phẩm & Khuyến mãi'
  ];

  const handleOpenAddModal = () => {
    setEditingFaq(null);
    setTopic(topicsList[0]);
    setQuestion('');
    setAnswer('');
    setIsVisible(true);
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (f: PortalFaqItem) => {
    setEditingFaq(f);
    setTopic(f.topic);
    setQuestion(f.question);
    setAnswer(f.answer);
    setIsVisible(f.isVisible);
    setFormError('');
    setShowModal(true);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() ||!answer.trim()) {
      setFormError('Vui lòng điền đầy đủ câu hỏi và câu trả lời!');
      return;
    }

    try {
      if (editingFaq) {
        await faqService.updateAdminFaq(editingFaq.faqId, {
          question: question.trim(),
          answer: answer.trim(),
          category: topic,
          displayOrder: editingFaq.sortOrder ?? 1,
          isActive: isVisible,
        });
        showNotification('Đã cập nhật câu hỏi FAQ thành công!');
      } else {
        const res = await faqService.createAdminFaq({
          question: question.trim(),
          answer: answer.trim(),
          category: topic,
          displayOrder: faqs.length + 1,
          isActive: isVisible,
        });
        if (!res.success) {
          setFormError(res.message || 'Không thể thêm FAQ!');
          return;
        }
        showNotification('Đã thêm câu hỏi FAQ mới!');
      }
      loadFaqs();
      setShowModal(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.message || 'Lỗi khi lưu FAQ lên máy chủ!');
    }
  };

  const handleDeleteFaq = async (faqId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) return;
    try {
      await faqService.deleteAdminFaq(faqId);
      loadFaqs();
      showNotification('Đã xóa câu hỏi FAQ thành công!');
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Không thể xóa FAQ.');
    }
  };

  const handleToggleVisibility = async (faq: PortalFaqItem) => {
    try {
      await faqService.updateAdminFaq(faq.faqId, {
        question: faq.question,
        answer: faq.answer,
        category: faq.topic,
        displayOrder: faq.sortOrder ?? 1,
        isActive: !faq.isVisible,
      });
      loadFaqs();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Không thể đổi trạng thái hiển thị FAQ.');
    }
  };

  const handleReorderFaq = async (idx: number, direction: 'UP' | 'DOWN') => {
    const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= filtered.length) return;
    const current = filtered[idx];
    const swapWith = filtered[targetIdx];
    try {
      await Promise.all([
        faqService.updateAdminFaq(current.faqId, {
          question: current.question,
          answer: current.answer,
          category: current.topic,
          displayOrder: swapWith.sortOrder ?? targetIdx + 1,
          isActive: current.isVisible,
        }),
        faqService.updateAdminFaq(swapWith.faqId, {
          question: swapWith.question,
          answer: swapWith.answer,
          category: swapWith.topic,
          displayOrder: current.sortOrder ?? idx + 1,
          isActive: swapWith.isVisible,
        }),
      ]);
      loadFaqs();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Không thể sắp xếp lại FAQ.');
    }
  };

  const filtered = faqs.filter(f => {
    const matchSearch = 
      f.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;
    if (topicFilter!== 'ALL' && f.topic!== topicFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline-soft">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-deep flex items-center gap-2">
            <HelpCircle size={22} className="text-primary" />
            <span>Quản lý Câu hỏi Thường gặp</span>
          </h2>
          <p className="text-xs text-steel mt-0.5">
            Biên tập câu hỏi chính sách, thứ tự ưu tiên và đồng bộ trực tiếp lên trang CSKH
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="btn-marketing py-2.5 px-5 text-xs font-bold rounded-full flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>Thêm câu hỏi FAQ</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 bg-success/10 border border-success/30 text-success rounded-xl text-xs flex items-center gap-2">
          <CheckCircle size={15} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative max-w-md w-full">
          <input
            type="text"
            placeholder="Tìm theo nội dung câu hỏi hoặc câu trả lời..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-canvas border border-hairline-soft rounded-full text-xs text-ink placeholder:text-steel focus:border-2 focus:border-fb-blue focus:outline-none"
          />
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-steel" />
        </div>

        <select
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          className="h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:outline-none"
        >
          <option value="ALL">Tất cả chủ đề</option>
          {topicsList.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* FAQ Cards List */}
      <div className="space-y-3">
        {filtered.length === 0? (
          <div className="p-12 text-center text-xs text-steel bg-canvas border border-hairline-soft rounded-2xl">
            Không tìm thấy câu hỏi FAQ nào phù hợp.
          </div>
        ): (
          filtered.map((faq, idx) => (
            <div
              key={faq.faqId}
              className={`bg-canvas border rounded-2xl p-4 sm:p-5 shadow-sticky text-xs space-y-3 transition ${!faq.isVisible? 'opacity-60 border-hairline-soft bg-surface-soft/40': 'border-hairline-soft'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-hairline-soft">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
                    Chủ đề: {faq.topic}
                  </span>
                  <span className="text-[11px] text-steel font-mono">
                    Thứ tự: #{faq.sortOrder}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    onClick={() => handleReorderFaq(idx, 'UP')}
                    disabled={idx === 0}
                    className="p-1 text-steel hover:text-ink disabled:opacity-30 rounded hover:bg-surface-soft"
                    title="Đẩy lên trước"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    onClick={() => handleReorderFaq(idx, 'DOWN')}
                    disabled={idx === filtered.length - 1}
                    className="p-1 text-steel hover:text-ink disabled:opacity-30 rounded hover:bg-surface-soft"
                    title="Hạ xuống sau"
                  >
                    <ArrowDown size={13} />
                  </button>

                  <span className="text-hairline mx-1">|</span>

                  <button
                    onClick={() => handleToggleVisibility(faq)}
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      faq.isVisible? 'bg-success/10 text-success border border-success/30': 'bg-surface-soft text-steel border border-hairline-soft'
                    }`}
                  >
                    {faq.isVisible? <Eye size={11} />: <EyeOff size={11} />}
                    <span>{faq.isVisible? 'Hiển thị': 'Ẩn'}</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(faq)}
                    className="p-1.5 text-steel hover:text-primary rounded hover:bg-surface-soft"
                    title="Chỉnh sửa"
                  >
                    <Edit size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteFaq(faq.faqId)}
                    className="p-1.5 text-steel hover:text-critical rounded hover:bg-surface-soft"
                    title="Xóa câu hỏi"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-ink-deep text-sm flex items-start gap-2">
                  <span className="text-primary font-mono">Q:</span>
                  <span>{faq.question}</span>
                </h4>
                <div className="text-steel leading-relaxed flex items-start gap-2 pl-4 border-l-2 border-hairline-soft">
                  <span className="text-steel font-mono font-bold">A:</span>
                  <span>{faq.answer}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Add / Edit FAQ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-ink-deep/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveFaq} className="max-w-lg w-full bg-canvas border border-hairline-soft rounded-2xl p-6 shadow-2xl space-y-4 text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
              <h4 className="font-bold text-ink-deep text-sm flex items-center gap-2">
                <HelpCircle size={16} className="text-primary" />
                <span>{editingFaq? 'Chỉnh sửa câu hỏi FAQ': 'Thêm câu hỏi FAQ mới'}</span>
              </h4>
              <button type="button" onClick={() => setShowModal(false)} className="p-1 text-steel hover:text-ink">
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-critical/10 border border-critical/30 text-critical rounded-xl flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-steel font-medium mb-1">Chủ đề phân loại (topic):</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
              >
                {topicsList.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-steel font-medium mb-1">Câu hỏi (*):</label>
              <input
                type="text"
                required
                placeholder="VD: Chính sách bảo hành áp dụng như thế nào?..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-steel font-medium mb-1">Câu trả lời (*):</label>
              <textarea
                required
                rows={4}
                placeholder="Nội dung giải đáp chi tiết cho khách hàng..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full p-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isVisible}
                onChange={(e) => setIsVisible(e.target.checked)}
                className="rounded text-primary focus:ring-primary"
              />
              <span className="font-bold text-ink-deep">Hiển thị ngay trên Trung tâm trợ giúp của khách hàng</span>
            </label>

            <div className="flex gap-2.5 justify-end pt-3 border-t border-hairline-soft">
              <button type="button" onClick={() => setShowModal(false)} className="btn-ghost px-4 py-2 text-xs font-bold">
                Hủy
              </button>
              <button type="submit" className="btn-marketing px-5 py-2 text-xs font-bold rounded-full">
                Lưu câu hỏi FAQ
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
