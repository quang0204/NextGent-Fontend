import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCompareStore } from '../stores/compareStore';
import { productService } from '../services/productService';
import { Product } from '../types/product';
import { formatVND } from '../components/common/PriceDisplay';
import { RatingStars } from '../components/common/RatingStars';
import { Scale, Trash2, Plus, ArrowLeft, Check, X } from 'lucide-react';

export const ComparePage: React.FC = () => {
  const { productIds, removeFromCompare, clearCompare } = useCompareStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      const [compared, all] = await Promise.all([
        productService.getCompareProducts(productIds),
        productService.getProducts()
      ]);
      setProducts(compared);
      setAllProducts(all);
      setIsLoading(false);
    };
    fetch();
  }, [productIds]);

  // Lấy danh sách các nhóm thông số chuẩn
  const specFieldNames = [
    { group: 'Màn hình', names: ['Công nghệ màn hình', 'Kích thước màn hình', 'Độ phân giải', 'Độ sáng tối đa'] },
    { group: 'Camera', names: ['Độ phân giải camera', 'Quay phim'] },
    { group: 'Cấu hình', names: ['Chip xử lý (CPU)', 'RAM', 'Hệ điều hành'] },
    { group: 'Pin & Sạc', names: ['Dung lượng pin', 'Công nghệ sạc'] },
  ];

  const getSpecValue = (p: Product, specName: string): string => {
    for (const g of p.specGroups) {
      const match = g.items.find(i => i.name.toLowerCase().includes(specName.toLowerCase()));
      if (match) return match.value;
    }
    return 'Đang cập nhật';
  };

  if (productIds.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-surface-soft rounded-full flex items-center justify-center mx-auto text-primary border border-hairline-soft">
          <Scale size={26} />
        </div>
        <h2 className="text-xl font-medium text-ink-deep">Chưa có sản phẩm nào trong danh sách so sánh</h2>
        <p className="text-xs text-steel max-w-sm mx-auto">
          Bạn có thể nhấn vào biểu tượng cân (So sánh) trên card sản phẩm để so sánh tối đa 3 máy cùng lúc.
        </p>
        <Link
          to="/"
          className="btn-marketing inline-flex items-center gap-2 text-xs font-bold px-6 py-3 rounded-full mt-2"
        >
          <ArrowLeft size={14} />
          <span>Khám phá sản phẩm</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline-soft">
        <div>
          <h1 className="text-2xl font-medium text-ink-deep tracking-tight flex items-center gap-2.5">
            <Scale size={22} className="text-primary" />
            <span>So sánh thông số kỹ thuật</span>
          </h1>
          <p className="text-xs text-steel mt-1">
            So sánh tối đa 3 thiết bị cùng phân khúc để dễ dàng lựa chọn sản phẩm phù hợp nhất
          </p>
        </div>

        <button
          onClick={clearCompare}
          className="text-xs text-steel hover:text-critical flex items-center gap-1.5 self-start sm:self-auto font-medium transition-colors"
        >
          <Trash2 size={14} />
          <span>Xóa bảng so sánh</span>
        </button>
      </div>

      {/* Main Compare Matrix */}
      <div className="bg-canvas border border-hairline-soft rounded-xxl shadow-sticky overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[650px]">
          <tbody>
            
            {/* Row 1: Product Header & Image */}
            <tr className="border-b border-hairline-soft bg-surface-soft/40">
              <td className="p-5 w-48 font-bold text-steel uppercase tracking-wider text-[11px] align-top">
                Sản phẩm so sánh
              </td>
              {products.map((p) => (
                <td key={p.productId} className="p-5 w-64 align-top border-l border-hairline-soft relative">
                  <button
                    onClick={() => removeFromCompare(p.productId)}
                    className="absolute top-3 right-3 text-steel hover:text-critical p-1 transition-colors"
                    title="Xóa khỏi so sánh"
                  >
                    <X size={16} />
                  </button>

                  <div className="w-28 h-28 mx-auto mb-3 bg-surface-soft rounded-xl p-2 border border-hairline-soft flex items-center justify-center">
                    <img
                      src={p.thumbnail}
                      alt={p.name}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/200x200/f1f4f7/5d6c7b?text=NextGen';
                      }}
                    />
                  </div>
                  <Link to={`/product/${p.productId}`} className="font-bold text-ink-deep hover:text-primary block leading-snug">
                    {p.name}
                  </Link>
                  <div className="text-sm font-bold text-ink-deep mt-1 mb-1">
                    {formatVND(p.variants[0]?.salePrice || 0)}
                  </div>
                  <RatingStars rating={p.rating} reviewCount={p.reviewCount} size={11} />

                  <Link
                    to={`/product/${p.productId}`}
                    className="btn-marketing mt-3 block w-full py-2 text-center text-xs font-bold rounded-full shadow-xs"
                  >
                    Xem chi tiết
                  </Link>
                </td>
              ))}
              {products.length < 3 && (
                <td className="p-5 w-64 align-middle border-l border-hairline-soft text-center text-steel">
                  <div className="border-2 border-dashed border-hairline-soft rounded-xl p-6 space-y-2 bg-surface-soft/40">
                    <Plus size={22} className="mx-auto text-steel" />
                    <p className="text-[11px] text-steel">Có thể thêm {3 - products.length} sản phẩm nữa</p>
                    <Link to="/" className="text-xs text-primary font-bold hover:underline block pt-1">
                      + Chọn thêm
                    </Link>
                  </div>
                </td>
              )}
            </tr>

            {/* Spec Fields */}
            {specFieldNames.map((section, sIdx) => (
              <React.Fragment key={sIdx}>
                <tr className="bg-surface-soft text-ink-deep font-bold uppercase tracking-wider text-[11px] border-b border-hairline-soft">
                  <td colSpan={products.length + 2} className="py-2.5 px-5">
                    {section.group}
                  </td>
                </tr>

                {section.names.map((fieldName, fIdx) => (
                  <tr key={fIdx} className="border-b border-hairline-soft hover:bg-surface-soft/30 transition-colors">
                    <td className="p-4 font-medium text-steel bg-surface-soft/20">
                      {fieldName}
                    </td>
                    {products.map((p) => (
                      <td key={p.productId} className="p-4 border-l border-hairline-soft text-charcoal font-medium">
                        {getSpecValue(p, fieldName)}
                      </td>
                    ))}
                    {products.length < 3 && (
                      <td className="p-4 border-l border-hairline-soft bg-surface-soft/20"></td>
                    )}
                  </tr>
                ))}
              </React.Fragment>
            ))}

            {/* Bảo hành row */}
            <tr className="bg-surface-soft text-ink-deep font-bold uppercase tracking-wider text-[11px] border-b border-hairline-soft">
              <td colSpan={products.length + 2} className="py-2.5 px-5">
                Chính sách hậu mãi
              </td>
            </tr>
            <tr className="border-b border-hairline-soft">
              <td className="p-4 font-medium text-steel bg-surface-soft/20">
                Chính sách bảo hành
              </td>
              {products.map((p) => (
                <td key={p.productId} className="p-4 border-l border-hairline-soft text-charcoal text-xs">
                  {p.warrantyPolicy}
                </td>
              ))}
              {products.length < 3 && <td className="border-l border-hairline-soft"></td>}
            </tr>

          </tbody>
        </table>
      </div>

    </div>
  );
};
