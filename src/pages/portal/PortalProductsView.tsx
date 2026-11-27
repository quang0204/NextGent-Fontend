import React, { useState, useEffect, useMemo, useRef } from 'react';
import { sharedStore } from '../../services/sharedStore';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/categoryService';
import { brandService } from '../../services/brandService';
import { inventoryService } from '../../services/inventoryService';
import { Product, Brand, ProductVariant, ProductSpecGroup, VariantSchemaField } from '../../types/product';
import { variantSchemaService } from '../../services/variantSchemaService';
import { useToastStore } from '../../stores/toastStore';
import { DynamicVariantInputs } from '../../components/portal/DynamicVariantInputs';
import { ProductSpecsEditor } from '../../components/portal/ProductSpecsEditor';
import { ProductImagesManager } from '../../components/portal/ProductImagesManager';
import { PortalPagination } from '../../components/portal/PortalPagination';
import { StockAdjustmentModal } from '../../components/portal/StockAdjustmentModal';
import { formatVND } from '../../components/common/PriceDisplay';
import { 
  Smartphone, 
  Tag, 
  Plus, 
  Trash2, 
  Edit, 
  AlertCircle, 
  ShieldAlert, 
  Search, 
  CheckCircle,
  Eye,
  EyeOff,
  Layers,
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  Check,
  Lock,
  Unlock,
  Boxes,
  Loader2,
  SlidersHorizontal,
  FileText,
  Package,
  RefreshCw,
  UploadCloud
} from 'lucide-react';

interface DraftVariant {
  sku: string;
  color: string;
  colorHex?: string;
  ramGb?: number;
  romGb?: number;
  connectionType?: string;
  attributes?: Record<string, any>;
  listPrice: number;
  salePrice: number;
  initialStock: number;
  isActive: boolean;
  imageUrl?: string;
}

const createEmptyDraftVariant = (): DraftVariant => ({
  sku: '',
  color: '',
  colorHex: '#000000',
  ramGb: undefined,
  romGb: undefined,
  connectionType: undefined,
  attributes: {},
  listPrice: 0,
  salePrice: 0,
  initialStock: 0,
  isActive: true,
});

const PAUSED_VARIANTS_STORAGE_KEY = 'ng_individually_paused_variants_v1';

const readPausedVariantsMap = (): Record<string, number[]> => {
  try {
    const raw = localStorage.getItem(PAUSED_VARIANTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const getSavedPausedVariantIds = (productId: number): number[] => {
  const map = readPausedVariantsMap();
  const list = map[String(productId)];
  return Array.isArray(list) ? list.map(Number) : [];
};

const savePausedVariantIds = (productId: number, variantIds: number[]): void => {
  try {
    const map = readPausedVariantsMap();
    if (variantIds.length > 0) {
      map[String(productId)] = Array.from(new Set(variantIds.map(Number)));
    } else {
      delete map[String(productId)];
    }
    localStorage.setItem(PAUSED_VARIANTS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
};

const markVariantIndividuallyPaused = (productId: number, variantId: number, isPaused: boolean): void => {
  const current = getSavedPausedVariantIds(productId);
  const next = isPaused
    ? Array.from(new Set([...current, Number(variantId)]))
    : current.filter(id => id !== Number(variantId));
  savePausedVariantIds(productId, next);
};

export const PortalProductsView: React.FC = () => {
  const { showToast } = useToastStore();
  const [products, setProducts] = useState<Product[]>(sharedStore.getProducts());
  const [brands, setBrands] = useState<Brand[]>(sharedStore.getBrands());
  const [categories, setCategories] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState('');

  // Modal Thêm sản phẩm mới (không setup dữ liệu mẫu)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newWarranty, setNewWarranty] = useState('');
  const [newThumbnail, setNewThumbnail] = useState('');

  // Thư viện ảnh (Product_Images)
  const [newGallery, setNewGallery] = useState<string[]>([]);

  // Thông số kỹ thuật (Product_Specs)
  const [newSpecGroups, setNewSpecGroups] = useState<ProductSpecGroup[]>([]);

  // Variant Schema động theo ngành hàng được chọn
  const [variantSchema, setVariantSchema] = useState<VariantSchemaField[]>([]);

  // Danh sách biến thể SKU (Product_Variants)
  const [draftVariants, setDraftVariants] = useState<DraftVariant[]>(() => [createEmptyDraftVariant()]);

  const [addFormErrors, setAddFormErrors] = useState<Record<string, string>>({});
  const addProdNameRef = useRef<HTMLInputElement | null>(null);
  const addVariantFieldRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const focusAddField = (el: HTMLInputElement | null) => {
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      el.focus();
      el.select?.();
    }, 50);
  };

  const handleAddDraftVariant = () => {
    setDraftVariants([...draftVariants, createEmptyDraftVariant()]);
  };

  const handleUpdateDraftVariant = (idx: number, field: keyof DraftVariant, val: any) => {
    const updated = [...draftVariants];
    updated[idx] = {...updated[idx], [field]: val };
    setDraftVariants(updated);
    const errKey = `${String(field)}-${idx}`;
    if (addFormErrors[errKey] || ((field === 'listPrice' || field === 'salePrice') && (addFormErrors[`listPrice-${idx}`] || addFormErrors[`salePrice-${idx}`]))) {
      setAddFormErrors(prev => {
        const next = { ...prev };
        delete next[errKey];
        if (field === 'listPrice' || field === 'salePrice') {
          delete next[`listPrice-${idx}`];
          delete next[`salePrice-${idx}`];
        }
        return next;
      });
    }
  };

  const handleRemoveDraftVariant = (idx: number) => {
    if (draftVariants.length <= 1) {
      alert('Sản phẩm phải có ít nhất một biến thể SKU!');
      return;
    }
    setDraftVariants(draftVariants.filter((_, i) => i!== idx));
  };

  // Modal Chỉnh sửa Sản phẩm & Biến thể đầy đủ (Master-Detail Admin Edit Modal)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdCategory, setEditProdCategory] = useState('');
  const [editProdBrand, setEditProdBrand] = useState('');
  const [editProdThumbnail, setEditProdThumbnail] = useState('');
  const [editProdGallery, setEditProdGallery] = useState<string[]>([]);
  const [editProdDescription, setEditProdDescription] = useState('');
  const [editProdWarrantyPolicy, setEditProdWarrantyPolicy] = useState('');
  const [editProdStatus, setEditProdStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editProdSpecGroups, setEditProdSpecGroups] = useState<ProductSpecGroup[]>([]);
  const [editProdVariants, setEditProdVariants] = useState<any[]>([]);
  const [isLoadingProductDetail, setIsLoadingProductDetail] = useState(false);
  const [savingVariantId, setSavingVariantId] = useState<number | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Modal xác nhận mở bán lại sản phẩm (giữ nguyên trạng thái biến thể đã tắt riêng)
  const [reactivatingModal, setReactivatingModal] = useState<{
    product: Product;
    variantStates: Record<number, boolean>;
    prePausedIds: number[];
  } | null>(null);
  const [isReactivatingProduct, setIsReactivatingProduct] = useState(false);

  // Thêm biến thể mới trong Modal sửa sản phẩm
  const [showAddVariantInEdit, setShowAddVariantInEdit] = useState(false);
  const [newVarDraftInEdit, setNewVarDraftInEdit] = useState<DraftVariant>(() => createEmptyDraftVariant());
  const [addVarInEditError, setAddVarInEditError] = useState('');
  const [isAddingVariantInEdit, setIsAddingVariantInEdit] = useState(false);

  // Modal Điều chỉnh tồn kho (Stock Adjustment)
  const [adjustingVariant, setAdjustingVariant] = useState<any | null>(null);

  // Modal Chỉnh sửa Biến thể SKU đã thêm (Ảnh, Giá, Thuộc tính động)
  const [editingVariant, setEditingVariant] = useState<{ prodId: number; variant: ProductVariant } | null>(null);
  const [editVariantSchema, setEditVariantSchema] = useState<VariantSchemaField[]>([]);
  const [editVariantImage, setEditVariantImage] = useState('');
  const [editVariantColor, setEditVariantColor] = useState('');
  const [editVariantColorHex, setEditVariantColorHex] = useState('#000000');
  const [editVariantRamGb, setEditVariantRamGb] = useState<number | undefined>(undefined);
  const [editVariantRomGb, setEditVariantRomGb] = useState<number | undefined>(undefined);
  const [editVariantConnectionType, setEditVariantConnectionType] = useState<string | undefined>(undefined);
  const [editVariantAttributes, setEditVariantAttributes] = useState<Record<string, any>>({});
  const [editSalePrice, setEditSalePrice] = useState(0);
  const [editListPrice, setEditListPrice] = useState(0);
  const [editVariantActive, setEditVariantActive] = useState(true);

  useEffect(() => {
    const fetchLiveCategories = async () => {
      try {
        const res: any = await categoryService.getCategories(true);
        const rawCats = Array.isArray(res)
          ? res
          : (Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : null));
        if (rawCats) {
          const list: Array<{ id: number; name: string; count: number; isVisible: boolean }> = [];
          const traverse = (nodes: any[]) => {
            for (const n of nodes) {
              list.push({
                id: n.categoryId,
                name: n.name,
                count: n.productCount || 0,
                isVisible: n.isVisible,
              });
              if (n.children && n.children.length > 0) {
                traverse(n.children);
              }
            }
          };
          traverse(rawCats);
          if (list.length > 0) {
            setCategories(list);
            const fallbackCat = list[0];
            setNewCategory(prev => (list.some(c => c.name === prev) ? prev : fallbackCat.name));
            variantSchemaService
              .fetchCategoryVariantSchema(fallbackCat.id, fallbackCat.name)
              .then(setVariantSchema)
              .catch(() => {});
          }
        }
      } catch {
        const localCats = sharedStore.getCategories();
        if (localCats.length > 0) {
          setCategories(localCats.map(c => ({ id: c.categoryId, name: c.name, count: c.productCount || 0, isVisible: c.isVisible })));
        }
      }
    };

    const fetchLiveBrands = async () => {
      try {
        const res: any = await brandService.getBrands(true);
        const rawBrands = Array.isArray(res)
          ? res
          : (Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : null));
        if (rawBrands && rawBrands.length > 0) {
          sharedStore.syncExternalBrands(rawBrands);
          const mappedBrands: Brand[] = rawBrands.map((b: any) => ({
            brandId: b.brandId,
            name: b.name,
            slug: b.slug || b.name.toLowerCase().replace(/\s+/g, '-'),
            logoUrl: b.logoUrl,
          }));
          setBrands(mappedBrands);
          setNewBrand(prev => (mappedBrands.some(b => b.name === prev) ? prev : mappedBrands[0].name));
          return;
        }
      } catch {
        // Fallback to portalBrands in sharedStore
      }
      const localPortalBrands = sharedStore.getPortalBrands();
      if (localPortalBrands.length > 0) {
        const mapped: Brand[] = localPortalBrands.map(b => ({
          brandId: b.brandId,
          name: b.name,
          slug: b.slug || b.name.toLowerCase().replace(/\s+/g, '-'),
          logoUrl: b.logoUrl,
        }));
        setBrands(mapped);
        setNewBrand(prev => (mapped.some(b => b.name === prev) ? prev : mapped[0].name));
      }
    };

    fetchLiveCategories();
    fetchLiveBrands();

    productService.getAdminProducts().then(prods => {
      if (prods && prods.length > 0) {
        setProducts(prods);
      }
    }).catch(() => {});

    const unsubscribe = sharedStore.subscribe(() => {
      setProducts([...sharedStore.getProducts()]);
      const latestPortalBrands = sharedStore.getPortalBrands();
      if (latestPortalBrands.length > 0) {
        setBrands(
          latestPortalBrands.map(b => ({
            brandId: b.brandId,
            name: b.name,
            slug: b.slug || b.name.toLowerCase().replace(/\s+/g, '-'),
            logoUrl: b.logoUrl,
          }))
        );
      }
      const latestCats = sharedStore.getCategories();
      if (latestCats.length > 0) {
        setCategories(latestCats.map(c => ({ id: c.categoryId, name: c.name, count: c.productCount || 0, isVisible: c.isVisible })));
      }
    });
    return () => unsubscribe();
  }, []);

  const handleOpenAddModal = async () => {
    const defaultCat = categories[0];
    setNewProdName('');
    setNewBrand(brands[0]?.name || '');
    setNewCategory(defaultCat?.name || '');
    setNewDescription('');
    setNewWarranty('');
    setNewThumbnail('');
    setNewGallery([]);
    setNewSpecGroups([]);
    setDraftVariants([createEmptyDraftVariant()]);
    setAddFormErrors({});
    setShowAddModal(true);
    if (defaultCat) {
      const schema = await variantSchemaService.fetchCategoryVariantSchema(defaultCat.id, defaultCat.name);
      setVariantSchema(schema);
    } else {
      setVariantSchema([]);
    }
  };

  // Tạo sản phẩm mới kèm danh sách biến thể SKU
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!newProdName.trim() || newProdName.trim().length < 3) {
      const msg = 'Vui lòng nhập tên sản phẩm (tối thiểu 3 ký tự)!';
      errors['prodName'] = msg;
      setAddFormErrors(errors);
      showToast(msg, 'error');
      focusAddField(addProdNameRef.current);
      return;
    }

    const seenSkus = new Set<string>();
    for (let idx = 0; idx < draftVariants.length; idx++) {
      const v = draftVariants[idx];
      const sku = v.sku.trim().toUpperCase();
      if (!sku) {
        const msg = `Biến thể #${idx + 1}: Vui lòng nhập mã SKU!`;
        errors[`sku-${idx}`] = 'Vui lòng nhập mã SKU';
        setAddFormErrors(errors);
        showToast(msg, 'error');
        focusAddField(addVariantFieldRefs.current[`sku-${idx}`]);
        return;
      }
      if (seenSkus.has(sku)) {
        const msg = `Mã SKU "${sku}" bị trùng lặp trong cùng sản phẩm!`;
        errors[`sku-${idx}`] = 'Mã SKU bị trùng';
        setAddFormErrors(errors);
        showToast(msg, 'error');
        focusAddField(addVariantFieldRefs.current[`sku-${idx}`]);
        return;
      }
      seenSkus.add(sku);

      if (!Number.isFinite(v.listPrice) || Number(v.listPrice) <= 0) {
        const msg = `Biến thể #${idx + 1}: Giá niêm yết phải lớn hơn 0 đồng!`;
        errors[`listPrice-${idx}`] = 'Giá niêm yết phải > 0';
        setAddFormErrors(errors);
        showToast(msg, 'error');
        focusAddField(addVariantFieldRefs.current[`listPrice-${idx}`]);
        return;
      }

      if (!Number.isFinite(v.salePrice) || Number(v.salePrice) <= 0) {
        const msg = `Biến thể #${idx + 1}: Giá bán phải lớn hơn 0 đồng!`;
        errors[`salePrice-${idx}`] = 'Giá bán phải > 0';
        setAddFormErrors(errors);
        showToast(msg, 'error');
        focusAddField(addVariantFieldRefs.current[`salePrice-${idx}`]);
        return;
      }

      if (Number(v.salePrice) > Number(v.listPrice)) {
        const msg = `Biến thể #${idx + 1}: Giá bán không được lớn hơn giá niêm yết!`;
        errors[`salePrice-${idx}`] = 'Giá bán không được > giá niêm yết';
        setAddFormErrors(errors);
        showToast(msg, 'error');
        focusAddField(addVariantFieldRefs.current[`salePrice-${idx}`]);
        return;
      }

      if (!Number.isFinite(v.initialStock) || Number(v.initialStock) <= 0) {
        const msg = `Biến thể #${idx + 1}: Số lượng tồn ban đầu phải lớn hơn 0!`;
        errors[`initialStock-${idx}`] = 'Tồn ban đầu phải > 0';
        setAddFormErrors(errors);
        showToast(msg, 'error');
        focusAddField(addVariantFieldRefs.current[`initialStock-${idx}`]);
        return;
      }
    }

    setAddFormErrors({});

    const newProdId = Date.now();

    const createdVariants: ProductVariant[] = draftVariants.map((dv, idx) => {
      const effectiveSalePrice = dv.salePrice > 0 ? dv.salePrice : dv.listPrice;
      const varName = variantSchemaService.buildVariantName(newProdName.trim(), dv, variantSchema);
      return {
        variantId: newProdId + idx + 1,
        productId: newProdId,
        sku: dv.sku.trim().toUpperCase(),
        variantName: varName,
        color: dv.color,
        colorHex: dv.colorHex || '#000000',
        ramGb: dv.ramGb,
        romGb: dv.romGb,
        connectionType: dv.connectionType,
        attributes: dv.attributes,
        listPrice: dv.listPrice,
        salePrice: effectiveSalePrice,
        onHandQty: dv.initialStock,
        reservedQty: 0,
        availableQty: dv.initialStock,
        imageUrl: newThumbnail,
        isActive: dv.isActive
      };
    });

    const newProd: Product = {
      productId: newProdId,
      name: newProdName.trim(),
      brandName: newBrand,
      categoryName: newCategory,
      description: newDescription.trim(),
      isInstallment0: true,
      warrantyPolicy: newWarranty.trim(),
      thumbnail: newThumbnail.trim(),
      gallery: newGallery.length > 0 ? newGallery : (newThumbnail.trim() ? [newThumbnail.trim()] : []),
      variants: createdVariants,
      rating: 5.0,
      reviewCount: 0,
      soldCount: 0,
      specGroups: newSpecGroups,
      highlights: []
    };

    const matchedCategory = categories.find(c => c.name.toLowerCase() === newCategory.toLowerCase());
    const matchedBrand = brands.find(b => b.name.toLowerCase() === newBrand.toLowerCase());

    let trimmedThumb = newThumbnail.trim();
    let finalNewGallery = newGallery.filter(url => url.trim().length > 0);
    if (trimmedThumb) {
      finalNewGallery = [trimmedThumb, ...finalNewGallery.filter(url => url !== trimmedThumb)];
    } else if (finalNewGallery.length > 0) {
      trimmedThumb = finalNewGallery[0];
    }
    const allCleanImages = finalNewGallery.length > 0 ? finalNewGallery : (trimmedThumb ? [trimmedThumb] : []);
    const cleanSpecs = newSpecGroups.flatMap(g =>
      g.items
        .filter(it => it.name.trim() && it.value.trim())
        .map((it, idx) => ({
          groupName: g.groupName,
          specName: it.name.trim(),
          specValue: it.value.trim(),
          sortOrder: idx + 1,
        }))
    );

    try {
      // API 4.5: Khai báo sản phẩm mới (Master-Detail)
      await productService.createAdminProduct({
        categoryId: matchedCategory ? matchedCategory.id : 1,
        brandId: matchedBrand ? matchedBrand.brandId : 1,
        name: newProdName.trim(),
        description: newDescription.trim(),
        warrantyPolicy: newWarranty.trim(),
        status: 'ACTIVE',
        images: allCleanImages.map((img, idx) => ({
          imageUrl: img,
          isPrimary: trimmedThumb ? img === trimmedThumb : idx === 0,
          sortOrder: idx + 1,
        })),
        specs: cleanSpecs,
        variants: draftVariants.map(v => ({
          sku: v.sku.trim().toUpperCase(),
          color: v.color,
          ramGb: v.ramGb,
          romGb: v.romGb,
          connectionType: v.connectionType,
          attributes: v.attributes,
          listPrice: v.listPrice,
          salePrice: v.salePrice > 0 ? v.salePrice : v.listPrice,
          initialOnHandQty: v.initialStock,
          minThreshold: 5,
        })),
      });

      const currentInventories = sharedStore.getInventories();
      const newInventoryRecords = createdVariants.map(v => ({
        variantId: v.variantId,
        productId: newProdId,
        productName: newProdName.trim(),
        sku: v.sku,
        color: v.color,
        romGb: v.romGb,
        onHandQty: v.onHandQty,
        reservedQty: 0,
        availableQty: v.availableQty,
        minThreshold: 5,
        status: 'IN_STOCK' as const
      }));
      localStorage.setItem('np_inventory_v2', JSON.stringify([...newInventoryRecords, ...currentInventories]));
      sharedStore.addProduct(newProd);

      const liveProds = await productService.getAdminProducts().catch(() => []);
      setProducts(liveProds && liveProds.length > 0 ? liveProds : [...sharedStore.getProducts()]);
      setShowAddModal(false);
      setNewProdName('');
      setNewDescription('');
      setNewWarranty('');
      setNewThumbnail('');
      setNewGallery([]);
      setNewSpecGroups([]);
      setDraftVariants([createEmptyDraftVariant()]);
      setAddFormErrors({});
      showToast(`Đã thêm sản phẩm "${newProd.name}" với ${createdVariants.length} biến thể SKU thành công!`, 'success');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể thêm sản phẩm lên máy chủ.';
      showToast(msg, 'error');
    }
  };

  // Bật / Tắt trạng thái kinh doanh của sản phẩm (giữ nguyên trạng thái tắt riêng của từng biến thể)
  const handleToggleProductStatus = async (p: Product) => {
    const isCurrentlyActive = p.status !== 'INACTIVE';

    if (isCurrentlyActive) {
      if (!confirm(`Bạn có chắc chắn muốn ngừng kinh doanh sản phẩm "${p.name}"? Các biến thể SKU đang mở bán sẽ tạm ngừng bán (trạng thái tắt riêng của các SKU đã tạm dừng trước đó vẫn được ghi nhớ).`)) {
        return;
      }
      const alreadyPausedIds = Array.isArray(p.variants)
        ? p.variants.filter(v => v.isActive === false).map(v => Number(v.variantId))
        : [];
      savePausedVariantIds(p.productId, alreadyPausedIds);

      try {
        await productService.updateProductStatus(p.productId, 'INACTIVE', 'Quản trị viên chuyển trạng thái sang INACTIVE');

        const updatedVariants = Array.isArray(p.variants)
          ? p.variants.map(v => ({ ...v }))
          : [];
        sharedStore.updateProduct(p.productId, {
          status: 'INACTIVE',
          variants: updatedVariants
        });
        setProducts([...sharedStore.getProducts()]);

        const prods = await productService.getAdminProducts().catch(() => []);
        if (prods && prods.length > 0) setProducts(prods);
      } catch (err: any) {
        showToast(err?.response?.data?.message || err?.message || 'Không thể đổi trạng thái sản phẩm.', 'error');
      }
      return;
    }

    // Chuyển từ INACTIVE -> ACTIVE: Mở modal xác nhận rõ trạng thái từng biến thể
    const variants = Array.isArray(p.variants) ? p.variants : [];
    const savedPausedIds = getSavedPausedVariantIds(p.productId);
    const hasSomeActiveLocal = variants.some(v => v.isActive !== false);
    const initialStates: Record<number, boolean> = {};
    const detectedPrePausedIds: number[] = [];

    for (const v of variants) {
      const vid = Number(v.variantId);
      const wasIndividuallyPaused =
        savedPausedIds.includes(vid) || (hasSomeActiveLocal && v.isActive === false);
      if (wasIndividuallyPaused) {
        detectedPrePausedIds.push(vid);
      }
      initialStates[vid] = !wasIndividuallyPaused;
    }

    setReactivatingModal({
      product: p,
      variantStates: initialStates,
      prePausedIds: detectedPrePausedIds,
    });
  };

  const handleConfirmReactivateProduct = async (enableAllVariants: boolean) => {
    if (!reactivatingModal) return;
    const { product: p, variantStates } = reactivatingModal;
    setIsReactivatingProduct(true);

    try {
      await productService.updateProductStatus(
        p.productId,
        'ACTIVE',
        'Quản trị viên chuyển trạng thái sang ACTIVE',
        enableAllVariants
      );

      const variants = Array.isArray(p.variants) ? p.variants : [];
      const keptPausedIds: number[] = [];
      const updatedVariants = [];

      for (const v of variants) {
        const vid = Number(v.variantId);
        const shouldBeActive = enableAllVariants ? true : (variantStates[vid] !== false);
        if (!shouldBeActive) {
          keptPausedIds.push(vid);
          if (v.isActive !== false) {
            await productService.updateAdminVariant(vid, { isActive: false }).catch(() => {});
          }
        } else if (!enableAllVariants && v.isActive === false) {
          await productService.updateAdminVariant(vid, { isActive: true }).catch(() => {});
        }
        updatedVariants.push({ ...v, isActive: shouldBeActive });
      }

      savePausedVariantIds(p.productId, keptPausedIds);
      sharedStore.updateProduct(p.productId, {
        status: 'ACTIVE',
        variants: updatedVariants,
      });
      setProducts([...sharedStore.getProducts()]);

      const prods = await productService.getAdminProducts().catch(() => []);
      if (prods && prods.length > 0) setProducts(prods);

      setReactivatingModal(null);
      showToast(
        keptPausedIds.length > 0
          ? `Đã mở bán lại "${p.name}" và giữ nguyên ${keptPausedIds.length} biến thể tạm dừng!`
          : `Đã mở bán lại "${p.name}" thành công!`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Không thể mở bán lại sản phẩm.', 'error');
    } finally {
      setIsReactivatingProduct(false);
    }
  };

  // ================= QUẢN LÝ CHỈNH SỬA SẢN PHẨM & BIẾN THỂ ĐẦY ĐỦ =================
  const handleOpenEditProduct = async (p: Product) => {
    if (!p) return;
    setEditingProduct(p);
    setEditProdName(p.name || '');
    setEditProdCategory(p.categoryName || '');
    setEditProdBrand(p.brandName || '');
    setEditProdThumbnail(p.thumbnail || '');
    setEditProdGallery(Array.isArray(p.gallery) && p.gallery.length > 0 ? [...p.gallery] : [p.thumbnail || '']);
    setEditProdDescription(p.description || '');
    setEditProdWarrantyPolicy(p.warrantyPolicy || '');
    setEditProdStatus(p.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE');
    setEditProdSpecGroups(p.specGroups || []);
    setEditProdVariants(p.variants || []);
    setIsLoadingProductDetail(true);

    try {
      const detail = await productService.getAdminProductDetail(p.productId);
      if (detail) {
        setEditProdName(detail.name || p.name);
        setEditProdCategory(detail.categoryName || p.categoryName || '');
        setEditProdBrand(detail.brandName || p.brandName || '');
        const primaryImg = detail.images?.find(i => i.isPrimary)?.imageUrl || detail.images?.[0]?.imageUrl || p.thumbnail || '';
        setEditProdThumbnail(primaryImg);
        if (detail.images && detail.images.length > 0) {
          setEditProdGallery(detail.images.map(img => img.imageUrl));
        }
        setEditProdDescription(detail.description ?? p.description ?? '');
        setEditProdWarrantyPolicy(detail.warrantyPolicy ?? p.warrantyPolicy ?? '');
        setEditProdStatus((detail.status as any) || p.status || 'ACTIVE');

        if (detail.effectiveVariantSchema && Array.isArray(detail.effectiveVariantSchema) && detail.effectiveVariantSchema.length > 0) {
          setEditVariantSchema(detail.effectiveVariantSchema);
        } else {
          const matchedCat = categories.find(c => c.name.toLowerCase() === (detail.categoryName || p.categoryName || '').toLowerCase());
          const schema = await variantSchemaService.fetchCategoryVariantSchema(matchedCat?.id || detail.categoryId || 0, detail.categoryName || p.categoryName || '');
          setEditVariantSchema(schema);
        }

        if (detail.specs && detail.specs.length > 0) {
          const groupMap = new Map<string, { specId?: number; name: string; value: string }[]>();
          detail.specs.forEach(s => {
            const grp = s.groupName || 'Thông số chung';
            if (!groupMap.has(grp)) groupMap.set(grp, []);
            groupMap.get(grp)!.push({ specId: s.specId, name: s.specName, value: s.specValue });
          });
          setEditProdSpecGroups(Array.from(groupMap.entries()).map(([groupName, items]) => ({
            groupName,
            items
          })));
        }

        if (detail.variants && detail.variants.length > 0) {
          setEditProdVariants(detail.variants);
        }
      }
    } catch (err) {
      console.warn('[PortalProductsView] getAdminProductDetail failed, fallback to local', err);
      const catName = p.categoryName || 'Điện thoại';
      const matchedCat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
      variantSchemaService.fetchCategoryVariantSchema(matchedCat?.id || 0, catName).then(schema => {
        setEditVariantSchema(schema);
      });
    } finally {
      setIsLoadingProductDetail(false);
    }
  };

  // Tải file ảnh trực tiếp lên MinIO thông qua Presigned URL
  const uploadProductImageToMinio = async (file: File, prodId?: number): Promise<string> => {
    const ext = file.name.split('.').pop() || 'png';
    const contentType = file.type || 'image/png';
    const fileName = file.name.includes('.') ? file.name : `prod-${Date.now()}.${ext}`;

    const presignedRes = await productService.createPresignedUrls({
      storageType: 'PRODUCTS',
      productId: prodId,
      files: [{ fileName, contentType, fileSize: file.size }],
    });

    const item = presignedRes.data?.[0];
    if (!item || !item.uploadUrl) {
      throw new Error('Không nhận được liên kết tải lên từ máy chủ MinIO!');
    }

    await productService.uploadBinaryToMinio(item.uploadUrl, file);

    const confirmRes = await productService.confirmUpload({
      uploadId: item.uploadId,
      objectKey: item.objectKey,
    });

    const finalUrl = confirmRes.data?.accessUrl || confirmRes.data?.imageUrl || confirmRes.data?.canonicalUrl;
    if (!finalUrl) {
      throw new Error('Máy chủ không trả về URL ảnh sau khi xác nhận!');
    }
    return finalUrl;
  };

  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const handleProductThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP)!');
      return;
    }

    setIsUploadingThumbnail(true);
    try {
      const minioUrl = await uploadProductImageToMinio(file, editingProduct?.productId);
      setEditProdThumbnail(minioUrl);
      if (!editProdGallery.includes(minioUrl)) {
        setEditProdGallery(prev => [minioUrl, ...prev]);
      }
    } catch (err: any) {
      alert(`Lỗi tải ảnh đại diện lên MinIO: ${err.message}`);
    } finally {
      setIsUploadingThumbnail(false);
      e.target.value = '';
    }
  };

  const handleUpdateEditVariant = (varIdx: number, updates: Record<string, any>) => {
    setEditProdVariants(prev => {
      const next = [...prev];
      next[varIdx] = { ...next[varIdx], ...updates };
      return next;
    });
  };

  const handleSaveSingleVariant = async (varIdx: number) => {
    if (!editingProduct) return;
    const v = editProdVariants[varIdx];
    if (!v) return;

    const sku = (v.sku || '').trim().toUpperCase();
    if (!sku) {
      showToast('Mã SKU không được để trống!', 'error');
      return;
    }
    const listPrice = Number(v.listPrice || 0);
    const salePrice = Number(v.salePrice || 0);
    if (!Number.isFinite(listPrice) || listPrice <= 0) {
      showToast(`Biến thể [${sku}]: Giá niêm yết gốc phải lớn hơn 0 đồng!`, 'error');
      return;
    }
    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      showToast(`Biến thể [${sku}]: Giá bán hiện hành phải lớn hơn 0 đồng!`, 'error');
      return;
    }
    if (salePrice > listPrice) {
      showToast(`Biến thể [${sku}]: Giá bán hiện hành không được lớn hơn giá niêm yết gốc!`, 'error');
      return;
    }

    setSavingVariantId(v.variantId);
    try {
      const minThresh = Number(v.inventory?.minThreshold ?? v.minThreshold ?? 5);
      const payload = {
        sku,
        listPrice,
        salePrice,
        compareAtPrice: listPrice,
        minThreshold: minThresh,
        isActive: v.isActive !== false,
        color: v.color,
        ramGb: v.ramGb,
        romGb: v.romGb,
        connectionType: v.connectionType,
        attributes: v.attributes,
        imageUrl: v.imageUrl || editProdThumbnail
      };

      await productService.updateAdminVariant(v.variantId, payload);
      markVariantIndividuallyPaused(editingProduct.productId, Number(v.variantId), !payload.isActive);

      const updatedVarName = variantSchemaService.buildVariantName(editProdName, v, editVariantSchema);
      handleUpdateEditVariant(varIdx, {
        sku,
        listPrice: payload.listPrice,
        salePrice: payload.salePrice,
        compareAtPrice: payload.listPrice,
        price: payload.salePrice,
        variantName: updatedVarName,
        inventory: {
          ...(v.inventory || {}),
          minThreshold: minThresh
        }
      });

      sharedStore.updateVariant(editingProduct.productId, v.variantId, {
        sku,
        listPrice: payload.listPrice,
        salePrice: payload.salePrice,
        color: payload.color,
        ramGb: payload.ramGb,
        romGb: payload.romGb,
        connectionType: payload.connectionType,
        attributes: payload.attributes,
        isActive: payload.isActive,
        variantName: updatedVarName
      });

      setProducts(prev => prev.map(p => {
        if (p.productId !== editingProduct.productId) return p;
        const nextVariants = (p.variants || []).map(item => {
          if (item.variantId !== v.variantId) return item;
          return {
            ...item,
            sku,
            listPrice: payload.listPrice,
            salePrice: payload.salePrice,
            compareAtPrice: payload.listPrice,
            price: payload.salePrice,
            color: payload.color,
            ramGb: payload.ramGb,
            romGb: payload.romGb,
            connectionType: payload.connectionType,
            attributes: payload.attributes,
            isActive: payload.isActive,
            variantName: updatedVarName
          };
        });
        return { ...p, variants: nextVariants };
      }));

      alert(`Đã cập nhật thành công biến thể SKU [${sku}]!`);
      productService.getAdminProducts().then(prods => {
        if (prods && prods.length > 0) setProducts(prods);
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi cập nhật biến thể';
      alert(`LỖI CẬP NHẬT BIẾN THỂ: ${msg}`);
    } finally {
      setSavingVariantId(null);
    }
  };

  const [isUploadingNewVarImg, setIsUploadingNewVarImg] = useState(false);

  const handleOpenAddVariantInEdit = () => {
    setNewVarDraftInEdit({
      ...createEmptyDraftVariant(),
      imageUrl: editProdThumbnail || editProdGallery[0] || ''
    });
    setAddVarInEditError('');
    setShowAddVariantInEdit(true);
  };

  const handleSaveNewVariantInEdit = async () => {
    if (!editingProduct) return;
    setAddVarInEditError('');
    const sku = newVarDraftInEdit.sku.trim().toUpperCase();
    if (!sku) {
      const msg = 'Vui lòng nhập mã SKU cho biến thể mới!';
      setAddVarInEditError(msg);
      showToast(msg, 'error');
      return;
    }
    if (editProdVariants.some(v => (v.sku || '').toUpperCase() === sku)) {
      const msg = `Mã SKU "${sku}" đã tồn tại trong sản phẩm này!`;
      setAddVarInEditError(msg);
      showToast(msg, 'error');
      return;
    }
    if (!Number.isFinite(newVarDraftInEdit.listPrice) || newVarDraftInEdit.listPrice <= 0) {
      const msg = 'Giá niêm yết gốc phải lớn hơn 0 đồng!';
      setAddVarInEditError(msg);
      showToast(msg, 'error');
      return;
    }
    if (!Number.isFinite(newVarDraftInEdit.salePrice) || newVarDraftInEdit.salePrice <= 0) {
      const msg = 'Giá bán hiện hành phải lớn hơn 0 đồng!';
      setAddVarInEditError(msg);
      showToast(msg, 'error');
      return;
    }
    if (newVarDraftInEdit.salePrice > newVarDraftInEdit.listPrice) {
      const msg = 'Giá bán hiện hành không được lớn hơn giá niêm yết gốc!';
      setAddVarInEditError(msg);
      showToast(msg, 'error');
      return;
    }
    if (!Number.isFinite(newVarDraftInEdit.initialStock) || newVarDraftInEdit.initialStock <= 0) {
      const msg = 'Số lượng tồn kho ban đầu phải lớn hơn 0!';
      setAddVarInEditError(msg);
      showToast(msg, 'error');
      return;
    }
    const finalSalePrice = newVarDraftInEdit.salePrice;

    setIsAddingVariantInEdit(true);
    try {
      await productService.addAdminVariant(editingProduct.productId, {
        sku,
        color: newVarDraftInEdit.color,
        ramGb: newVarDraftInEdit.ramGb,
        romGb: newVarDraftInEdit.romGb,
        connectionType: newVarDraftInEdit.connectionType,
        attributes: newVarDraftInEdit.attributes,
        listPrice: newVarDraftInEdit.listPrice,
        salePrice: finalSalePrice,
        initialOnHandQty: newVarDraftInEdit.initialStock,
        minThreshold: 5,
        imageUrl: newVarDraftInEdit.imageUrl ? newVarDraftInEdit.imageUrl.trim() : undefined
      });

      // Reload authoritative product detail
      const detail = await productService.getAdminProductDetail(editingProduct.productId);
      if (detail && detail.variants) {
        setEditProdVariants(detail.variants);
      }
      setShowAddVariantInEdit(false);
      alert(`Đã thêm biến thể mới SKU [${sku}] thành công!`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi thêm biến thể';
      alert(`LỖI THÊM BIẾN THỂ: ${msg}`);
    } finally {
      setIsAddingVariantInEdit(false);
    }
  };

  const handleOpenStockAdjust = (v: any) => {
    setAdjustingVariant(v);
  };

  const handleStockAdjustSuccess = (variantId: number, actualCount: number) => {
    setEditProdVariants(prev => prev.map(v => {
      if (v.variantId === variantId) {
        const reserved = v.inventory?.reservedQty ?? v.reservedQty ?? 0;
        return {
          ...v,
          onHandQty: actualCount,
          availableQty: Math.max(0, actualCount - reserved),
          inventory: {
            ...(v.inventory || {}),
            onHandQty: actualCount,
            availableQty: Math.max(0, actualCount - reserved)
          }
        };
      }
      return v;
    }));
  };

  const handleSaveProductEdit = async () => {
    if (!editingProduct) return;
    if (!editProdName.trim()) {
      alert('Tên sản phẩm không được để trống!');
      return;
    }
    if (!editProdThumbnail.trim()) {
      showToast('Vui lòng chọn hoặc thêm ảnh đại diện cho sản phẩm!', 'error');
      return;
    }
    for (let i = 0; i < editProdVariants.length; i++) {
      const v = editProdVariants[i];
      if (!v) continue;
      const lp = Number(v.listPrice || 0);
      const sp = Number(v.salePrice || 0);
      if (!Number.isFinite(lp) || lp <= 0) {
        showToast(`Biến thể [${v.sku || `#${i + 1}`}]: Giá niêm yết gốc phải lớn hơn 0 đồng!`, 'error');
        return;
      }
      if (!Number.isFinite(sp) || sp <= 0) {
        showToast(`Biến thể [${v.sku || `#${i + 1}`}]: Giá bán hiện hành phải lớn hơn 0 đồng!`, 'error');
        return;
      }
      if (sp > lp) {
        showToast(`Biến thể [${v.sku || `#${i + 1}`}]: Giá bán hiện hành không được lớn hơn giá niêm yết gốc!`, 'error');
        return;
      }
    }

    setIsSavingProduct(true);
    try {
      let trimmedThumb = editProdThumbnail.trim();
      let finalGallery = editProdGallery.filter(url => url.trim().length > 0);
      if (trimmedThumb) {
        finalGallery = [trimmedThumb, ...finalGallery.filter(url => url !== trimmedThumb)];
      } else if (finalGallery.length > 0) {
        trimmedThumb = finalGallery[0];
      }
      if (finalGallery.length === 0 && trimmedThumb) {
        finalGallery = [trimmedThumb];
      }
      const matchedEditCat = categories.find(c => c.name.toLowerCase() === editProdCategory.toLowerCase());
      const matchedEditBrand = brands.find(b => b.name.toLowerCase() === editProdBrand.toLowerCase());

      const specsPayload = editProdSpecGroups.flatMap(g => g.items.map((it, idx) => ({
        specId: it.specId,
        groupName: g.groupName,
        specName: it.name,
        specValue: it.value,
        sortOrder: idx + 1
      })));

      await productService.updateAdminProduct(editingProduct.productId, {
        name: editProdName.trim(),
        categoryId: matchedEditCat?.id,
        brandId: matchedEditBrand?.brandId,
        description: editProdDescription.trim(),
        warrantyPolicy: editProdWarrantyPolicy.trim(),
        images: finalGallery.map((img, idx) => ({
          imageUrl: img,
          isPrimary: trimmedThumb ? img === trimmedThumb : idx === 0,
          sortOrder: idx + 1
        })),
        specs: specsPayload
      });

      const statusChanged = (editingProduct.status || 'ACTIVE') !== editProdStatus;
      if (statusChanged) {
        if (editProdStatus === 'INACTIVE') {
          const prePausedIds = editProdVariants
            .filter(v => v && v.isActive === false)
            .map(v => Number(v.variantId));
          savePausedVariantIds(editingProduct.productId, prePausedIds);
        }
        await productService.updateProductStatus(editingProduct.productId, editProdStatus, `Admin đổi trạng thái sản phẩm sang ${editProdStatus}`);
      }

      // Đồng bộ lưu các biến thể (bao gồm giá niêm yết gốc & giá bán hiện hành)
      const oldThumb = editingProduct.thumbnail;
      for (const v of editProdVariants) {
        if (v && v.variantId) {
          const listPrice = Number(v.listPrice || 0);
          const salePrice = Number(v.salePrice || 0);
          const minThresh = Number(v.inventory?.minThreshold ?? v.minThreshold ?? 5);
          const effectiveList = listPrice;
          const effectiveSale = salePrice;
          const varImageUrl = (!v.imageUrl || v.imageUrl === oldThumb) ? (trimmedThumb || v.imageUrl) : v.imageUrl;
          try {
            await productService.updateAdminVariant(v.variantId, {
              sku: (v.sku || '').trim().toUpperCase(),
              listPrice: effectiveList,
              salePrice: effectiveSale,
              compareAtPrice: effectiveList,
              minThreshold: minThresh,
              isActive: v.isActive !== false,
              color: v.color,
              ramGb: v.ramGb,
              romGb: v.romGb,
              connectionType: v.connectionType,
              attributes: v.attributes,
              imageUrl: varImageUrl
            });
            sharedStore.updateVariant(editingProduct.productId, v.variantId, {
              sku: (v.sku || '').trim().toUpperCase(),
              listPrice: effectiveList,
              salePrice: effectiveSale,
              color: v.color,
              ramGb: v.ramGb,
              romGb: v.romGb,
              connectionType: v.connectionType,
              attributes: v.attributes,
              imageUrl: varImageUrl,
              isActive: v.isActive !== false
            });
          } catch (varErr) {
            console.warn('[PortalProductsView] Error saving variant in product edit', v.sku, varErr);
            throw varErr;
          }
        }
      }

      if (editProdStatus === 'ACTIVE') {
        const pausedIds = editProdVariants
          .filter(v => v && v.isActive === false)
          .map(v => Number(v.variantId));
        savePausedVariantIds(editingProduct.productId, pausedIds);
      }

      sharedStore.updateProduct(editingProduct.productId, {
        name: editProdName.trim(),
        categoryName: editProdCategory,
        brandName: editProdBrand,
        thumbnail: trimmedThumb || finalGallery[0] || '',
        gallery: finalGallery,
        description: editProdDescription.trim(),
        warrantyPolicy: editProdWarrantyPolicy.trim(),
        status: editProdStatus,
        specGroups: editProdSpecGroups,
        variants: (editingProduct.variants || []).map(orig => {
          const edited = editProdVariants.find(ev => Number(ev.variantId) === Number(orig.variantId));
          return edited ? { ...orig, ...edited, isActive: edited.isActive !== false } : orig;
        }),
      });

      sharedStore.addAuditLog({
        performedBy: 'Nguyễn Thế Minh (Admin)',
        action: 'UPDATE_PRODUCT_MEDIA',
        entityName: 'Products',
        entityId: String(editingProduct.productId),
        oldValue: `Sản phẩm #${editingProduct.productId}`,
        newValue: `Cập nhật thông tin chung, ${finalGallery.length} ảnh và ${specsPayload.length} thông số kỹ thuật cho "${editProdName}"`
      });

      setProducts([...sharedStore.getProducts()]);
      productService.getAdminProducts().then(prods => {
        if (prods && prods.length > 0) setProducts(prods);
      }).catch(() => {});
      alert(`Đã cập nhật thông tin sản phẩm và thông số kỹ thuật thành công!`);
      setEditingProduct(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi cập nhật sản phẩm';
      alert(`LỖI LƯU SẢN PHẨM: ${msg}`);
    } finally {
      setIsSavingProduct(false);
    }
  };

  // ================= QUẢN LÝ CHỈNH SỬA BIẾN THỂ & ẢNH BIẾN THỂ ĐÃ THÊM =================
  const handleOpenEditVariant = (prodId: number, v: ProductVariant) => {
    if (!v) return;
    const currentProd = products.find(p => p.productId === prodId);
    const validPrice = (v.salePrice && v.salePrice > 0) ? v.salePrice : (v.listPrice || 0);
    setEditingVariant({ prodId, variant: v });
    setEditVariantImage(v.imageUrl || '');
    setEditVariantColor(v.color || '');
    setEditVariantColorHex(v.colorHex || '#000000');
    setEditSalePrice(validPrice);
    setEditListPrice(v.listPrice || validPrice);
    setEditVariantActive(v.isActive !== false);
    setEditVariantRamGb(v.ramGb);
    setEditVariantRomGb(v.romGb);
    setEditVariantConnectionType(v.connectionType);
    setEditVariantAttributes(v.attributes ? { ...v.attributes } : {});

    // Resolve schema for category
    const catName = currentProd?.categoryName || 'Điện thoại';
    const matchedCat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
    variantSchemaService.fetchCategoryVariantSchema(matchedCat?.id || 0, catName).then(schema => {
      setEditVariantSchema(schema);
    });
  };

  const [isUploadingVariantImage, setIsUploadingVariantImage] = useState(false);
  const handleVariantFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP)!');
      return;
    }

    setIsUploadingVariantImage(true);
    try {
      const minioUrl = await uploadProductImageToMinio(file, editingVariant?.prodId);
      setEditVariantImage(minioUrl);
    } catch (err: any) {
      alert(`Lỗi tải ảnh biến thể lên MinIO: ${err.message}`);
    } finally {
      setIsUploadingVariantImage(false);
      e.target.value = '';
    }
  };

  const handleSaveVariantEdit = async () => {
    if (!editingVariant) return;
    if (!Number.isFinite(editListPrice) || editListPrice <= 0) {
      showToast('Giá niêm yết gốc biến thể phải lớn hơn 0 đồng!', 'error');
      return;
    }
    if (!Number.isFinite(editSalePrice) || editSalePrice <= 0) {
      showToast('Giá bán biến thể phải lớn hơn 0 đồng!', 'error');
      return;
    }
    if (editSalePrice > editListPrice) {
      showToast('Giá bán biến thể không được lớn hơn giá niêm yết gốc!', 'error');
      return;
    }

    const currentProd = products.find(p => p.productId === editingVariant.prodId);
    const finalImage = editVariantImage.trim() || editingVariant.variant.imageUrl || currentProd?.thumbnail || '';
    const finalColor = editVariantColor.trim() || editingVariant.variant.color;

    const listPrice = editListPrice;
    const salePrice = editSalePrice;

    const partialVariant: Partial<ProductVariant> = {
      imageUrl: finalImage,
      salePrice: salePrice,
      listPrice: listPrice,
      price: salePrice,
      compareAtPrice: listPrice,
      color: finalColor,
      colorHex: editVariantColorHex,
      ramGb: editVariantRamGb,
      romGb: editVariantRomGb,
      connectionType: editVariantConnectionType,
      attributes: editVariantAttributes,
      isActive: editVariantActive
    };

    const newVariantName = variantSchemaService.buildVariantName(
      currentProd?.name || '',
      partialVariant,
      editVariantSchema
    );
    partialVariant.variantName = newVariantName;

    // API 4.8: Cập nhật biến thể SKU và thông số lên Server
    try {
      await productService.updateAdminVariant(editingVariant.variant.variantId, {
        sku: editingVariant.variant.sku,
        listPrice: listPrice,
        salePrice: salePrice,
        compareAtPrice: listPrice,
        isActive: editVariantActive,
        color: finalColor,
        ramGb: editVariantRamGb,
        romGb: editVariantRomGb,
        connectionType: editVariantConnectionType,
        attributes: editVariantAttributes,
        imageUrl: finalImage
      });
      markVariantIndividuallyPaused(editingVariant.prodId, Number(editingVariant.variant.variantId), !editVariantActive);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi cập nhật biến thể lên máy chủ';
      console.warn('[PortalProductsView] updateAdminVariant error', err);
      alert(`LỖI CẬP NHẬT BIẾN THỂ: ${msg}`);
      return;
    }

    const ok = sharedStore.updateVariant(editingVariant.prodId, editingVariant.variant.variantId, partialVariant);

    if (ok) {
      sharedStore.addAuditLog({
        performedBy: 'Nguyễn Thế Minh (Admin)',
        action: 'UPDATE_VARIANT_MEDIA_PRICE',
        entityName: 'ProductVariants',
        entityId: editingVariant.variant.sku,
        oldValue: `Ảnh: ${editingVariant.variant.imageUrl? 'Có': 'Chưa có'} | Giá: ${formatVND(editingVariant.variant.salePrice)}`,
        newValue: `Cập nhật thông số & giá bán biến thể SKU ${editingVariant.variant.sku}: ${formatVND(editSalePrice)}`
      });

      // Cập nhật ngay danh sách sản phẩm trong view
      setProducts(prev => prev.map(p => {
        if (p.productId !== editingVariant.prodId) return p;
        const nextVariants = (p.variants || []).map(v => {
          if (v.variantId !== editingVariant.variant.variantId) return v;
          return { ...v, ...partialVariant };
        });
        return { ...p, variants: nextVariants };
      }));

      alert(`Đã cập nhật thông số và giá cho biến thể SKU ${editingVariant.variant.sku} thành công!`);
      productService.getAdminProducts().then(prods => {
        if (prods && prods.length > 0) setProducts(prods);
      });
      setEditingVariant(null);
    }
  };

  // Phân trang sản phẩm
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Lọc sản phẩm an toàn chống null/undefined
  const filteredProducts = useMemo(() => {
    return (products || []).filter(p => {
      if (!p) return false;
      const name = (p.name || '').toLowerCase();
      const brand = (p.brandName || '').toLowerCase();
      const cat = (p.categoryName || '').toLowerCase();
      const search = (searchTerm || '').toLowerCase().trim();
      if (!search) return true;
      const matchName = name.includes(search);
      const matchBrand = brand.includes(search);
      const matchCat = cat.includes(search);
      const matchSku = Array.isArray(p.variants) && p.variants.some(v => v && (v.sku || '').toLowerCase().includes(search));
      return matchName || matchBrand || matchCat || matchSku;
    });
  }, [products, searchTerm]);

  // Dữ liệu sản phẩm hiển thị trên trang hiện tại
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Reset trang về 1 khi tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      
      {/* Page Header Clean SaaS Style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Sản phẩm & Quản trị Danh mục SKU
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 font-mono">
              Quản lý Catalog
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quản trị thông số kỹ thuật, cấu hình biến thể (Màu / Dung lượng ROM) và dải giá bán hiện hành.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleOpenAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            <Plus size={14} />
            <span>Thêm sản phẩm mới</span>
          </button>
        </div>
      </div>

      {/* QUẢN LÝ SẢN PHẨM & BIẾN THỂ */}
      <div className="space-y-4">
          
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80 relative">
              <input
                type="text"
                placeholder="Tìm theo tên máy, hãng, SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs focus:bg-white focus:outline-none focus:border-blue-500 font-medium transition"
              />
              <Search size={14} className="text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Product and Variant Matrix Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Ảnh</th>
                    <th className="p-3.5">Tên sản phẩm</th>
                    <th className="p-3.5">Hãng & Danh mục</th>
                    <th className="p-3.5">Các biến thể SKU (Màu / ROM)</th>
                    <th className="p-3.5">Khoảng giá bán hiện hành</th>
                    <th className="p-3.5 text-center">Trạng thái</th>
                    <th className="p-3.5 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Không tìm thấy sản phẩm nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map(p => {
                      if (!p) return null;
                      const variants = Array.isArray(p.variants) ? p.variants : [];
                      // Tính khoảng giá bán dựa trên toàn bộ các biến thể SKU hợp lệ
                      const variantPrices = variants
                        .map(v => (v && v.salePrice > 0 ? v.salePrice : (v?.listPrice || 0)))
                        .filter(pr => pr > 0);
                      const minPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : 0;
                      const maxPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : 0;
                      const isRange = minPrice > 0 && maxPrice > minPrice;

                      return (
                        <tr key={p.productId} className="hover:bg-slate-50">
                          <td className="p-3.5 w-16">
                            <div 
                              onClick={() => handleOpenEditProduct(p)}
                              className="relative w-12 h-12 rounded-lg border border-slate-200 bg-white brand-logo-plate overflow-hidden group cursor-pointer shadow-xs"
                              title="Bấm để đổi ảnh sản phẩm & thư viện ảnh"
                            >
                              <img 
                                src={p.thumbnail || 'https://placehold.co/100x100/f8fafc/64748b?text=Device'} 
                                alt={p.name || 'Sản phẩm'} 
                                className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform" 
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/f8fafc/64748b?text=Device';
                                }}
                              />
                              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <Camera size={14} />
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <strong className="text-slate-900 block text-xs">{p.name}</strong>
                            <span className="text-[11px] text-slate-400">Đã bán {p.soldCount || 0} máy</span>
                          </td>

                          <td className="p-3.5">
                            <span className="font-bold text-slate-700 block">{p.brandName || 'Chưa phân loại'}</span>
                            <span className="text-[11px] text-slate-400">{p.categoryName || 'Chưa phân loại'}</span>
                          </td>

                          {/* Danh sách biến thể SKU với ảnh riêng và giá chuẩn của từng biến thể */}
                          <td className="p-3.5">
                            <div className="flex flex-wrap gap-1.5 max-w-sm">
                              {variants.length === 0 ? (
                                <span className="text-slate-400 text-[11px] italic">Chưa có biến thể</span>
                              ) : (
                                variants.map(v => {
                                  if (!v) return null;
                                  const displayPrice = v.salePrice > 0 ? v.salePrice : (v.listPrice || minPrice || 29490000);

                                  return (
                                    <button
                                      key={v.sku || Math.random()} 
                                      onClick={() => handleOpenEditVariant(p.productId, v)}
                                      className={`px-2 py-1 rounded-lg border text-[10px] text-left transition flex items-center gap-1.5 ${
                                        v.isActive === false || p.status === 'INACTIVE'
                                          ? 'bg-slate-100/60 border-slate-200 text-slate-400 opacity-75'
                                          : 'bg-slate-100 hover:bg-blue-50 hover:border-blue-300 border-slate-200 text-slate-700'
                                      }`}
                                      title="Bấm để chỉnh sửa ảnh & giá cho biến thể SKU này"
                                    >
                                      <div className="w-5 h-5 rounded bg-white border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                        {v.imageUrl ? (
                                          <img src={v.imageUrl} alt="" className="w-full h-full object-contain" />
                                        ) : (
                                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.colorHex || '#94a3b8' }} />
                                        )}
                                      </div>
                                      <div>
                                        <strong className="block text-slate-900 font-mono">{v.sku}</strong>
                                        <span>
                                          {v.variantName || variantSchemaService.buildVariantName(p.name, v) || v.color} ({formatVND(displayPrice)})
                                          {v.isActive === false && <span className="text-rose-600 font-bold ml-1">(Dừng bán)</span>}
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </td>

                          {/* Khoảng giá bán hiện hành của sản phẩm */}
                          <td className="p-3.5 whitespace-nowrap">
                            {isRange ? (
                              <div>
                                <div className="font-bold text-ink-deep text-xs">
                                  {formatVND(minPrice)} – {formatVND(maxPrice)}
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                                  (Theo cấu hình biến thể)
                                </span>
                              </div>
                            ) : (
                              <strong className="font-bold text-ink-deep text-xs">
                                {formatVND(minPrice)}
                              </strong>
                            )}
                          </td>

                          <td className="p-3.5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleToggleProductStatus(p)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                                p.status === 'INACTIVE'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                              title="Nhấp để chuyển đổi trạng thái kinh doanh của sản phẩm và biến thể"
                            >
                              {p.status === 'INACTIVE' ? 'NGỪNG KINH DOANH' : 'ĐANG KINH DOANH'}
                            </button>
                            {p.status !== 'INACTIVE' && p.categoryEffectiveVisible === false && (
                              <span
                                className="block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200"
                                title="Sản phẩm vẫn giữ trạng thái ĐANG KINH DOANH, nhưng tạm ẩn trên website vì danh mục hoặc danh mục cha đang ẩn"
                              >
                                Ẩn theo danh mục cha
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center">
                              <button 
                                onClick={() => handleOpenEditProduct(p)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition border border-slate-200"
                                title="Xem & chỉnh sửa chi tiết sản phẩm, biến thể SKU và thông số kỹ thuật"
                              >
                                <Edit size={13} className="text-blue-600" />
                                <span>Chỉnh sửa</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Phân trang danh sách sản phẩm */}
            <PortalPagination
              currentPage={currentPage}
              totalItems={filteredProducts.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[5, 8, 12, 20]}
            />
          </div>

      </div>

      {/* MODAL THÊM SẢN PHẨM MỚI KÈM ĐA BIẾN THỂ, ẢNH & THÔNG SỐ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-ink-deep/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline-soft rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 text-xs max-h-[92vh] overflow-y-auto animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
              <div>
                <h3 className="text-base font-bold text-ink-deep uppercase tracking-tight flex items-center gap-2">
                  <Smartphone size={18} className="text-primary" />
                  <span>Khai báo Sản phẩm & Ma trận Biến thể SKU</span>
                </h3>
                <p className="text-xs text-steel mt-0.5">
                  Thiết lập thông tin chung, thư viện ảnh đa góc nhìn, cấu hình đa biến thể và thông số kỹ thuật
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-steel hover:text-ink rounded-lg hover:bg-surface-soft"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} noValidate className="space-y-6">
              {/* 1. THÔNG TIN CƠ BẢN */}
              <div className="space-y-3 bg-surface-soft/40 p-4 rounded-xl border border-hairline-soft">
                <span className="font-bold text-ink-deep text-xs uppercase tracking-wider block">
                  1. Thông tin chung sản phẩm
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-medium text-charcoal mb-1">Tên sản phẩm / Model (*):</label>
                    <input
                      ref={addProdNameRef}
                      type="text"
                      required
                      placeholder="VD: iPhone 16 Pro Max 5G..."
                      value={newProdName}
                      onChange={(e) => {
                        setNewProdName(e.target.value);
                        if (addFormErrors['prodName']) {
                          setAddFormErrors(prev => {
                            const next = { ...prev };
                            delete next['prodName'];
                            return next;
                          });
                        }
                      }}
                      className={`w-full h-10 px-3 bg-canvas border rounded-lg text-ink text-xs focus:border-2 focus:outline-none font-bold ${
                        addFormErrors['prodName']
                          ? 'border-rose-500 focus:border-rose-600 ring-2 ring-rose-500/20'
                          : 'border-hairline focus:border-fb-blue'
                      }`}
                    />
                    {addFormErrors['prodName'] && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1">{addFormErrors['prodName']}</p>
                    )}
                  </div>

                  <div>
                    <label className="block font-medium text-charcoal mb-1">Thương hiệu (*):</label>
                    <select
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
                    >
                      {brands.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-charcoal mb-1">Danh mục sản phẩm (*):</label>
                    <select
                      value={newCategory}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setNewCategory(val);
                        const matchedCat = categories.find(c => c.name.toLowerCase() === val.toLowerCase());
                        const schema = await variantSchemaService.fetchCategoryVariantSchema(matchedCat?.id || 0, val);
                        setVariantSchema(schema);
                        const hasRam = schema.some(f => f.key === 'ramGb');
                        const hasRom = schema.some(f => f.key === 'romGb');
                        const hasConn = schema.some(f => f.key === 'connectionType');
                        setDraftVariants(prev => prev.map(dv => ({
                          ...dv,
                          ramGb: hasRam ? dv.ramGb : undefined,
                          romGb: hasRom ? dv.romGb : undefined,
                          connectionType: hasConn ? dv.connectionType : undefined,
                          attributes: {}
                        })));
                      }}
                      className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none font-semibold"
                    >
                      {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-charcoal mb-1">Chính sách bảo hành:</label>
                    <input
                      type="text"
                      placeholder="VD: Bảo hành 12 tháng chính hãng, 1 đổi 1 trong 30 ngày..."
                      value={newWarranty}
                      onChange={(e) => setNewWarranty(e.target.value)}
                      className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-charcoal mb-1">Mô tả sản phẩm:</label>
                  <textarea
                    rows={3}
                    placeholder="Mô tả chi tiết thiết kế, hiệu năng, camera, pin và điểm nổi bật của sản phẩm..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full p-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
                  />
                </div>
              </div>

              {/* 2. QUẢN LÝ THƯ VIỆN ẢNH (Bảng Product_Images) */}
              <ProductImagesManager
                gallery={newGallery}
                thumbnail={newThumbnail}
                onChangeGallery={setNewGallery}
                onChangeThumbnail={setNewThumbnail}
              />

              {/* 3. QUẢN LÝ ĐA BIẾN THỂ SKU (Bảng Product_Variants) */}
              <div className="space-y-3 bg-surface-soft/40 p-4 rounded-xl border border-hairline-soft">
                <div className="flex items-center justify-between pb-2 border-b border-hairline-soft">
                  <div>
                    <span className="font-bold text-ink-deep text-xs uppercase tracking-wider block">
                      3. Cấu hình các biến thể SKU (Product_Variants)
                    </span>
                    <span className="text-[11px] text-steel">
                      Tự động hiển thị các thông số biến thể theo ngành hàng "{newCategory}".
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddDraftVariant}
                    className="btn-secondary py-1 px-3 text-[11px] font-bold rounded-full flex items-center gap-1 shadow-xs text-primary border-primary/30"
                  >
                    <Plus size={13} />
                    <span>Thêm biến thể SKU</span>
                  </button>
                </div>

                <div className="space-y-3 pt-1">
                  {draftVariants.map((v, vIdx) => (
                    <div key={vIdx} className="p-3.5 bg-canvas border border-hairline-soft rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary font-mono text-xs">
                          Biến thể #{vIdx + 1}: {v.sku || '(Chưa có SKU)'}
                        </span>

                        {draftVariants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDraftVariant(vIdx)}
                            className="text-steel hover:text-critical p-1 transition"
                            title="Xóa biến thể này"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      {/* Thông số kỹ thuật động của biến thể theo ngành hàng */}
                      <DynamicVariantInputs
                        schema={variantSchema}
                        variant={v}
                        onChange={(updated) => {
                          const next = [...draftVariants];
                          next[vIdx] = {
                            ...next[vIdx],
                            ...updated
                          };
                          setDraftVariants(next);
                        }}
                      />

                      {/* Các trường chung: SKU, Giá niêm yết, Giá bán, Tồn kho */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-hairline-soft/60">
                        <div>
                          <label className="text-[10px] font-bold text-steel block mb-0.5">Mã SKU (*):</label>
                          <input
                            ref={(el) => { addVariantFieldRefs.current[`sku-${vIdx}`] = el; }}
                            type="text"
                            required
                            placeholder="IP16PM-256-NAT"
                            value={v.sku}
                            onChange={(e) => handleUpdateDraftVariant(vIdx, 'sku', e.target.value)}
                            className={`w-full h-8 px-2 bg-surface-soft border rounded font-mono uppercase text-xs focus:bg-canvas focus:outline-none ${
                              addFormErrors[`sku-${vIdx}`]
                                ? 'border-rose-500 ring-2 ring-rose-500/20'
                                : 'border-hairline-soft'
                            }`}
                          />
                          {addFormErrors[`sku-${vIdx}`] && (
                            <p className="text-[10px] text-rose-600 font-semibold mt-0.5">{addFormErrors[`sku-${vIdx}`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-steel block mb-0.5">Giá niêm yết (VNĐ) (*):</label>
                          <input
                            ref={(el) => { addVariantFieldRefs.current[`listPrice-${vIdx}`] = el; }}
                            type="number"
                            required
                            min={1}
                            step={100000}
                            placeholder="VD: 25000000"
                            value={v.listPrice > 0 ? v.listPrice : ''}
                            onChange={(e) => handleUpdateDraftVariant(vIdx, 'listPrice', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                            className={`w-full h-8 px-2 bg-canvas border rounded text-xs font-mono focus:outline-none ${
                              addFormErrors[`listPrice-${vIdx}`]
                                ? 'border-rose-500 ring-2 ring-rose-500/20 text-rose-700'
                                : 'border-hairline-soft'
                            }`}
                          />
                          {addFormErrors[`listPrice-${vIdx}`] && (
                            <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
                              {addFormErrors[`listPrice-${vIdx}`]}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-steel block mb-0.5">Giá bán (sale_price) (*):</label>
                          {(() => {
                            const isSaleExceedList = v.listPrice > 0 && v.salePrice > v.listPrice;
                            const saleErrMsg = addFormErrors[`salePrice-${vIdx}`] || (isSaleExceedList ? 'Giá bán không được > giá niêm yết' : '');
                            return (
                              <>
                                <input
                                  ref={(el) => { addVariantFieldRefs.current[`salePrice-${vIdx}`] = el; }}
                                  type="number"
                                  required
                                  min={1}
                                  step={100000}
                                  placeholder="VD: 23500000"
                                  value={v.salePrice > 0 ? v.salePrice : ''}
                                  onChange={(e) => handleUpdateDraftVariant(vIdx, 'salePrice', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                                  className={`w-full h-8 px-2 bg-canvas border rounded text-xs font-mono font-bold focus:outline-none ${
                                    saleErrMsg
                                      ? 'border-rose-500 ring-2 ring-rose-500/20 text-rose-700'
                                      : 'border-hairline-soft text-primary'
                                  }`}
                                />
                                {saleErrMsg && (
                                  <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
                                    {saleErrMsg}
                                  </p>
                                )}
                              </>
                            );
                          })()}
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-steel block mb-0.5">Tồn kho ban đầu (*):</label>
                          <input
                            ref={(el) => { addVariantFieldRefs.current[`initialStock-${vIdx}`] = el; }}
                            type="number"
                            required
                            min={1}
                            placeholder="VD: 10"
                            value={v.initialStock > 0 ? v.initialStock : ''}
                            onChange={(e) => handleUpdateDraftVariant(vIdx, 'initialStock', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                            className={`w-full h-8 px-2 bg-canvas border rounded text-xs font-mono font-bold focus:outline-none ${
                              addFormErrors[`initialStock-${vIdx}`]
                                ? 'border-rose-500 ring-2 ring-rose-500/20 text-rose-700'
                                : 'border-hairline-soft text-success'
                            }`}
                          />
                          {addFormErrors[`initialStock-${vIdx}`] && (
                            <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
                              {addFormErrors[`initialStock-${vIdx}`]}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. QUẢN LÝ THÔNG SỐ KỸ THUẬT (Bảng Product_Specs) */}
              <ProductSpecsEditor
                groups={newSpecGroups}
                onChange={setNewSpecGroups}
              />

              {/* Nút lưu */}
              <div className="flex gap-2.5 justify-end pt-4 border-t border-hairline-soft">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-ghost px-5 py-2.5 font-bold rounded-full text-xs"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-marketing px-6 py-2.5 font-bold rounded-full shadow-xs text-xs"
                >
                  Lưu sản phẩm & Đưa vào kinh doanh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL CHỈNH SỬA SẢN PHẨM & BIẾN THỂ ĐẦY ĐỦ (ADMIN MASTER-DETAIL) ================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl space-y-6 text-xs max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Edit size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 uppercase">
                      Chỉnh sửa sản phẩm & Biến thể SKU
                    </h3>
                    <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                      #{editingProduct.productId}
                    </span>
                    {isLoadingProductDetail && (
                      <span className="flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-medium">
                        <Loader2 size={12} className="animate-spin" /> Đang đồng bộ chi tiết...
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Quản lý thông tin chung, thư viện ảnh, thuộc tính biến thể SKU theo ngành hàng và thông số kỹ thuật
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* ================= 1. THÔNG TIN CHUNG SẢN PHẨM ================= */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
                    1. Thông tin chung sản phẩm
                  </span>
                  <span className="text-[10px] text-slate-500">Mã danh mục & thương hiệu liên kết</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Tên sản phẩm *:</label>
                    <input
                      type="text"
                      value={editProdName}
                      onChange={(e) => setEditProdName(e.target.value)}
                      placeholder="Nhập tên sản phẩm..."
                      className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-bold focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700">Ngành hàng / Danh mục:</label>
                      {editProdVariants.length > 0 && (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          Khóa đổi ngành hàng
                        </span>
                      )}
                    </div>
                    <select
                      value={editProdCategory}
                      onChange={(e) => setEditProdCategory(e.target.value)}
                      disabled={editProdVariants.length > 0}
                      className={`w-full h-9 px-2.5 border rounded-lg text-xs font-semibold focus:outline-none ${
                        editProdVariants.length > 0
                          ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                          : 'bg-white border-slate-300 text-slate-800 focus:border-blue-600'
                      }`}
                      title={editProdVariants.length > 0 ? 'Không thể thay đổi ngành hàng khi sản phẩm đã có biến thể SKU' : ''}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Thương hiệu:</label>
                    <select
                      value={editProdBrand}
                      onChange={(e) => setEditProdBrand(e.target.value)}
                      className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs font-semibold focus:outline-none focus:border-blue-600"
                    >
                      {brands.map(b => (
                        <option key={b.brandId} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Trạng thái kinh doanh sản phẩm:</label>
                    <select
                      value={editProdStatus}
                      onChange={(e) => setEditProdStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                      className={`w-full h-9 px-2.5 bg-white border rounded-lg text-xs font-bold focus:outline-none focus:border-blue-600 ${
                        editProdStatus === 'INACTIVE' ? 'border-rose-300 text-rose-700 bg-rose-50/40' : 'border-emerald-300 text-emerald-700 bg-emerald-50/40'
                      }`}
                    >
                      <option value="ACTIVE">ĐANG KINH DOANH (Mở bán)</option>
                      <option value="INACTIVE">NGỪNG KINH DOANH (Dừng toàn bộ SKU)</option>
                    </select>
                  </div>

                  {editingProduct.status === 'INACTIVE' && editProdStatus === 'ACTIVE' && (
                    <div className="sm:col-span-3 text-[11px] text-blue-800 bg-blue-50 p-2.5 rounded-lg border border-blue-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={15} className="shrink-0 text-blue-600" />
                        <span>
                          Sản phẩm đang chuyển sang <strong>Đang kinh doanh</strong>. Trạng thái riêng của từng biến thể SKU bên dưới sẽ được giữ nguyên theo thiết lập hiện tại.
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {getSavedPausedVariantIds(editingProduct.productId).length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const pausedIds = getSavedPausedVariantIds(editingProduct.productId);
                              setEditProdVariants(prev =>
                                prev.map(v => ({
                                  ...v,
                                  isActive: !pausedIds.includes(Number(v.variantId)),
                                }))
                              );
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md text-[10px] transition"
                          >
                            Mở bán SKU (giữ SKU đã tắt riêng)
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setEditProdVariants(prev => prev.map(v => ({ ...v, isActive: true })))
                          }
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-md text-[10px] transition"
                        >
                          Bật tất cả SKU
                        </button>
                      </div>
                    </div>
                  )}

                  {editProdVariants.length > 0 && (
                    <div className="sm:col-span-3 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-2">
                      <AlertCircle size={15} className="shrink-0 text-amber-600" />
                      <span>
                        Sản phẩm đang có <strong>{editProdVariants.length} biến thể SKU</strong>. Để đảm bảo tính toàn vẹn của thuộc tính kỹ thuật, danh mục ngành hàng không được phép thay đổi.
                      </span>
                    </div>
                  )}

                  <div className="sm:col-span-3">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Mô tả sản phẩm:</label>
                    <textarea
                      rows={3}
                      value={editProdDescription}
                      onChange={(e) => setEditProdDescription(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                      placeholder="Mô tả chi tiết thiết kế, hiệu năng, camera, tính năng nổi bật của sản phẩm..."
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Chính sách bảo hành:</label>
                    <input
                      type="text"
                      value={editProdWarrantyPolicy}
                      onChange={(e) => setEditProdWarrantyPolicy(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                      placeholder="VD: Bảo hành 12 tháng chính hãng, 1 đổi 1 trong 30 ngày..."
                    />
                  </div>
                </div>
              </div>

              {/* ================= 2. QUẢN LÝ THƯ VIỆN ẢNH SẢN PHẨM ================= */}
              <div className="space-y-3">
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
                  2. Thư viện ảnh sản phẩm (Product_Images)
                </span>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 bg-white p-1 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-xs">
                      {editProdThumbnail ? (
                        <img 
                          src={editProdThumbnail} 
                          alt="Thumbnail preview" 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/f8fafc/64748b?text=Lỗi+ảnh';
                          }}
                        />
                      ) : (
                        <ImageIcon size={24} className="text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 w-full space-y-2">
                      <label className="text-[11px] font-bold text-slate-700 block">Ảnh đại diện sản phẩm (Thumbnail):</label>
                      <p className="text-[11px] text-slate-500">
                        Tải tệp hình ảnh từ máy tính lên MinIO hoặc chọn ảnh chính ở thư viện bên dưới.
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <label className={`px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition ${
                          isUploadingThumbnail ? 'opacity-50 pointer-events-none' : ''
                        }`}>
                          {isUploadingThumbnail ? (
                            <Loader2 size={13} className="animate-spin text-blue-600" />
                          ) : (
                            <Upload size={13} className="text-blue-600" />
                          )}
                          <span>{isUploadingThumbnail ? 'Đang tải MinIO...' : 'Tải ảnh từ máy'}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                            onChange={handleProductThumbnailUpload}
                            disabled={isUploadingThumbnail}
                            className="hidden"
                          />
                        </label>
                        <span className="text-[10px] text-slate-400 italic">Hỗ trợ PNG, JPG, WEBP, GIF, SVG</span>
                      </div>
                    </div>
                  </div>
                </div>

                <ProductImagesManager
                  gallery={editProdGallery}
                  thumbnail={editProdThumbnail}
                  onChangeGallery={setEditProdGallery}
                  onChangeThumbnail={setEditProdThumbnail}
                />
              </div>

              {/* ================= 3. MA TRẬN BIẾN THỂ SKU & TỒN KHO ================= */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
                      3. Ma trận biến thể SKU & Quản lý tồn kho
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Mỗi biến thể có mã SKU định danh, giá niêm yết, định mức tồn kho và các thuộc tính động theo ngành hàng: <strong>{editProdCategory || 'Ngành hàng'}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddVariantInEdit}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition"
                  >
                    <Plus size={14} />
                    <span>Thêm biến thể mới</span>
                  </button>
                </div>

                {editProdVariants.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
                    <p className="text-xs text-slate-500">Sản phẩm này hiện chưa có biến thể SKU nào.</p>
                    <button
                      type="button"
                      onClick={handleOpenAddVariantInEdit}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Thêm biến thể đầu tiên
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {editProdVariants.map((v, varIdx) => {
                      const isLocked = Boolean(v.hasTransactions);
                      const isSaving = savingVariantId === v.variantId;

                      return (
                        <div
                          key={v.variantId || varIdx}
                          className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3 hover:border-blue-200 transition"
                        >
                          {/* Variant Card Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">
                                #{varIdx + 1}. {v.variantName || v.sku || `Biến thể #${v.variantId}`}
                              </span>

                              {/* SKU Permanent Lock Badge */}
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200/90 text-slate-700 border border-slate-300 flex items-center gap-1"
                                title="Mã SKU biến thể là mã định danh cố định trong hệ thống kho, không được phép chỉnh sửa sau khi tạo"
                              >
                                <Lock size={11} className="text-slate-600" />
                                <span>Mã SKU cố định</span>
                              </span>

                              {/* Status Badge */}
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                v.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {v.isActive !== false ? 'Đang bán' : 'Tạm dừng'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSaveSingleVariant(varIdx)}
                              disabled={isSaving}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition"
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 size={12} className="animate-spin" />
                                  <span>Đang lưu...</span>
                                </>
                              ) : (
                                <>
                                  <Check size={12} />
                                  <span>Lưu biến thể này</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Variant Primary Fields */}
                          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold text-slate-700">Mã SKU (Cố định):</label>
                                <span className="text-[9px] text-slate-500 font-medium">Không thể sửa</span>
                              </div>
                              <input
                                type="text"
                                value={v.sku || ''}
                                readOnly={true}
                                title="Mã SKU biến thể là mã định danh duy nhất cố định, không được phép chỉnh sửa sau khi tạo."
                                className="w-full h-8 px-2.5 rounded text-xs font-mono font-bold bg-slate-100 border border-slate-300 text-slate-600 cursor-not-allowed select-all focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-700 block mb-1">Giá niêm yết gốc (VNĐ) *:</label>
                              <input
                                type="number"
                                min={1}
                                step={10000}
                                value={v.listPrice !== undefined && v.listPrice !== null ? v.listPrice : ''}
                                onChange={(e) => handleUpdateEditVariant(varIdx, { listPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                                className={`w-full h-8 px-2.5 bg-white border rounded text-xs font-mono font-bold focus:outline-none ${
                                  Number(v.listPrice || 0) <= 0 ? 'border-rose-500 text-rose-700' : 'border-slate-300 text-slate-700 focus:border-blue-600'
                                }`}
                              />
                              {Number(v.listPrice || 0) <= 0 && (
                                <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Giá niêm yết phải &gt; 0</p>
                              )}
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-700 block mb-1">Giá bán hiện hành (VNĐ) *:</label>
                              {(() => {
                                const lp = Number(v.listPrice || 0);
                                const sp = Number(v.salePrice || 0);
                                const isInvalidZero = sp <= 0;
                                const isExceedList = lp > 0 && sp > lp;
                                const hasErr = isInvalidZero || isExceedList;
                                return (
                                  <>
                                    <input
                                      type="number"
                                      min={1}
                                      step={10000}
                                      value={v.salePrice !== undefined && v.salePrice !== null ? v.salePrice : ''}
                                      onChange={(e) => handleUpdateEditVariant(varIdx, { salePrice: e.target.value === '' ? '' : Number(e.target.value) })}
                                      className={`w-full h-8 px-2.5 bg-white border rounded text-xs font-mono font-bold focus:outline-none ${
                                        hasErr ? 'border-rose-500 ring-2 ring-rose-500/20 text-rose-700' : 'border-slate-300 text-emerald-700 focus:border-blue-600'
                                      }`}
                                    />
                                    {isInvalidZero ? (
                                      <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Giá bán phải &gt; 0</p>
                                    ) : isExceedList ? (
                                      <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Giá bán không được lớn hơn giá niêm yết</p>
                                    ) : null}
                                  </>
                                );
                              })()}
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-700 block mb-1">Định mức tồn tối thiểu:</label>
                              <input
                                type="number"
                                min={0}
                                value={v.inventory?.minThreshold ?? v.minThreshold ?? 5}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  handleUpdateEditVariant(varIdx, {
                                    minThreshold: val,
                                    inventory: {
                                      ...(v.inventory || {}),
                                      minThreshold: val
                                    }
                                  });
                                }}
                                className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-700 block mb-1">Trạng thái SKU:</label>
                              <select
                                value={v.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                                onChange={(e) => handleUpdateEditVariant(varIdx, { isActive: e.target.value === 'ACTIVE' })}
                                className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
                              >
                                <option value="ACTIVE">Đang kinh doanh</option>
                                <option value="INACTIVE">Tạm dừng bán</option>
                              </select>
                            </div>
                          </div>

                          {/* Dynamic Variant Attributes */}
                          <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
                              Thuộc tính kỹ thuật biến thể ({editProdCategory || 'Ngành hàng'}):
                            </span>
                            <DynamicVariantInputs
                              schema={editVariantSchema}
                              variant={v}
                              onChange={(updated) => handleUpdateEditVariant(varIdx, updated)}
                            />
                          </div>

                          {/* Inventory Block (Read-only on-hand, reserved, available + Stock adjustment button) */}
                          <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-4 text-xs">
                              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                <Boxes size={15} className="text-blue-600" />
                                <span>Khối Tồn Kho:</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-slate-500 text-[11px]">Tồn thực tế:</span>
                                <strong className="font-mono text-slate-900 font-bold">
                                  {v.inventory?.onHandQty ?? v.onHandQty ?? 0}
                                </strong>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-slate-500 text-[11px]">Đang giữ đơn:</span>
                                <strong className="font-mono text-amber-700 font-bold">
                                  {v.inventory?.reservedQty ?? v.reservedQty ?? 0}
                                </strong>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-slate-500 text-[11px]">Khả dụng bán:</span>
                                <strong className="font-mono text-emerald-700 font-bold">
                                  {v.inventory?.availableQty ?? v.availableQty ?? 0}
                                </strong>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenStockAdjust(v)}
                              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-indigo-700 font-bold border border-indigo-200 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition"
                            >
                              <Package size={13} />
                              <span>Điều chỉnh tồn kho</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ================= 4. QUẢN LÝ THÔNG SỐ KỸ THUẬT (PRODUCT_SPECS) ================= */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
                  4. Thông số kỹ thuật sản phẩm (Product_Specs)
                </span>
                <ProductSpecsEditor
                  groups={editProdSpecGroups}
                  onChange={setEditProdSpecGroups}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <span className="text-[11px] text-slate-500">
                Lưu ý: Thay đổi mã SKU hoặc thuộc tính biến thể sẽ cập nhật tên biến thể tự động
              </span>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Đóng / Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveProductEdit}
                  disabled={isSavingProduct}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
                >
                  {isSavingProduct ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Đang lưu thông tin sản phẩm...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Lưu thông tin sản phẩm & Thông số</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL ĐIỀU CHỈNH TỒN KHO CHO BIẾN THỂ ================= */}
      <StockAdjustmentModal
        variant={adjustingVariant}
        onClose={() => setAdjustingVariant(null)}
        onSuccess={handleStockAdjustSuccess}
      />

      {/* ================= MODAL THÊM BIẾN THỂ MỚI TRONG SỬA SẢN PHẨM ================= */}
      {showAddVariantInEdit && (
        <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Plus size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase">
                    Thêm biến thể SKU mới
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Sản phẩm: {editProdName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddVariantInEdit(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Mã SKU *:</label>
                <input
                  type="text"
                  placeholder="VD: IP15PM-WHT-512"
                  value={newVarDraftInEdit.sku}
                  onChange={(e) => setNewVarDraftInEdit({ ...newVarDraftInEdit, sku: e.target.value.toUpperCase() })}
                  className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Dynamic Inputs according to category schema */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                  Thuộc tính kỹ thuật ({editProdCategory || 'Ngành hàng'}):
                </span>
                <DynamicVariantInputs
                  schema={editVariantSchema}
                  variant={newVarDraftInEdit}
                  onChange={(updated) => setNewVarDraftInEdit(prev => ({ ...prev, ...updated }))}
                />
              </div>

              {/* Chọn / Tải ảnh cho biến thể mới */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
                    Ảnh riêng biến thể (Tùy chọn)
                  </span>
                  <span className="text-[10px] text-slate-500">Mặc định dùng ảnh sản phẩm</span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-xl border border-slate-300 bg-white p-1 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-xs">
                    {newVarDraftInEdit.imageUrl ? (
                      <img 
                        src={newVarDraftInEdit.imageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/f8fafc/64748b?text=Lỗi+ảnh';
                        }}
                      />
                    ) : (
                      <ImageIcon size={20} className="text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <p className="text-[11px] text-slate-500">
                      Tải ảnh từ máy tính lên MinIO hoặc chọn từ thư viện ảnh sản phẩm.
                    </p>

                    <div className="flex items-center gap-2">
                      <label className={`px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-2xs ${
                        isUploadingNewVarImg ? 'opacity-50 pointer-events-none' : ''
                      }`}>
                        {isUploadingNewVarImg ? (
                          <Loader2 size={12} className="animate-spin text-blue-600" />
                        ) : (
                          <UploadCloud size={12} className="text-blue-600" />
                        )}
                        <span>{isUploadingNewVarImg ? 'Đang tải lên MinIO...' : 'Tải ảnh từ máy'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (!file.type.startsWith('image/')) {
                              alert('Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP)!');
                              return;
                            }
                            setIsUploadingNewVarImg(true);
                            try {
                              const minioUrl = await uploadProductImageToMinio(file, editingProduct?.productId);
                              setNewVarDraftInEdit(prev => ({ ...prev, imageUrl: minioUrl }));
                            } catch (err: any) {
                              alert(`Lỗi tải ảnh biến thể lên MinIO: ${err.message}`);
                            } finally {
                              setIsUploadingNewVarImg(false);
                              e.target.value = '';
                            }
                          }}
                          disabled={isUploadingNewVarImg}
                          className="hidden"
                        />
                      </label>

                      {newVarDraftInEdit.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setNewVarDraftInEdit(prev => ({ ...prev, imageUrl: '' }))}
                          className="px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition"
                        >
                          Gỡ ảnh
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chọn nhanh từ danh mục ảnh sản phẩm có sẵn */}
                {editProdGallery.length > 0 && (
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">
                      Hoặc chọn nhanh từ thư viện ảnh sản phẩm:
                    </span>
                    <div className="flex gap-1.5 overflow-x-auto py-1">
                      {editProdGallery.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNewVarDraftInEdit(prev => ({ ...prev, imageUrl: imgUrl }))}
                          className={`w-10 h-10 rounded-lg border p-0.5 overflow-hidden flex-shrink-0 transition-all ${
                            newVarDraftInEdit.imageUrl === imgUrl
                              ? 'border-2 border-blue-600 ring-2 ring-blue-100'
                              : 'border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={imgUrl} alt={`gallery-${idx}`} className="w-full h-full object-contain" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {addVarInEditError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle size={14} className="shrink-0 text-rose-600" />
                  <span>{addVarInEditError}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Giá niêm yết gốc (VNĐ) *:</label>
                  <input
                    type="number"
                    min={1}
                    step={10000}
                    placeholder="VD: 25000000"
                    value={newVarDraftInEdit.listPrice > 0 ? newVarDraftInEdit.listPrice : ''}
                    onChange={(e) => {
                      setAddVarInEditError('');
                      setNewVarDraftInEdit({ ...newVarDraftInEdit, listPrice: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) });
                    }}
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Giá bán hiện hành (VNĐ) *:</label>
                  {(() => {
                    const isExceedList = newVarDraftInEdit.listPrice > 0 && newVarDraftInEdit.salePrice > newVarDraftInEdit.listPrice;
                    return (
                      <>
                        <input
                          type="number"
                          min={1}
                          step={10000}
                          placeholder="VD: 23500000"
                          value={newVarDraftInEdit.salePrice > 0 ? newVarDraftInEdit.salePrice : ''}
                          onChange={(e) => {
                            setAddVarInEditError('');
                            setNewVarDraftInEdit({ ...newVarDraftInEdit, salePrice: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) });
                          }}
                          className={`w-full h-9 px-3 bg-white border rounded-lg font-mono font-bold text-xs focus:outline-none ${
                            isExceedList ? 'border-rose-500 ring-2 ring-rose-500/20 text-rose-700' : 'border-slate-300 text-slate-900 focus:border-blue-600'
                          }`}
                        />
                        {isExceedList && (
                          <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Giá bán không được &gt; giá niêm yết</p>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Tồn kho ban đầu *:</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="VD: 10"
                    value={newVarDraftInEdit.initialStock > 0 ? newVarDraftInEdit.initialStock : ''}
                    onChange={(e) => {
                      setAddVarInEditError('');
                      setNewVarDraftInEdit({ ...newVarDraftInEdit, initialStock: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) });
                    }}
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddVariantInEdit(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveNewVariantInEdit}
                disabled={isAddingVariantInEdit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
              >
                {isAddingVariantInEdit ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Đang thêm biến thể...</span>
                  </>
                ) : (
                  <span>Thêm biến thể</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL CHỈNH SỬA BIẾN THỂ SKU (ẢNH & GIÁ) ĐÃ THÊM ================= */}
      {editingVariant && (() => {
        const currentProd = products.find(p => p.productId === editingVariant.prodId);

        return (
          <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <Tag size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase">
                      Chỉnh sửa biến thể SKU & Ảnh
                    </h3>
                    <span className="text-[11px] font-mono text-indigo-600 font-bold">
                      SKU: {editingVariant.variant.sku}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingVariant(null)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {currentProd && Array.isArray(currentProd.variants) && currentProd.variants.length > 0 && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chuyển sang biến thể SKU khác của sản phẩm này:</label>
                  <select
                    value={editingVariant.variant.sku}
                    onChange={(e) => {
                      const selectedV = currentProd.variants?.find(v => v && v.sku === e.target.value);
                      if (selectedV) {
                        handleOpenEditVariant(currentProd.productId, selectedV);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-mono font-bold text-xs focus:outline-none focus:border-blue-600"
                  >
                    {currentProd.variants.map(v => (
                      <option key={v.sku} value={v.sku}>
                        {v.sku} — {v.color} {(v.romGb || 0) >= 1024? '1TB': `${v.romGb || 0}GB`} ({formatVND(v.salePrice > 0? v.salePrice: v.listPrice || 0)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 1. KHU VỰC CHỈNH SỬA ẢNH BIẾN THỂ */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
                    1. Ảnh riêng của biến thể (Màu {editVariantColor || editingVariant.variant.color})
                  </span>
                  <span className="text-[10px] text-slate-500">Hiển thị khi khách bấm chọn màu này</span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-20 h-20 rounded-xl border border-slate-300 bg-white p-1 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-xs">
                    {editVariantImage? (
                      <img 
                        src={editVariantImage} 
                        alt="Variant preview" 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/f8fafc/64748b?text=Lỗi+ảnh';
                        }}
                      />
                    ): (
                      <ImageIcon size={20} className="text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <p className="text-[11px] text-slate-500">
                      Tải ảnh từ máy tính lên MinIO hoặc chọn nhanh từ thư viện ảnh sản phẩm bên dưới.
                    </p>

                    <div className="flex items-center gap-2">
                      <label className={`px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-xs transition ${
                        isUploadingVariantImage ? 'opacity-50 pointer-events-none' : ''
                      }`}>
                        {isUploadingVariantImage ? (
                          <Loader2 size={12} className="animate-spin text-indigo-600" />
                        ) : (
                          <Upload size={12} className="text-indigo-600" />
                        )}
                        <span>{isUploadingVariantImage ? 'Đang tải MinIO...' : 'Tải từ máy'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                          onChange={handleVariantFileUpload}
                          disabled={isUploadingVariantImage}
                          className="hidden"
                        />
                      </label>

                      {currentProd && currentProd.thumbnail && (
                        <button
                          type="button"
                          onClick={() => setEditVariantImage(currentProd.thumbnail)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-600 text-[11px] font-medium transition"
                          title="Sử dụng ảnh đại diện sản phẩm cha cho biến thể này"
                        >
                          Dùng ảnh SP chính
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chọn nhanh từ Thư viện ảnh của sản phẩm cha */}
                {currentProd && currentProd.gallery && currentProd.gallery.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase">
                      Chọn nhanh từ Thư viện ảnh sản phẩm:
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {currentProd.gallery.map((imgUrl: string, i: number) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setEditVariantImage(imgUrl)}
                          className={`w-12 h-12 rounded-lg border-2 p-0.5 overflow-hidden flex-shrink-0 bg-white transition ${
                            editVariantImage === imgUrl? 'border-indigo-600 ring-2 ring-indigo-200': 'border-slate-200 hover:border-slate-400'
                          }`}
                          title="Nhấp để áp dụng ảnh này cho biến thể"
                        >
                          <img src={imgUrl} alt="" className="w-full h-full object-contain" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. KHU VỰC THÔNG SỐ VÀ GIÁ BÁN */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
                  2. Giá bán & Thuộc tính biến thể
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Màu sắc:</label>
                    <input
                      type="text"
                      value={editVariantColor}
                      onChange={(e) => setEditVariantColor(e.target.value)}
                      className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-bold focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Mã màu HEX hiển thị:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editVariantColorHex}
                        onChange={(e) => setEditVariantColorHex(e.target.value)}
                        className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={editVariantColorHex}
                        onChange={(e) => setEditVariantColorHex(e.target.value)}
                        className="flex-1 h-8 px-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Giá bán hiện hành (VNĐ) *:</label>
                    {(() => {
                      const isInvalidZero = editSalePrice <= 0;
                      const isExceedList = editListPrice > 0 && editSalePrice > editListPrice;
                      const hasErr = isInvalidZero || isExceedList;
                      return (
                        <>
                          <input
                            type="number"
                            step={50000}
                            min={1}
                            value={editSalePrice ? editSalePrice : ''}
                            onChange={(e) => setEditSalePrice(e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                            className={`w-full h-8 px-2.5 bg-white border rounded-lg text-xs font-extrabold font-mono focus:outline-none ${
                              hasErr ? 'border-rose-500 ring-2 ring-rose-500/20 text-rose-700' : 'border-slate-300 focus:border-blue-600 text-blue-700'
                            }`}
                          />
                          {isInvalidZero ? (
                            <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Giá bán phải &gt; 0</p>
                          ) : isExceedList ? (
                            <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Giá bán không được lớn hơn giá niêm yết</p>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Giá niêm yết gốc (VNĐ) *:</label>
                    <input
                      type="number"
                      step={50000}
                      min={1}
                      value={editListPrice ? editListPrice : ''}
                      onChange={(e) => setEditListPrice(e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                      className={`w-full h-8 px-2.5 bg-white border rounded-lg text-xs font-bold font-mono focus:outline-none ${
                        editListPrice <= 0 ? 'border-rose-500 text-rose-700' : 'border-slate-300 text-slate-600 focus:border-blue-600'
                      }`}
                    />
                    {editListPrice <= 0 && (
                      <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Giá niêm yết phải &gt; 0</p>
                    )}
                  </div>
                </div>

                {/* Thông số kỹ thuật của biến thể theo ngành hàng */}
                {editVariantSchema.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Thông số kỹ thuật biến thể:
                    </span>
                    <DynamicVariantInputs
                      schema={editVariantSchema}
                      variant={{
                        sku: editingVariant.variant.sku,
                        color: editVariantColor,
                        ramGb: editVariantRamGb,
                        romGb: editVariantRomGb,
                        connectionType: editVariantConnectionType,
                        attributes: editVariantAttributes,
                        listPrice: editListPrice,
                        salePrice: editSalePrice
                      }}
                      onChange={(updated) => {
                        setEditVariantColor(updated.color);
                        setEditVariantRamGb(updated.ramGb);
                        setEditVariantRomGb(updated.romGb);
                        setEditVariantConnectionType(updated.connectionType);
                        setEditVariantAttributes(updated.attributes || {});
                      }}
                    />
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium">Trạng thái kinh doanh biến thể này:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={editVariantActive}
                      onChange={(e) => setEditVariantActive(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                    />
                    <span>{editVariantActive? 'Đang mở bán': 'Tạm dừng bán'}</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingVariant(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSaveVariantEdit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition"
                >
                  Lưu thay đổi biến thể & Ảnh
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= MODAL XÁC NHẬN MỞ BÁN LẠI SẢN PHẨM & BIẾN THỂ ================= */}
      {reactivatingModal && (
        <div className="fixed inset-0 z-[75] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Eye size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase">
                    Xác nhận mở bán lại sản phẩm
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {reactivatingModal.product.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isReactivatingProduct}
                onClick={() => setReactivatingModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 space-y-1">
              <p className="font-bold text-[11px]">
                Chọn trạng thái mở bán cho từng biến thể SKU con:
              </p>
              <p className="text-[11px] leading-relaxed">
                {reactivatingModal.prePausedIds.length > 0
                  ? `Phát hiện ${reactivatingModal.prePausedIds.length} biến thể SKU đã được tắt riêng trước đó — hệ thống mặc định giữ nguyên trạng thái "Tạm dừng" cho các SKU này.`
                  : 'Bạn có thể chọn mở bán tất cả hoặc giữ tạm dừng riêng từng biến thể SKU bên dưới.'}
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {(reactivatingModal.product.variants || []).map(v => {
                const vid = Number(v.variantId);
                const checked = reactivatingModal.variantStates[vid] !== false;
                const wasPrePaused = reactivatingModal.prePausedIds.includes(vid);

                return (
                  <label
                    key={vid}
                    className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isReactivatingProduct}
                        onChange={(e) => {
                          const nextChecked = e.target.checked;
                          setReactivatingModal(prev =>
                            prev
                              ? {
                                  ...prev,
                                  variantStates: {
                                    ...prev.variantStates,
                                    [vid]: nextChecked,
                                  },
                                }
                              : null
                          );
                        }}
                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
                      />
                      <div className="min-w-0">
                        <div className="font-mono font-bold text-slate-900 truncate">
                          {v.sku}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {v.variantName || v.color}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {wasPrePaused && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                          Đã tắt riêng trước đó
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          checked
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {checked ? 'Đang bán' : 'Tạm dừng'}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                disabled={isReactivatingProduct}
                onClick={() => setReactivatingModal(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isReactivatingProduct}
                onClick={() => handleConfirmReactivateProduct(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition"
              >
                Mở bán tất cả SKU
              </button>
              <button
                type="button"
                disabled={isReactivatingProduct}
                onClick={() => handleConfirmReactivateProduct(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
              >
                {isReactivatingProduct && <Loader2 size={13} className="animate-spin" />}
                <span>Xác nhận mở bán theo lựa chọn</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
