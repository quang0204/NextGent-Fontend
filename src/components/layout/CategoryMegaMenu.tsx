import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Smartphone, 
  Laptop, 
  Tablet, 
  Headphones, 
  Flame, 
  ChevronRight, 
  ChevronDown, 
  LayoutGrid, 
  Sparkles,
  Zap,
  Tag,
  Gift,
  HelpCircle
} from 'lucide-react';

export interface MegaMenuItem {
  id: 'phone' | 'laptop' | 'tablet' | 'accessory' | 'sale';
  label: string;
  icon: React.ElementType;
  isHot?: boolean;
}

export const CategoryMegaMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'phone' | 'laptop' | 'tablet' | 'accessory' | 'sale'>('phone');
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Đóng khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current &&!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categories: MegaMenuItem[] = [
    { id: 'phone', label: 'Điện thoại, Smartphone', icon: Smartphone },
    { id: 'laptop', label: 'Laptop, Máy tính xách tay', icon: Laptop },
    { id: 'tablet', label: 'Máy tính bảng (Tablet)', icon: Tablet },
    { id: 'accessory', label: 'Phụ kiện di động', icon: Headphones },
    { id: 'sale', label: 'Khuyến mãi Flash Sale', icon: Flame, isHot: true },
  ];

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div className="relative" ref={menuRef}>
      
      {/* Nút trigger Danh mục (theo chuẩn CellphoneS) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        className={`hidden md:flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all border ${
          isOpen? 'bg-ink-deep text-canvas border-ink-deep shadow-xs': 'bg-surface-soft hover:bg-hairline-soft/60 text-ink border-hairline-soft'
        }`}
      >
        <LayoutGrid size={15} className={isOpen? 'text-canvas': 'text-primary'} />
        <span>Danh mục</span>
        <ChevronDown size={13} className={`transition-transform duration-200 ${isOpen? 'rotate-180': ''}`} />
      </button>

      {/* Flyout Mega Menu Container */}
      {isOpen && (
        <div 
          onMouseLeave={() => setIsOpen(false)}
          className="absolute left-0 top-full pt-2 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="bg-canvas border border-hairline-soft rounded-2xl shadow-summary flex overflow-hidden w-[820px] lg:w-[940px] text-xs max-h-[520px]">
            
            {/* CỘT TRÁI: Danh sách các ngành hàng cốt lõi */}
            <div className="w-60 bg-surface-soft/60 border-r border-hairline-soft p-2.5 space-y-1 flex-shrink-0">
              <div className="px-3 py-1.5 text-[10px] font-bold text-steel uppercase tracking-wider">
                Ngành hàng kinh doanh
              </div>

              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onMouseEnter={() => setActiveCategory(cat.id)}
                    onClick={() => {
                      if (cat.id === 'sale') handleNavigate('/products?sale=true');
                      else handleNavigate(`/products?category=${cat.id}`);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all text-left ${
                      isActive? 'bg-canvas text-primary shadow-xs font-black border border-hairline-soft': 'text-charcoal hover:bg-canvas/70 hover:text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${isActive? 'bg-primary/10 text-primary': 'bg-surface-soft text-steel'}`}>
                        <Icon size={15} />
                      </div>
                      <span className="line-clamp-1">{cat.label}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {cat.isHot && (
                        <span className="w-2 h-2 rounded-full bg-critical animate-pulse" />
                      )}
                      <ChevronRight size={13} className={isActive? 'text-primary': 'text-hairline'} />
                    </div>
                  </button>
                );
              })}

              {/* Hỗ trợ & Hỏi đáp FAQ */}
              <div className="pt-2 mt-2 border-t border-hairline-soft">
                <button
                  type="button"
                  onClick={() => handleNavigate('/faq')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-steel hover:text-ink-deep hover:bg-canvas transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle size={15} className="text-primary" />
                    <span>Hỏi đáp & CSKH (FAQ)</span>
                  </div>
                  <ChevronRight size={13} className="text-hairline" />
                </button>
              </div>
            </div>

            {/* CỘT PHẢI: Nội dung Mega Menu chi tiết theo ngành hàng đang active */}
            <div className="flex-1 p-6 overflow-y-auto bg-canvas">
              
              {/* TAB 1: ĐIỆN THOẠI */}
              {activeCategory === 'phone' && (
                <div className="grid grid-cols-3 gap-6">
                  {/* Hãng điện thoại */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Smartphone size={14} className="text-primary" />
                      <span>Hãng điện thoại</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { name: 'Apple iPhone', query: 'Apple' },
                        { name: 'Samsung', query: 'Samsung' },
                        { name: 'Xiaomi', query: 'Xiaomi' },
                        { name: 'OPPO', query: 'OPPO' },
                        { name: 'Sony Xperia', query: 'Sony' },
                        { name: 'Nokia', query: 'Nokia' },
                        { name: 'realme', query: 'realme' },
                        { name: 'Vivo', query: 'Vivo' },
                        { name: 'ASUS ROG', query: 'ASUS' },
                        { name: 'TECNO', query: 'TECNO' },
                      ].map((brand) => (
                        <button
                          key={brand.name}
                          type="button"
                          onClick={() => handleNavigate(`/products?category=phone&brand=${brand.query}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-surface-soft/60 hover:bg-surface-soft hover:text-primary font-medium text-left truncate transition"
                        >
                          {brand.name}
                        </button>
                      ))}
                    </div>

                    {/* Mức giá */}
                    <div className="pt-3 border-t border-hairline-soft space-y-2">
                      <h5 className="font-bold text-ink-deep text-[11px] uppercase tracking-wider">Mức giá điện thoại</h5>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        {[
                          { label: 'Dưới 5 triệu', min: 0, max: 5000000 },
                          { label: '5 - 10 triệu', min: 5000000, max: 10000000 },
                          { label: '10 - 15 triệu', min: 10000000, max: 15000000 },
                          { label: '15 - 20 triệu', min: 15000000, max: 20000000 },
                          { label: 'Trên 20 triệu', min: 20000000, max: 100000000 },
                        ].map((price) => (
                          <button
                            key={price.label}
                            type="button"
                            onClick={() => handleNavigate(`/products?category=phone&minPrice=${price.min}&maxPrice=${price.max}`)}
                            className="text-left text-steel hover:text-primary hover:underline py-0.5 truncate"
                          >
                            • {price.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Dòng điện thoại HOT */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Sparkles size={14} className="text-attention" />
                      <span>Điện thoại HOT ⚡</span>
                    </h4>
                    <div className="space-y-1.5">
                      {[
                        { name: 'iPhone 15 Pro Max', badge: 'Bán chạy' },
                        { name: 'iPhone 15 Pro', badge: 'Ưu đãi' },
                        { name: 'iPhone 15 Plus' },
                        { name: 'Samsung Galaxy S24 Ultra', badge: 'AI Phone' },
                        { name: 'Galaxy Z Fold5 | Z Flip5' },
                        { name: 'Xiaomi 14 Ultra 5G', badge: 'Leica' },
                        { name: 'Xiaomi 13T Pro 5G' },
                        { name: 'Redmi Note 13 Pro+' },
                      ].map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => handleNavigate(`/products?category=phone&q=${encodeURIComponent(item.name)}`)}
                          className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-soft text-left group transition"
                        >
                          <span className="group-hover:text-primary font-medium">{item.name}</span>
                          {item.badge && (
                            <span className="text-[9px] font-bold bg-attention/10 text-attention border border-attention/30 px-1.5 py-0.5 rounded">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nhu cầu & Phân khúc */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Zap size={14} className="text-primary" />
                      <span>Chọn theo nhu cầu</span>
                    </h4>
                    <div className="space-y-1.5">
                      {[
                        { title: 'Flagship cao cấp đỉnh cao', desc: 'Chip xử lý mạnh nhất, hoàn thiện Titan' },
                        { title: 'Chuyên gia nhiếp ảnh', desc: 'Camera zoom quang học, cảm biến 1 inch' },
                        { title: 'Gaming & Đồ họa mượt', desc: 'Tần số quét 120Hz, tản nhiệt buồng hơi' },
                        { title: 'Pin trâu > 5000 mAh', desc: 'Thời lượng sử dụng liên tục 2 ngày' },
                        { title: 'Màn hình gập thế hệ mới', desc: 'Đa nhiệm đỉnh cao, gập mở linh hoạt' },
                      ].map((req, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleNavigate('/products?category=phone')}
                          className="w-full text-left p-2 rounded-lg bg-surface-soft/40 hover:bg-surface-soft transition group"
                        >
                          <div className="font-bold text-ink-deep group-hover:text-primary text-[11px]">{req.title}</div>
                          <div className="text-[10px] text-steel">{req.desc}</div>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleNavigate('/products?category=phone')}
                      className="w-full py-2 bg-ink-deep hover:bg-charcoal text-canvas text-[11px] font-bold rounded-lg text-center transition"
                    >
                      Xem tất cả điện thoại &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: LAPTOP */}
              {activeCategory === 'laptop' && (
                <div className="grid grid-cols-3 gap-6">
                  {/* Hãng Laptop */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Laptop size={14} className="text-primary" />
                      <span>Thương hiệu Laptop</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { name: 'Apple MacBook', query: 'Apple' },
                        { name: 'Dell', query: 'Dell' },
                        { name: 'ASUS', query: 'Asus' },
                        { name: 'Lenovo', query: 'Lenovo' },
                        { name: 'HP', query: 'HP' },
                        { name: 'Acer', query: 'Acer' },
                        { name: 'MSI Gaming', query: 'MSI' },
                        { name: 'LG Gram', query: 'LG' },
                      ].map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => handleNavigate(`/products?category=laptop&brand=${item.query}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-surface-soft/60 hover:bg-surface-soft hover:text-primary font-medium text-left truncate transition"
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-hairline-soft space-y-2">
                      <h5 className="font-bold text-ink-deep text-[11px] uppercase tracking-wider">Khoảng giá Laptop</h5>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        {[
                          { label: 'Dưới 15 triệu', min: 0, max: 15000000 },
                          { label: '15 - 20 triệu', min: 15000000, max: 20000000 },
                          { label: '20 - 30 triệu', min: 20000000, max: 30000000 },
                          { label: 'Trên 30 triệu', min: 30000000, max: 100000000 },
                        ].map((price) => (
                          <button
                            key={price.label}
                            type="button"
                            onClick={() => handleNavigate(`/products?category=laptop&minPrice=${price.min}&maxPrice=${price.max}`)}
                            className="text-left text-steel hover:text-primary hover:underline py-0.5 truncate"
                          >
                            • {price.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Dòng Laptop HOT */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Sparkles size={14} className="text-attention" />
                      <span>Laptop Nổi Bật ⚡</span>
                    </h4>
                    <div className="space-y-1.5">
                      {[
                        { name: 'MacBook Air M2 13.6"', badge: 'Giá cực tốt' },
                        { name: 'MacBook Pro 14" M3 Pro', badge: 'Mạnh mẽ' },
                        { name: 'Dell XPS 13 Plus' },
                        { name: 'Asus ZenBook 14 OLED' },
                        { name: 'Lenovo Legion 5 Gaming', badge: 'RTX 4060' },
                        { name: 'Acer Nitro V 15' },
                        { name: 'HP Pavilion 15' },
                      ].map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => handleNavigate(`/products?category=laptop&q=${encodeURIComponent(item.name)}`)}
                          className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-soft text-left group transition"
                        >
                          <span className="group-hover:text-primary font-medium">{item.name}</span>
                          {item.badge && (
                            <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Phân khúc nhu cầu */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Zap size={14} className="text-primary" />
                      <span>Phân khúc sử dụng</span>
                    </h4>
                    <div className="space-y-1.5">
                      {[
                        { title: 'Học tập - Văn phòng', desc: 'Mỏng nhẹ dưới 1.3kg, pin 10-18 tiếng' },
                        { title: 'Gaming & Streaming', desc: 'Card rời NVIDIA RTX, tản nhiệt kép' },
                        { title: 'Đồ họa - Kỹ thuật', desc: 'Màn hình OLED 100% DCI-P3 chuẩn màu' },
                        { title: 'Doanh nhân sang trọng', desc: 'Bảo mật vân tay/IR camera, vỏ nhôm nguyên khối' },
                      ].map((req, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleNavigate('/products?category=laptop')}
                          className="w-full text-left p-2 rounded-lg bg-surface-soft/40 hover:bg-surface-soft transition group"
                        >
                          <div className="font-bold text-ink-deep group-hover:text-primary text-[11px]">{req.title}</div>
                          <div className="text-[10px] text-steel">{req.desc}</div>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleNavigate('/products?category=laptop')}
                      className="w-full py-2 bg-ink-deep hover:bg-charcoal text-canvas text-[11px] font-bold rounded-lg text-center transition"
                    >
                      Xem tất cả Laptop &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: TABLET (MÁY TÍNH BẢNG) */}
              {activeCategory === 'tablet' && (
                <div className="grid grid-cols-3 gap-6">
                  {/* Hãng máy tính bảng */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Tablet size={14} className="text-primary" />
                      <span>Hãng máy tính bảng</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { name: 'Apple iPad', query: 'Apple' },
                        { name: 'Samsung Tab', query: 'Samsung' },
                        { name: 'Xiaomi Pad', query: 'Xiaomi' },
                        { name: 'Lenovo Tab', query: 'Lenovo' },
                        { name: 'Huawei MatePad', query: 'Huawei' },
                        { name: 'Kindle Máy đọc sách', query: 'Kindle' },
                      ].map((b) => (
                        <button
                          key={b.name}
                          type="button"
                          onClick={() => handleNavigate(`/products?category=tablet&brand=${b.query}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-surface-soft/60 hover:bg-surface-soft hover:text-primary font-medium text-left truncate transition"
                        >
                          {b.name}
                        </button>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-hairline-soft space-y-2">
                      <h5 className="font-bold text-ink-deep text-[11px] uppercase tracking-wider">Khoảng giá Tablet</h5>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        {[
                          { label: 'Dưới 6 triệu', min: 0, max: 6000000 },
                          { label: '6 - 12 triệu', min: 6000000, max: 12000000 },
                          { label: '12 - 20 triệu', min: 12000000, max: 20000000 },
                          { label: 'Trên 20 triệu', min: 20000000, max: 100000000 },
                        ].map((price) => (
                          <button
                            key={price.label}
                            type="button"
                            onClick={() => handleNavigate(`/products?category=tablet&minPrice=${price.min}&maxPrice=${price.max}`)}
                            className="text-left text-steel hover:text-primary hover:underline py-0.5 truncate"
                          >
                            • {price.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tablet HOT */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Sparkles size={14} className="text-attention" />
                      <span>Máy tính bảng HOT ⚡</span>
                    </h4>
                    <div className="space-y-1.5">
                      {[
                        { name: 'iPad Pro 11" M4 (OLED)', badge: 'Mới ra mắt' },
                        { name: 'iPad Air 11" M2', badge: 'Hot' },
                        { name: 'iPad 10.9" (Gen 10)', badge: 'Bán chạy' },
                        { name: 'Samsung Galaxy Tab S9 FE' },
                        { name: 'Galaxy Tab S9 Ultra' },
                        { name: 'Xiaomi Pad 6' },
                        { name: 'Redmi Pad SE' },
                      ].map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => handleNavigate(`/products?category=tablet&q=${encodeURIComponent(item.name)}`)}
                          className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-soft text-left group transition"
                        >
                          <span className="group-hover:text-primary font-medium">{item.name}</span>
                          {item.badge && (
                            <span className="text-[9px] font-bold bg-attention/10 text-attention px-1.5 py-0.5 rounded">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Phụ kiện Tablet */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Gift size={14} className="text-primary" />
                      <span>Phụ kiện Tablet đính kèm</span>
                    </h4>
                    <div className="space-y-1.5">
                      {[
                        { title: 'Bút Apple Pencil Pro / USB-C', desc: 'Độ trễ siêu thấp, cảm ứng lực nhấn' },
                        { title: 'Bàn phím Magic Keyboard', desc: 'Trackpad tích hợp, gõ êm như laptop' },
                        { title: 'Bao da thông minh Smart Folio', desc: 'Tự động tắt/mở màn hình, dựng đa góc' },
                        { title: 'Kính cường lực Paperlike', desc: 'Cảm giác vẽ như viết trên giấy thật' },
                      ].map((acc, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleNavigate('/products?category=accessory')}
                          className="w-full text-left p-2 rounded-lg bg-surface-soft/40 hover:bg-surface-soft transition group"
                        >
                          <div className="font-bold text-ink-deep group-hover:text-primary text-[11px]">{acc.title}</div>
                          <div className="text-[10px] text-steel">{acc.desc}</div>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleNavigate('/products?category=tablet')}
                      className="w-full py-2 bg-ink-deep hover:bg-charcoal text-canvas text-[11px] font-bold rounded-lg text-center transition"
                    >
                      Xem tất cả Tablet &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: PHỤ KIỆN */}
              {activeCategory === 'accessory' && (
                <div className="grid grid-cols-3 gap-6">
                  {/* Nhóm phụ kiện */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Headphones size={14} className="text-primary" />
                      <span>Nhóm Phụ kiện di động</span>
                    </h4>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[
                        { name: 'Tai nghe Bluetooth True Wireless', query: 'AirPods' },
                        { name: 'Củ sạc nhanh GaN (20W - 140W)', query: 'Sạc' },
                        { name: 'Cáp sạc Type-C & Lightning', query: 'Cáp' },
                        { name: 'Pin sạc dự phòng MagSafe', query: 'Pin' },
                        { name: 'Ốp lưng & Bao da cao cấp', query: 'Ốp' },
                        { name: 'Kính cường lực 9H chống nhìn trộm', query: 'Kính' },
                        { name: 'Gậy chụp ảnh & Tripod quay phim', query: 'Tripod' },
                      ].map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => handleNavigate(`/products?category=accessory&q=${encodeURIComponent(item.query)}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-surface-soft/60 hover:bg-surface-soft hover:text-primary font-medium text-left truncate transition"
                        >
                          • {item.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Thương hiệu phụ kiện */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Tag size={14} className="text-primary" />
                      <span>Thương hiệu phụ kiện nổi tiếng</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        'Apple Chính Hãng',
                        'Anker GaN',
                        'Baseus',
                        'Belkin',
                        'Samsung',
                        'Marshall',
                        'Sony Audio',
                        'JBL Pro Sound',
                        'UAG Chống Va Đập',
                        'Spigen Korea',
                      ].map((brand) => (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => handleNavigate(`/products?category=accessory&q=${encodeURIComponent(brand.split(' ')[0])}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-surface-soft/60 hover:bg-surface-soft hover:text-primary font-medium text-left truncate transition text-[11px]"
                        >
                          {brand}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Phụ kiện HOT */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Sparkles size={14} className="text-attention" />
                      <span>Sản phẩm bán chạy ⚡</span>
                    </h4>
                    <div className="space-y-1.5">
                      {[
                        { name: 'Apple AirPods Pro 2 USB-C', price: '4.990.000 đ' },
                        { name: 'Củ sạc Anker Nano 3 30W', price: '350.000 đ' },
                        { name: 'Pin dự phòng Anker 10.000mAh', price: '590.000 đ' },
                        { name: 'Ốp lưng UAG iPhone 15 Pro Max', price: '990.000 đ' },
                        { name: 'Loa Bluetooth Marshall Emberton II', price: '3.990.000 đ' },
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleNavigate(`/products?category=accessory&q=${encodeURIComponent(item.name)}`)}
                          className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-soft text-left group transition"
                        >
                          <span className="group-hover:text-primary font-medium line-clamp-1">{item.name}</span>
                          <span className="text-[10px] font-bold font-mono text-primary flex-shrink-0 ml-2">{item.price}</span>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleNavigate('/products?category=accessory')}
                      className="w-full py-2 bg-ink-deep hover:bg-charcoal text-canvas text-[11px] font-bold rounded-lg text-center transition"
                    >
                      Xem tất cả phụ kiện &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: KHUYẾN MÃI FLASH SALE */}
              {activeCategory === 'sale' && (
                <div className="grid grid-cols-3 gap-6">
                  {/* Chương trình Flash Sale */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Flame size={14} className="text-critical" />
                      <span>Chiến dịch Flash Sale HOT 🔥</span>
                    </h4>
                    <div className="space-y-2">
                      {[
                        { title: 'Flash Sale Đêm Muộn (20h - 24h)', desc: 'Giảm đến 50% cho điện thoại & tablet', hot: true },
                        { title: 'Xả kho công nghệ cuối mùa', desc: 'Giá sốc không lợi nhuận, số lượng giới hạn' },
                        { title: 'Đại tiệc phụ kiện đồng giá 99K', desc: 'Củ sạc, cáp sạc, tai nghe chính hãng' },
                        { title: 'Tuần lễ Apple Brand Day', desc: 'Thu cũ đổi mới trợ giá đến 4.000.000đ' },
                      ].map((sale, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleNavigate('/products?sale=true')}
                          className="w-full text-left p-2.5 rounded-xl bg-critical/5 border border-critical/20 hover:bg-critical/10 transition group"
                        >
                          <div className="font-bold text-critical text-[11px] flex items-center justify-between">
                            <span>{sale.title}</span>
                            {sale.hot && <span className="text-[9px] bg-critical text-canvas px-1.5 py-0.5 rounded font-black">HOT</span>}
                          </div>
                          <div className="text-[10px] text-steel mt-0.5">{sale.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mã Voucher độc quyền */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Tag size={14} className="text-primary" />
                      <span>Voucher độc quyền hôm nay</span>
                    </h4>
                    <div className="space-y-2">
                      {[
                        { code: 'SALE100', discount: 'Giảm 100.000 đ', min: 'Đơn từ 5.000.000 đ' },
                        { code: 'VIPMEMBER', discount: 'Giảm 250.000 đ', min: 'Đơn từ 10.000.000 đ' },
                        { code: 'FLAGSHIP2026', discount: 'Giảm 500.000 đ', min: 'Đơn từ 20.000.000 đ' },
                      ].map((vc) => (
                        <div
                          key={vc.code}
                          className="p-2.5 rounded-xl border border-dashed border-primary/40 bg-surface-soft/60 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-mono font-bold text-primary text-xs bg-canvas px-2 py-0.5 rounded border border-primary/20">
                              {vc.code}
                            </span>
                            <div className="text-[10px] text-steel mt-1">{vc.min}</div>
                          </div>
                          <span className="font-bold text-ink-deep text-xs">{vc.discount}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Đặc quyền mua sắm */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline-soft pb-2">
                      <Gift size={14} className="text-success" />
                      <span>Chính sách & Đặc quyền</span>
                    </h4>
                    <div className="space-y-2 text-[11px] text-charcoal">
                      <div className="p-2.5 rounded-lg bg-surface-soft space-y-1">
                        <strong className="text-ink-deep block">🛡️ Bảo hành 1 đổi 1 trong 30 ngày</strong>
                        <p className="text-[10px] text-steel">Nếu phát sinh lỗi phần cứng từ nhà sản xuất.</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-surface-soft space-y-1">
                        <strong className="text-ink-deep block">💳 Trả góp 0% lãi suất</strong>
                        <p className="text-[10px] text-steel">Hỗ trợ qua thẻ tín dụng hơn 25 ngân hàng liên kết.</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-surface-soft space-y-1">
                        <strong className="text-ink-deep block">🚀 Giao hàng hỏa tốc trong 2 giờ</strong>
                        <p className="text-[10px] text-steel">Nội thành Hà Nội & TP. Hồ Chí Minh.</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleNavigate('/products?sale=true')}
                      className="w-full py-2 bg-critical hover:bg-critical/90 text-canvas text-[11px] font-bold rounded-lg text-center transition shadow-xs"
                    >
                      Khám phá toàn bộ Flash Sale &rarr;
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
