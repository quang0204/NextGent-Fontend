import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCompareStore } from '../stores/compareStore';
import { productService } from '../services/productService';
import { Product, ProductVariant } from '../types/product';
import { formatVND } from '../components/common/PriceDisplay';
import { RatingStars } from '../components/common/RatingStars';
import { useToastStore } from '../stores/toastStore';
import {
  Scale,
  Trash2,
  Plus,
  ArrowLeft,
  Check,
  X,
  Search,
  Layers,
  Cpu,
  Info,
  ChevronDown
} from 'lucide-react';

const ATTRIBUTE_LABELS: Record<string, string> = {
  cpu: 'Vi xử lý (CPU) biến thể',
  gpu: 'Card đồ họa (GPU)',
  screen: 'Màn hình riêng',
  edition: 'Phiên bản thị trường',
  wattage: 'Công suất sạc',
  cableLength: 'Chiều dài dây',
  compatibleModel: 'Thiết bị tương thích',
};

export const ComparePage: React.FC = () => {
  const {
    productIds,
    rootCategoryId,
    rootCategoryName,
    selectedVariantIds,
    removeFromCompare,
    clearCompare,
    addToCompare,
    setSelectedVariant,
    setRootCategoryInfo,
  } = useCompareStore();

  const { showToast } = useToastStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal thêm sản phẩm cùng danh mục
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetch = async () => {
      setIsLoading(true);
      try {
        const [compareResult, all] = await Promise.all([
          productService.getCompareProducts(productIds),
          productService.getProducts(),
        ]);

        if (!isMounted) return;

        setProducts(compareResult.products || []);
        setAllProducts(all || []);

        if (compareResult.rootCategory) {
          setRootCategoryInfo(
            compareResult.rootCategory.categoryId ?? compareResult.rootCategory.rootCategoryId,
            compareResult.rootCategory.name ?? compareResult.rootCategory.rootCategoryName
          );
        } else if (compareResult.products.length > 0) {
          const first = compareResult.products[0];
          const resolvedRootId = first.rootCategoryId ?? first.parentCategoryId ?? first.categoryId ?? null;
          const resolvedRootName = first.rootCategoryName ?? first.categoryName ?? null;
          setRootCategoryInfo(resolvedRootId, resolvedRootName);
        }
      } catch (err: any) {
        console.error('Lỗi tải dữ liệu so sánh:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetch();

    return () => {
      isMounted = false;
    };
  }, [productIds, setRootCategoryInfo]);

  // Xác định danh mục cha hiện hành của nhóm so sánh
  const currentRootName = useMemo(() => {
    if (rootCategoryName) return rootCategoryName;
    if (products.length > 0) {
      return products[0].rootCategoryName || products[0].categoryName || 'Sản phẩm cùng loại';
    }
    return null;
  }, [rootCategoryName, products]);

  const currentRootId = useMemo(() => {
    if (rootCategoryId !== null && rootCategoryId !== undefined) return rootCategoryId;
    if (products.length > 0) {
      return products[0].rootCategoryId ?? products[0].parentCategoryId ?? products[0].categoryId ?? null;
    }
    return null;
  }, [rootCategoryId, products]);

  // Danh sách biến thể được chọn cho từng sản phẩm
  const activeVariants = useMemo(() => {
    const map = new Map<number, ProductVariant>();
    for (const p of products) {
      const selectedId = selectedVariantIds[p.productId];
      const found = p.variants?.find((v) => v.variantId === selectedId) || p.variants?.[0];
      if (found) {
        map.set(p.productId, found);
      }
    }
    return map;
  }, [products, selectedVariantIds]);

  // Thuộc tính riêng của các biến thể đang được so sánh
  const hasRam = useMemo(() => products.some((p) => {
    const v = activeVariants.get(p.productId);
    return v && typeof v.ramGb === 'number' && v.ramGb > 0;
  }), [products, activeVariants]);

  const hasRom = useMemo(() => products.some((p) => {
    const v = activeVariants.get(p.productId);
    return v && typeof v.romGb === 'number' && v.romGb > 0;
  }), [products, activeVariants]);

  const hasConnectionType = useMemo(() => products.some((p) => {
    const v = activeVariants.get(p.productId);
    return Boolean(v?.connectionType);
  }), [products, activeVariants]);

  // Danh sách các key attributes mở rộng khác của biến thể (attributes json)
  const variantAttributeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const p of products) {
      const v = activeVariants.get(p.productId);
      if (v?.attributes && typeof v.attributes === 'object') {
        Object.keys(v.attributes).forEach((k) => keys.add(k));
      }
    }
    return Array.from(keys);
  }, [products, activeVariants]);

  // Thu thập danh sách thông số chung (cấp cha / sản phẩm) gom theo nhóm
  const dynamicSpecGroups = useMemo(() => {
    const groupMap = new Map<string, Set<string>>();

    for (const p of products) {
      if (Array.isArray(p.specGroups)) {
        for (const g of p.specGroups) {
          const groupName = g.groupName?.trim() || 'Thông số chung';
          if (!groupMap.has(groupName)) {
            groupMap.set(groupName, new Set());
          }
          const itemSet = groupMap.get(groupName)!;
          for (const item of g.items || []) {
            if (item.name?.trim()) {
              itemSet.add(item.name.trim());
            }
          }
        }
      }
    }

    const result: Array<{ groupName: string; itemNames: string[] }> = [];
    groupMap.forEach((items, groupName) => {
      result.push({
        groupName,
        itemNames: Array.from(items),
      });
    });

    return result;
  }, [products]);

  const getSpecValue = (p: Product, groupName: string, specName: string): string => {
    if (!p.specGroups) return '—';
    const group = p.specGroups.find(
      (g) => g.groupName?.trim().toLowerCase() === groupName.toLowerCase()
    );
    if (!group) return '—';
    const match = group.items?.find(
      (i) => i.name?.trim().toLowerCase() === specName.toLowerCase()
    );
    return match?.value?.trim() || '—';
  };

  // Danh sách sản phẩm gợi ý thêm vào bảng so sánh (bắt buộc cùng danh mục cha, không áp dụng cho phụ kiện)
  const candidateProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (productIds.includes(p.productId)) return false;

      // Loại bỏ sản phẩm ngành hàng phụ kiện
      const pRoot = (p.rootCategoryName || p.categoryName || '').toLowerCase();
      const pCat = (p.categoryName || '').toLowerCase();
      const pRootId = p.rootCategoryId ?? p.parentCategoryId ?? p.categoryId;
      if (
        pRootId === 4 ||
        p.categoryId === 4 ||
        p.parentCategoryId === 4 ||
        pRoot.includes('phụ kiện') ||
        pCat.includes('phụ kiện') ||
        pCat.includes('tai nghe') ||
        pCat.includes('loa') ||
        pCat.includes('củ sạc') ||
        pCat.includes('cáp')
      ) {
        return false;
      }

      // Kiểm tra cùng rootCategoryId
      if (currentRootId !== null && p.rootCategoryId !== undefined && p.rootCategoryId !== null) {
        if (Number(p.rootCategoryId) !== Number(currentRootId)) return false;
      } else if (currentRootName) {
        const pRoot = (p.rootCategoryName || p.categoryName || '').toLowerCase();
        const cRoot = currentRootName.toLowerCase();
        if (pRoot && cRoot && !pRoot.includes(cRoot) && !cRoot.includes(pRoot)) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchName = p.name.toLowerCase().includes(query);
        const matchBrand = p.brandName.toLowerCase().includes(query);
        if (!matchName && !matchBrand) return false;
      }

      return true;
    });
  }, [allProducts, productIds, currentRootId, currentRootName, searchQuery]);

  const handleAddCandidate = (candidate: Product) => {
    const res = addToCompare(candidate);
    if (!res.success) {
      showToast(res.message, 'warning');
    } else {
      showToast(`Đã thêm "${candidate.name}" vào bảng so sánh!`, 'success');
      setShowAddModal(false);
      setSearchQuery('');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-steel font-medium">Đang tải dữ liệu so sánh...</p>
      </div>
    );
  }

  if (productIds.length === 0 || products.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-surface-soft rounded-full flex items-center justify-center mx-auto text-primary border border-hairline-soft">
          <Scale size={26} />
        </div>
        <h2 className="text-xl font-bold text-ink-deep">Chưa có sản phẩm nào trong danh sách so sánh</h2>
        <p className="text-xs text-steel max-w-md mx-auto leading-relaxed">
          Bạn có thể nhấn vào nút <strong>So sánh</strong> ở trang chi tiết bất kỳ sản phẩm nào để bắt đầu so sánh. 
          Các sản phẩm so sánh tiếp theo sẽ bắt buộc phải cùng danh mục cha (ví dụ: Điện thoại di động, Laptop,...) để đảm bảo tính chuẩn xác.
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline-soft">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-ink-deep tracking-tight flex items-center gap-2.5">
              <Scale size={22} className="text-primary" />
              <span>So sánh thông số kỹ thuật</span>
            </h1>
            {currentRootName && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                Nhóm: {currentRootName}
              </span>
            )}
          </div>
          <p className="text-xs text-steel mt-1">
            So sánh tối đa 3 sản phẩm cùng danh mục cha ({currentRootName || 'cùng loại'}) kèm thông số chi tiết theo từng biến thể
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {products.length < 3 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-marketing text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={14} />
              <span>Thêm sản phẩm</span>
            </button>
          )}

          <button
            onClick={clearCompare}
            className="text-xs text-steel hover:text-critical flex items-center gap-1.5 font-medium transition-colors border border-hairline-soft rounded-full px-3.5 py-2 hover:border-critical/30"
          >
            <Trash2 size={14} />
            <span>Xóa bảng so sánh</span>
          </button>
        </div>
      </div>

      {/* Main Compare Matrix */}
      <div className="bg-canvas border border-hairline-soft rounded-xxl shadow-sticky overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[720px]">
          <tbody>
            {/* Row 1: Header / Product Cards & Variant Selector */}
            <tr className="border-b border-hairline-soft bg-surface-soft/40">
              <td className="p-5 w-56 font-bold text-steel uppercase tracking-wider text-[11px] align-top">
                Sản phẩm so sánh
              </td>
              {products.map((p) => {
                const curVar = activeVariants.get(p.productId) || p.variants?.[0];
                const displayImg = curVar?.imageUrl || p.thumbnail;
                const effectiveSale = curVar?.salePrice || 0;
                const effectiveList = curVar?.listPrice || 0;

                return (
                  <td
                    key={p.productId}
                    className="p-5 w-72 align-top border-l border-hairline-soft relative bg-canvas"
                  >
                    <button
                      onClick={() => removeFromCompare(p.productId)}
                      className="absolute top-3 right-3 text-steel hover:text-critical p-1 transition-colors rounded-full hover:bg-surface-soft"
                      title="Xóa khỏi so sánh"
                    >
                      <X size={16} />
                    </button>

                    {/* Thumbnail */}
                    <div className="w-32 h-32 mx-auto mb-3 bg-surface-soft rounded-xl p-2 border border-hairline-soft flex items-center justify-center">
                      <img
                        src={displayImg}
                        alt={p.name}
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://placehold.co/200x200/f1f4f7/5d6c7b?text=NextGen';
                        }}
                      />
                    </div>

                    {/* Product Name */}
                    <Link
                      to={`/product/${p.productId}`}
                      className="font-bold text-ink-deep hover:text-primary block leading-snug text-sm min-h-[38px]"
                    >
                      {p.name}
                    </Link>

                    {/* Star Rating */}
                    <div className="mt-1 mb-2">
                      <RatingStars rating={p.rating} reviewCount={p.reviewCount} size={11} />
                    </div>

                    {/* Variant Selector Dropdown */}
                    {p.variants && p.variants.length > 0 && (
                      <div className="mt-2 mb-3 bg-surface-soft/60 rounded-xl p-2 border border-hairline-soft/80">
                        <label className="text-[10px] font-bold text-steel uppercase tracking-wider block mb-1">
                          Chọn biến thể so sánh:
                        </label>
                        <div className="relative">
                          <select
                            value={curVar?.variantId}
                            onChange={(e) =>
                              setSelectedVariant(p.productId, Number(e.target.value))
                            }
                            className="w-full text-xs font-semibold py-1.5 px-2 pr-7 rounded-lg border border-hairline-soft bg-canvas text-ink-deep focus:border-primary focus:outline-none appearance-none cursor-pointer"
                          >
                            {p.variants.map((v) => (
                              <option key={v.variantId} value={v.variantId}>
                                {v.variantName || `${v.color || 'Màu tiêu chuẩn'} ${v.romGb ? `- ${v.romGb}GB` : ''}`} ({formatVND(v.salePrice)})
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={14}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-steel pointer-events-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Price */}
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-base font-bold text-ink-deep">
                        {formatVND(effectiveSale)}
                      </span>
                      {effectiveList > effectiveSale && (
                        <span className="text-xs text-steel line-through">
                          {formatVND(effectiveList)}
                        </span>
                      )}
                    </div>

                    {/* Action Button */}
                    <Link
                      to={`/product/${p.productId}`}
                      className="btn-marketing block w-full py-2 text-center text-xs font-bold rounded-full shadow-xs"
                    >
                      Xem chi tiết
                    </Link>
                  </td>
                );
              })}

              {/* Slot "+ Chọn thêm" nếu còn trống */}
              {products.length < 3 && (
                <td className="p-5 w-72 align-middle border-l border-hairline-soft text-center bg-surface-soft/20">
                  <div className="border-2 border-dashed border-hairline-soft rounded-2xl p-6 space-y-2 bg-surface-soft/40">
                    <div className="w-10 h-10 rounded-full bg-surface-soft border border-hairline-soft flex items-center justify-center mx-auto text-steel">
                      <Plus size={20} />
                    </div>
                    <p className="text-xs font-bold text-ink-deep">Thêm sản phẩm đối đầu</p>
                    <p className="text-[11px] text-steel">
                      (Bắt buộc cùng danh mục: <strong className="text-primary">{currentRootName}</strong>)
                    </p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="btn-marketing mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full shadow-xs"
                    >
                      <Plus size={13} />
                      <span>Chọn sản phẩm</span>
                    </button>
                  </div>
                </td>
              )}
            </tr>

            {/* ========================================================================= */}
            {/* SECTION 1: THÔNG SỐ RIÊNG CỦA BIẾN THỂ ĐƯỢC CHỌN */}
            {/* ========================================================================= */}
            <tr className="bg-primary/5 text-primary font-bold uppercase tracking-wider text-[11px] border-y border-primary/20">
              <td colSpan={products.length + (products.length < 3 ? 2 : 1)} className="py-3 px-5 flex items-center gap-2">
                <Layers size={14} className="text-primary" />
                <span>1. Thông số riêng theo biến thể đã chọn</span>
              </td>
            </tr>

            {/* Tên / Phiên bản biến thể */}
            <tr className="border-b border-hairline-soft hover:bg-surface-soft/30 transition-colors">
              <td className="p-4 font-bold text-steel bg-surface-soft/20">
                Tên biến thể / SKU
              </td>
              {products.map((p) => {
                const curVar = activeVariants.get(p.productId);
                return (
                  <td key={p.productId} className="p-4 border-l border-hairline-soft text-charcoal font-semibold">
                    <div>{curVar?.variantName || 'Bản tiêu chuẩn'}</div>
                    <div className="text-[10px] text-steel font-mono mt-0.5">{curVar?.sku}</div>
                  </td>
                );
              })}
              {products.length < 3 && <td className="p-4 border-l border-hairline-soft bg-surface-soft/10" />}
            </tr>

            {/* Giá bán hiện hành */}
            <tr className="border-b border-hairline-soft hover:bg-surface-soft/30 transition-colors">
              <td className="p-4 font-bold text-steel bg-surface-soft/20">
                Giá bán hiện hành
              </td>
              {products.map((p) => {
                const curVar = activeVariants.get(p.productId);
                return (
                  <td key={p.productId} className="p-4 border-l border-hairline-soft font-bold text-ink-deep text-sm">
                    {formatVND(curVar?.salePrice || 0)}
                  </td>
                );
              })}
              {products.length < 3 && <td className="p-4 border-l border-hairline-soft bg-surface-soft/10" />}
            </tr>

            {/* Giá gốc niêm yết */}
            <tr className="border-b border-hairline-soft hover:bg-surface-soft/30 transition-colors">
              <td className="p-4 font-bold text-steel bg-surface-soft/20">
                Giá niêm yết gốc
              </td>
              {products.map((p) => {
                const curVar = activeVariants.get(p.productId);
                const hasList = (curVar?.listPrice || 0) > (curVar?.salePrice || 0);
                return (
                  <td key={p.productId} className="p-4 border-l border-hairline-soft text-steel">
                    {hasList ? formatVND(curVar!.listPrice) : 'Không áp dụng'}
                  </td>
                );
              })}
              {products.length < 3 && <td className="p-4 border-l border-hairline-soft bg-surface-soft/10" />}
            </tr>

            {/* Tình trạng tồn kho */}
            <tr className="border-b border-hairline-soft hover:bg-surface-soft/30 transition-colors">
              <td className="p-4 font-bold text-steel bg-surface-soft/20">
                Tình trạng hàng
              </td>
              {products.map((p) => {
                const curVar = activeVariants.get(p.productId);
                const inStock = (curVar?.availableQty || 0) > 0;
                return (
                  <td key={p.productId} className="p-4 border-l border-hairline-soft">
                    {inStock ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                        <Check size={12} /> Còn hàng
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                        <X size={12} /> Hết hàng
                      </span>
                    )}
                  </td>
                );
              })}
              {products.length < 3 && <td className="p-4 border-l border-hairline-soft bg-surface-soft/10" />}
            </tr>

            {/* Màu sắc */}
            <tr className="border-b border-hairline-soft hover:bg-surface-soft/30 transition-colors">
              <td className="p-4 font-bold text-steel bg-surface-soft/20">
                Màu sắc biến thể
              </td>
              {products.map((p) => {
                const curVar = activeVariants.get(p.productId);
                return (
                  <td key={p.productId} className="p-4 border-l border-hairline-soft text-charcoal font-medium">
                    {curVar?.color || 'Mặc định'}
                  </td>
                );
              })}
              {products.length < 3 && <td className="p-4 border-l border-hairline-soft bg-surface-soft/10" />}
            </tr>

            {/* RAM (nếu danh mục có thông số RAM) */}
            {hasRam && (
              <tr className="border-b border-hairline-soft hover:bg-surface-soft/30 transition-colors">
                <td className="p-4 font-bold text-steel bg-surface-soft/20">
                  Dung lượng RAM
                </td>
                {products.map((p) => {
                  const curVar = activeVariants.get(p.productId);
                  return (
                    <td key={p.productId} className="p-4 border-l border-hairline-soft text-charcoal font-semibold">
                      {curVar?.ramGb ? `${curVar.ramGb} GB` : '—'}
                    </td>
                  );
                })}
                {products.length < 3 && <td className="p-4 border-l border-hairline-soft bg-surface-soft/10" />}
              </tr>
            )}

            {/* ROM / Dung lượng lưu trữ */}
            {hasRom && (
              <tr className="border-b border-hairline-soft hover:bg-surface-soft/30 transition-colors">
                <td className="p-4 font-bold text-steel bg-surface-soft/20">
                  Bộ nhớ trong / Ổ cứng (ROM/SSD)
                </td>
                {products.map((p) => {
                  const curVar = activeVariants.get(p.productId);
                  const romVal = curVar?.romGb;
                  return (
                    <td key={p.productId} className="p-4 border-l border-hairline-soft text-charcoal font-semibold">
                      {romVal ? (romVal >= 1024 ? `${romVal / 1024} TB` : `${romVal} GB`) : '—'}
                    </td>
                  );
                })}
                {products.length < 3 && <td className="p-4 border-l border-hairline-soft bg-surface-soft/10" />}
              </tr>
            )}

            {/* Chuẩn kết nối */}
            {hasConnectionType && (
              <tr className="border-b border-hairline-soft hover:bg-surface-soft/30 transition-colors">
                <td className="p-4 font-bold text-steel bg-surface-soft/20">
                  Chuẩn kết nối
                </td>
                {products.map((p) => {
                  const curVar = activeVariants.get(p.productId);
                  return (
                    <td key={p.productId} className="p-4 border-l border-hairline-soft text-charcoal font-medium">
                      {curVar?.connectionType || '—'}
                    </td>
                  );
                })}
                {products.length < 3 && <td className="p-4 border-l border-hairline-soft bg-surface-soft/10" />}
              </tr>
            )}

            {/* Thuộc tính riêng mở rộng từ attributes JSON */}
            {variantAttributeKeys.map((attrKey) => {
              const label = ATTRIBUTE_LABELS[attrKey] || attrKey;
              return (
                <tr key={attrKey} className="border-b border-hairline-soft hover:bg-surface-soft/30 transition-colors">
                  <td className="p-4 font-bold text-steel bg-surface-soft/20">
                    {label}
                  </td>
                  {products.map((p) => {
                    const curVar = activeVariants.get(p.productId);
                    const val = curVar?.attributes?.[attrKey];
                    return (
                      <td key={p.productId} className="p-4 border-l border-hairline-soft text-charcoal font-medium">
                        {val !== undefined && val !== null ? String(val) : '—'}
                      </td>
                    );
                  })}
                  {products.length < 3 && <td className="p-4 border-l border-hairline-soft bg-surface-soft/10" />}
                </tr>
              );
            })}

            {/* ========================================================================= */}
            {/* SECTION 2: THÔNG SỐ CHUNG CỦA CẤP CHA / SẢN PHẨM */}
            {/* ========================================================================= */}
            <tr className="bg-surface-soft text-ink-deep font-bold uppercase tracking-wider text-[11px] border-y border-hairline-soft">
              <td colSpan={products.length + (products.length < 3 ? 2 : 1)} className="py-3 px-5 flex items-center gap-2">
                <Cpu size={14} className="text-steel" />
                <span>2. Thông số chung của cấp cha ({currentRootName})</span>
              </td>
            </tr>

            {/* Thông số kỹ thuật động theo nhóm specGroups */}
            {dynamicSpecGroups.length > 0 ? (
              dynamicSpecGroups.map((group, gIdx) => (
                <React.Fragment key={gIdx}>
                  <tr className="bg-surface-soft/60 text-ink-deep font-bold tracking-wider text-[11px] border-b border-hairline-soft">
                    <td colSpan={products.length + (products.length < 3 ? 2 : 1)} className="py-2 px-5 text-steel uppercase">
                      {group.groupName}
                    </td>
                  </tr>

                  {group.itemNames.map((specName, sIdx) => (
                    <tr key={sIdx} className="border-b border-hairline-soft hover:bg-surface-soft/30 transition-colors">
                      <td className="p-4 font-medium text-steel bg-surface-soft/20">
                        {specName}
                      </td>
                      {products.map((p) => (
                        <td key={p.productId} className="p-4 border-l border-hairline-soft text-charcoal font-medium">
                          {getSpecValue(p, group.groupName, specName)}
                        </td>
                      ))}
                      {products.length < 3 && (
                        <td className="p-4 border-l border-hairline-soft bg-surface-soft/10" />
                      )}
                    </tr>
                  ))}
                </React.Fragment>
              ))
            ) : (
              <tr className="border-b border-hairline-soft">
                <td className="p-4 text-steel italic" colSpan={products.length + 2}>
                  Đang đồng bộ thông số kỹ thuật chung từ danh mục cha...
                </td>
              </tr>
            )}

            {/* ========================================================================= */}
            {/* SECTION 3: THÔNG TIN HẬU MÃI & THƯƠNG HIỆU */}
            {/* ========================================================================= */}
            <tr className="bg-surface-soft text-ink-deep font-bold uppercase tracking-wider text-[11px] border-y border-hairline-soft">
              <td colSpan={products.length + (products.length < 3 ? 2 : 1)} className="py-3 px-5 flex items-center gap-2">
                <Info size={14} className="text-steel" />
                <span>3. Thông tin thương hiệu & Chính sách</span>
              </td>
            </tr>

            {/* Thương hiệu */}
            <tr className="border-b border-hairline-soft hover:bg-surface-soft/30 transition-colors">
              <td className="p-4 font-medium text-steel bg-surface-soft/20">
                Thương hiệu (Hãng SX)
              </td>
              {products.map((p) => (
                <td key={p.productId} className="p-4 border-l border-hairline-soft text-charcoal font-bold">
                  {p.brandName}
                </td>
              ))}
              {products.length < 3 && <td className="p-4 border-l border-hairline-soft bg-surface-soft/10" />}
            </tr>

            {/* Danh mục chi tiết */}
            <tr className="border-b border-hairline-soft hover:bg-surface-soft/30 transition-colors">
              <td className="p-4 font-medium text-steel bg-surface-soft/20">
                Danh mục phân loại
              </td>
              {products.map((p) => (
                <td key={p.productId} className="p-4 border-l border-hairline-soft text-charcoal">
                  {p.categoryName}
                </td>
              ))}
              {products.length < 3 && <td className="p-4 border-l border-hairline-soft bg-surface-soft/10" />}
            </tr>

            {/* Chính sách bảo hành */}
            <tr className="border-b border-hairline-soft hover:bg-surface-soft/30 transition-colors">
              <td className="p-4 font-medium text-steel bg-surface-soft/20">
                Chính sách bảo hành
              </td>
              {products.map((p) => (
                <td key={p.productId} className="p-4 border-l border-hairline-soft text-charcoal text-xs leading-relaxed">
                  {p.warrantyPolicy || 'Bảo hành 12 tháng chính hãng'}
                </td>
              ))}
              {products.length < 3 && <td className="p-4 border-l border-hairline-soft bg-surface-soft/10" />}
            </tr>

          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* MODAL THÊM SẢN PHẨM CÙNG DANH MỤC CHA */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-ink-deep/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline-soft rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-hairline-soft flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-ink-deep flex items-center gap-2">
                  <Plus size={18} className="text-primary" />
                  <span>Chọn sản phẩm cùng danh mục</span>
                </h3>
                <p className="text-xs text-steel mt-0.5">
                  Chỉ cho phép so sánh các thiết bị cùng nhóm:{' '}
                  <strong className="text-primary">{currentRootName}</strong>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSearchQuery('');
                }}
                className="text-steel hover:text-ink p-1.5 rounded-full hover:bg-surface-soft transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Search */}
            <div className="p-4 border-b border-hairline-soft bg-surface-soft/30">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-steel" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Tìm nhanh máy thuộc nhóm ${currentRootName || ''}...`}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-hairline-soft bg-canvas focus:outline-none focus:border-primary"
                  autoFocus
                />
              </div>
            </div>

            {/* Modal List */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-hairline-soft/60">
              {candidateProducts.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-xs text-steel">
                    Không tìm thấy sản phẩm nào khác cùng nhóm{' '}
                    <strong>{currentRootName}</strong> phù hợp với tìm kiếm.
                  </p>
                </div>
              ) : (
                candidateProducts.map((cand) => (
                  <div
                    key={cand.productId}
                    className="py-3 flex items-center justify-between gap-4 hover:bg-surface-soft/40 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-surface-soft rounded-lg p-1 border border-hairline-soft flex items-center justify-center shrink-0">
                        <img
                          src={cand.thumbnail}
                          alt={cand.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-ink-deep leading-snug">
                          {cand.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-semibold text-primary">
                            {formatVND(cand.variants[0]?.salePrice || 0)}
                          </span>
                          <span className="text-[10px] text-steel">
                            • {cand.brandName} • {cand.categoryName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddCandidate(cand)}
                      className="btn-marketing shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-xs"
                    >
                      + Thêm so sánh
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-surface-soft/50 border-t border-hairline-soft text-right">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSearchQuery('');
                }}
                className="text-xs text-steel hover:text-ink font-semibold px-4 py-1.5 rounded-lg"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
