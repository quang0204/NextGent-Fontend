import React, { useState, useEffect } from 'react';
import { sharedStore } from '../services/sharedStore';
import { faqService, ticketService } from '../services/feedbackService';
import { PortalFaqItem } from '../types/portal';
import { HelpCircle, ChevronDown, ChevronUp, Send, CheckCircle, ShieldCheck, PhoneCall, Mail } from 'lucide-react';

export const FaqSupportPage: React.FC = () => {
  const [faqs, setFaqs] = useState<PortalFaqItem[]>(sharedStore.getFaqs().filter(f => f.isVisible));
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    faqService.getFaqs().then(groups => {
      if (groups && groups.length > 0) {
        const flatItems = groups.flatMap(g => g.items).filter(f => f.isVisible !== false);
        if (flatItems.length > 0) {
          setFaqs(flatItems);
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = sharedStore.subscribe(() => {
      setFaqs(sharedStore.getFaqs().filter(f => f.isVisible));
    });
    return () => unsub();
  }, []);

  // Form support
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('Bảo hành & Đổi trả');
  const [content, setContent] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !content.trim()) return;

    try {
      await ticketService.createTicket({
        subject: `${category} - ${name.trim()} (${phone.trim()})`,
        description: content.trim(),
        priority: category.includes('Bảo hành') ? 'HIGH' : 'MEDIUM',
      });
    } catch (err) {
      console.warn('[FaqSupportPage] createTicket error', err);
    }

    setSubmitted(true);
    setName('');
    setPhone('');
    setContent('');
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-medium text-ink-deep tracking-tight flex items-center justify-center gap-2.5">
          <HelpCircle size={26} className="text-primary" />
          <span>Trung tâm Hỗ trợ & FAQ</span>
        </h1>
        <p className="text-xs text-steel max-w-lg mx-auto">
          Giải đáp chi tiết các chính sách bảo hành, đổi trả, cơ chế giữ chỗ tồn kho và tiếp nhận khiếu nại
        </p>
      </div>

      {/* Grid: FAQ Accordion Left & Ticket Form Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Accordion FAQ (7 cols) */}
        <div className="md:col-span-7 space-y-3.5">
          <h3 className="font-bold text-xs text-ink-deep uppercase tracking-wider pb-3 border-b border-hairline-soft">
            Các câu hỏi thường gặp nhất
          </h3>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div key={idx} className="bg-canvas border border-hairline-soft rounded-xl overflow-hidden shadow-none transition-all">
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full text-left p-4 flex items-center justify-between gap-3 text-xs font-bold text-ink-deep hover:text-primary transition-colors"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? <ChevronUp size={16} className="text-primary flex-shrink-0" /> : <ChevronDown size={16} className="text-steel flex-shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-charcoal leading-relaxed border-t border-hairline-soft pt-3 bg-surface-soft/40">
                      <span className="inline-block text-[10px] font-bold text-primary bg-surface-soft px-2.5 py-0.5 rounded-full border border-primary/20 mb-1.5">
                        Chủ đề: {faq.topic}
                      </span>
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-5 bg-surface-soft border border-hairline-soft rounded-xl text-xs space-y-2 text-charcoal">
            <h4 className="font-bold text-ink-deep">Cần hỗ trợ trực tiếp từ tổng đài?</h4>
            <div className="flex flex-col sm:flex-row gap-4 pt-1">
              <a href="tel:18006018" className="flex items-center gap-2 font-bold text-ink-deep hover:text-primary transition-colors">
                <PhoneCall size={14} className="text-primary" /> 1800.6018 (Miễn phí 8h00 - 21h30)
              </a>
              <a href="mailto:cskh@nextgen.vn" className="flex items-center gap-2 font-bold text-ink-deep hover:text-primary transition-colors">
                <Mail size={14} className="text-primary" /> cskh@nextgen.vn
              </a>
            </div>
          </div>
        </div>

        {/* Support Ticket Form (5 cols) */}
        <div className="md:col-span-5 bg-canvas border border-hairline-soft rounded-xxl p-6 sm:p-8 shadow-sticky space-y-5">
          <h3 className="font-bold text-xs text-ink-deep uppercase tracking-wider pb-3 border-b border-hairline-soft flex items-center gap-2">
            <Send size={15} className="text-primary" />
            <span>Gửi yêu cầu hỗ trợ</span>
          </h3>

          {submitted && (
            <div className="p-3.5 bg-surface-soft border border-success/30 text-charcoal text-xs rounded-xl flex items-center gap-2.5">
              <CheckCircle size={16} className="text-success flex-shrink-0" />
              <span>Yêu cầu của bạn đã được gửi. Nhân viên CSKH sẽ phản hồi trong 2 giờ!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-charcoal mb-1.5">Họ và tên của bạn:</label>
              <input
                type="text"
                required
                placeholder="Nguyễn Văn A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 bg-canvas border border-hairline rounded-lg px-3.5 text-xs text-ink focus:border-2 focus:border-fb-blue focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block font-medium text-charcoal mb-1.5">Số điện thoại liên hệ:</label>
              <input
                type="tel"
                required
                placeholder="0987654321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-11 bg-canvas border border-hairline rounded-lg px-3.5 text-xs text-ink font-mono focus:border-2 focus:border-fb-blue focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block font-medium text-charcoal mb-1.5">Vấn đề cần hỗ trợ:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 bg-canvas border border-hairline rounded-lg px-3 text-xs text-ink focus:border-2 focus:border-fb-blue focus:outline-none transition-colors"
              >
                <option value="Bảo hành & Đổi trả">Bảo hành & Đổi trả</option>
                <option value="Hỏi tiến trình đơn hàng">Hỏi tiến trình giao nhận đơn hàng</option>
                <option value="Khiếu nại thái độ phục vụ">Khiếu nại dịch vụ giao nhận</option>
                <option value="Tư vấn chọn cấu hình máy">Tư vấn chọn mua máy</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-charcoal mb-1.5">Nội dung chi tiết:</label>
              <textarea
                required
                rows={3}
                placeholder="Mô tả cụ thể vấn đề hoặc mã đơn hàng cần giải quyết..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-3.5 bg-canvas border border-hairline rounded-lg text-xs text-ink focus:border-2 focus:border-fb-blue focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              className="btn-marketing w-full py-3 rounded-full text-xs font-bold shadow-xs"
            >
              Gửi yêu cầu hỗ trợ
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};
