import React, { useState, useEffect, useMemo } from 'react';
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

export const PortalProductsView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(sharedStore.getProducts());
  const [brands, setBrands] = useState<Brand[]>(sharedStore.getBrands());
  const [categories, setCategories] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState('');

  // Modal Thêm sản phẩm mới
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newBrand, setNewBrand] = useState('Apple');
  const [newCategory, setNewCategory] = useState('Điện thoại');
  const [newWarranty, setNewWarranty] = useState('Bảo hành 12 tháng chính hãng. 1 đổi 1 trong 30 ngày nếu lỗi NSX.');
  const [newThumbnail, setNewThumbnail] = useState('https://cdn.tgdd.vn/Products/Images/42/305658/iphone-15-pro-max-blue-thumbnew-600x600.jpg');

  // Thư viện ảnh (Product_Images)
  const [newGallery, setNewGallery] = useState<string[]>([
    'https://cdn.tgdd.vn/Products/Images/42/305658/iphone-15-pro-max-blue-thumbnew-600x600.jpg'
  ]);

  // Thông số kỹ thuật (Product_Specs)
  const [newSpecGroups, setNewSpecGroups] = useState<ProductSpecGroup[]>([
    {
      groupName: 'Màn hình',
      items: [
        { name: 'Công nghệ màn hình', value: 'OLED Super Retina XDR' },
        { name: 'Kích thước màn hình', value: '6.7 inch' }
      ]
    },
    {
      groupName: 'Cấu hình & Bộ nhớ',
      items: [
        { name: 'Hệ điều hành', value: 'iOS' },
        { name: 'Chip xử lý (CPU)', value: 'Apple A17 Pro 6 nhân' }
      ]
    }
  ]);

  // Variant Schema động theo ngành hàng được chọn
  const [variantSchema, setVariantSchema] = useState<VariantSchemaField[]>(() =>
    variantSchemaService.getStandardSchemaByCategoryName('Điện thoại')
  );

  // Danh sách biến thể SKU (Product_Variants)
  const [draftVariants, setDraftVariants] = useState<DraftVariant[]>([
    {
      sku: '',
      color: 'Titan Tự Nhiên',
      colorHex: '#C5BDB5',
      ramGb: 8,
      romGb: 256,
      connectionType: '5G',
      attributes: {},
      listPrice: 28000000,
      salePrice: 25990000,
      initialStock: 15,
      isActive: true
    }
  ]);

  const handleAddDraftVariant = () => {
    const hasRam = variantSchema.some(f => f.key === 'ramGb');
    const hasRom = variantSchema.some(f => f.key === 'romGb');
    const hasConn = variantSchema.some(f => f.key === 'connectionType');
    setDraftVariants([...draftVariants,
      {
        sku: '',
        color: 'Đen',
        colorHex: '#000000',
        ramGb: hasRam ? 8 : undefined,
        romGb: hasRom ? 256 : undefined,
        connectionType: hasConn ? '5G' : undefined,
        attributes: {},
        listPrice: 28000000,
        salePrice: 25990000,
        initialStock: 10,
        isActive: true
      }
    ]);
  };

  const handleUpdateDraftVariant = (idx: number, field: keyof DraftVariant, val: any) => {
    const updated = [...draftVariants];
    updated[idx] = {...updated[idx], [field]: val };
    setDraftVariants(updated);
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
  const [editProdStatus, setEditProdStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editProdSpecGroups, setEditProdSpecGroups] = useState<ProductSpecGroup[]>([]);
  const [editProdVariants, setEditProdVariants] = useState<any[]>([]);
  const [isLoadingProductDetail, setIsLoadingProductDetail] = useState(false);
  const [savingVariantId, setSavingVariantId] = useState<number | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Thêm biến thể mới trong Modal sửa sản phẩm
  const [showAddVariantInEdit, setShowAddVariantInEdit] = useState(false);
  const [newVarDraftInEdit, setNewVarDraftInEdit] = useState<DraftVariant>({
    sku: '',
    color: 'Mặc định',
    colorHex: '#000000',
    ramGb: 8,
    romGb: 256,
    connectionType: '5G',
    attributes: {},
    listPrice: 10000000,
    salePrice: 10000000,
    initialStock: 10,
    isActive: true
  });
  const [isAddingVariantInEdit, setIsAddingVariantInEdit] = useState(false);

  // Modal Điều chỉnh tồn kho (Stock Adjustment)
  const [adjustingVariant, setAdjustingVariant] = useState<any | null>(null);
  const [adjustActualCount, setAdjustActualCount] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Kiểm kê định kỳ cân đối số lượng');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState<boolean>(false);

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
            setNewCategory(prev => (list.some(c => c.name === prev) ? prev : list[0].name));
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

    productService.getProducts().then(prods => {
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

  // Tạo sản phẩm mới kèm danh sách biến thể SKU
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      alert('Vui lòng nhập tên sản phẩm!');
      return;
    }

    const skus = draftVariants.map(v => v.sku.trim().toUpperCase());
    if (skus.some(s =>!s)) {
      alert('Vui lòng nhập đầy đủ mã SKU cho tất cả các biến thể!');
      return;
    }
    if (new Set(skus).size!== skus.length) {
      alert('Các mã SKU biến thể trong cùng một sản phẩm không được trùng nhau!');
      return;
    }

    const newProdId = Date.now();

    const createdVariants: ProductVariant[] = draftVariants.map((dv, idx) => {
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
        salePrice: dv.salePrice,
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
      isInstallment0: true,
      warrantyPolicy: newWarranty,
      thumbnail: newThumbnail,
      gallery: newGallery.length > 0? newGallery: [newThumbnail],
      variants: createdVariants,
      rating: 5.0,
      reviewCount: 0,
      soldCount: 0,
      specGroups: newSpecGroups,
      highlights: ['Thiết kế sang trọng, hiệu năng vượt trội', 'Bảo hành chính hãng 12 tháng']
    };

    // Thêm bản ghi tồn kho cho từng biến thể
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
    const updatedInv = [...newInventoryRecords, ...currentInventories];
    localStorage.setItem('np_inventory_v2', JSON.stringify(updatedInv));

    sharedStore.addProduct(newProd);

    const matchedCategory = categories.find(c => c.name.toLowerCase() === newCategory.toLowerCase());
    const matchedBrand = brands.find(b => b.name.toLowerCase() === newBrand.toLowerCase());

    // API 4.5: Khai báo sản phẩm mới (Master-Detail)
    productService.createAdminProduct({
      categoryId: matchedCategory ? matchedCategory.id : 1,
      brandId: matchedBrand ? matchedBrand.brandId : 1,
      name: newProdName.trim(),
      description: newWarranty,
      warrantyPolicy: newWarranty,
      status: 'ACTIVE',
      images: (newGallery.length > 0 ? newGallery : [newThumbnail]).map((img, idx) => ({
        imageUrl: img,
        isPrimary: idx === 0,
        sortOrder: idx + 1,
      })),
      specs: newSpecGroups.flatMap(g => g.items.map((it, idx) => ({
        groupName: g.groupName,
        specName: it.name,
        specValue: it.value,
        sortOrder: idx + 1,
      }))),
      variants: draftVariants.map(v => ({
        sku: v.sku.trim().toUpperCase(),
        color: v.color,
        ramGb: v.ramGb,
        romGb: v.romGb,
        connectionType: v.connectionType,
        attributes: v.attributes,
        listPrice: v.listPrice,
        salePrice: v.salePrice || v.listPrice,
        initialOnHandQty: v.initialStock,
        minThreshold: 5,
      })),
    }).then(() => {
      productService.getProducts().then(prods => {
        if (prods && prods.length > 0) setProducts(prods);
      }).catch(() => {});
    }).catch(err => console.warn('[PortalProductsView] createAdminProduct error', err));

    sharedStore.addAuditLog({
      performedBy: 'Nguyễn Thế Minh (Admin)',
      action: 'CREATE_PRODUCT',
      entityName: 'Products',
      entityId: String(newProdId),
      oldValue: 'None',
      newValue: `Thêm sản phẩm "${newProdName}" với ${createdVariants.length} biến thể SKU (Tổng tồn: ${createdVariants.reduce((s, v) => s + v.onHandQty, 0)} máy)`
    });

    setProducts([...sharedStore.getProducts()]);
    setShowAddModal(false);
    setNewProdName('');
    alert(`Đã thêm sản phẩm "${newProd.name}" với ${createdVariants.length} biến thể SKU thành công!`);
  };

  // Bật / Tắt trạng thái kinh doanh của sản phẩm (đồng bộ tới toàn bộ biến thể)
  const handleToggleProductStatus = async (p: Product) => {
    const isCurrentlyActive = p.status !== 'INACTIVE';
    const nextStatus = isCurrentlyActive ? 'INACTIVE' : 'ACTIVE';
    const actionText = isCurrentlyActive ? 'ngừng kinh doanh' : 'mở bán lại';
    if (!confirm(`Bạn có chắc chắn muốn ${actionText} sản phẩm "${p.name}"? ${isCurrentlyActive ? 'Toàn bộ biến thể SKU cũng sẽ tạm ngừng bán.' : 'Toàn bộ biến thể SKU sẽ được mở bán lại.'}`)) {
      return;
    }
    await productService.updateProductStatus(p.productId, nextStatus, `Quản trị viên chuyển trạng thái sang ${nextStatus}`);
    setProducts([...sharedStore.getProducts()]);
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
    setEditProdDescription(p.warrantyPolicy || '');
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
        setEditProdDescription(detail.warrantyPolicy || detail.description || p.warrantyPolicy || '');
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
      alert('Mã SKU không được để trống!');
      return;
    }
    const listPrice = Number(v.listPrice || 0);
    const salePrice = Number(v.salePrice || listPrice);
    if (listPrice <= 0 && salePrice <= 0) {
      alert('Giá biến thể phải lớn hơn 0 đồng!');
      return;
    }

    setSavingVariantId(v.variantId);
    try {
      const minThresh = Number(v.inventory?.minThreshold ?? v.minThreshold ?? 5);
      const payload = {
        sku,
        listPrice: listPrice > 0 ? listPrice : salePrice,
        salePrice: salePrice > 0 ? salePrice : listPrice,
        compareAtPrice: listPrice > 0 ? listPrice : salePrice,
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
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi cập nhật biến thể';
      alert(`LỖI CẬP NHẬT BIẾN THỂ: ${msg}`);
    } finally {
      setSavingVariantId(null);
    }
  };

  const [isUploadingNewVarImg, setIsUploadingNewVarImg] = useState(false);

  const handleOpenAddVariantInEdit = () => {
    const hasRam = editVariantSchema.some(f => f.key === 'ramGb');
    const hasRom = editVariantSchema.some(f => f.key === 'romGb');
    const hasConn = editVariantSchema.some(f => f.key === 'connectionType');
    setNewVarDraftInEdit({
      sku: '',
      color: 'Mặc định',
      colorHex: '#000000',
      ramGb: hasRam ? 8 : undefined,
      romGb: hasRom ? 256 : undefined,
      connectionType: hasConn ? '5G' : undefined,
      attributes: {},
      listPrice: 10000000,
      salePrice: 10000000,
      initialStock: 10,
      isActive: true,
      imageUrl: editProdThumbnail || editProdGallery[0] || ''
    });
    setShowAddVariantInEdit(true);
  };

  const handleSaveNewVariantInEdit = async () => {
    if (!editingProduct) return;
    const sku = newVarDraftInEdit.sku.trim().toUpperCase();
    if (!sku) {
      alert('Vui lòng nhập mã SKU cho biến thể mới!');
      return;
    }
    if (editProdVariants.some(v => (v.sku || '').toUpperCase() === sku)) {
      alert(`Mã SKU "${sku}" đã tồn tại trong sản phẩm này!`);
      return;
    }
    if (newVarDraftInEdit.listPrice <= 0) {
      alert('Giá niêm yết gốc phải lớn hơn 0 đồng!');
      return;
    }
    const finalSalePrice = newVarDraftInEdit.salePrice || newVarDraftInEdit.listPrice;
    if (finalSalePrice <= 0) {
      alert('Giá bán hiện hành phải lớn hơn 0 đồng!');
      return;
    }

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
    const curStock = v.inventory?.onHandQty ?? v.onHandQty ?? 0;
    setAdjustActualCount(curStock);
    setAdjustReason('Kiểm kê định kỳ cân đối số lượng');
  };

  const handleSubmitStockAdjust = async () => {
    if (!adjustingVariant) return;
    if (adjustActualCount < 0) {
      alert('Số lượng tồn thực tế không được âm!');
      return;
    }
    if (!adjustReason.trim()) {
      alert('Vui lòng nhập lý do điều chỉnh tồn kho!');
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      const res = await inventoryService.createStockAdjustment({
        variantId: adjustingVariant.variantId,
        actualCount: adjustActualCount,
        reason: adjustReason.trim()
      });

      if (res.success) {
        setEditProdVariants(prev => prev.map(v => {
          if (v.variantId === adjustingVariant.variantId) {
            const reserved = v.inventory?.reservedQty ?? v.reservedQty ?? 0;
            return {
              ...v,
              onHandQty: adjustActualCount,
              availableQty: Math.max(0, adjustActualCount - reserved),
              inventory: {
                ...(v.inventory || {}),
                onHandQty: adjustActualCount,
                availableQty: Math.max(0, adjustActualCount - reserved)
              }
            };
          }
          return v;
        }));

        alert(res.message || 'Đã điều chỉnh cân đối tồn kho thành công!');
        setAdjustingVariant(null);
      } else {
        alert(res.message || 'Không thể điều chỉnh tồn kho!');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi điều chỉnh tồn kho';
      alert(`LỖI ĐIỀU CHỈNH TỒN KHO: ${msg}`);
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const handleSaveProductEdit = async () => {
    if (!editingProduct) return;
    if (!editProdName.trim()) {
      alert('Tên sản phẩm không được để trống!');
      return;
    }
    if (!editProdThumbnail.trim()) {
      alert('Vui lòng chọn hoặc thêm ảnh đại diện cho sản phẩm!');
      return;
    }

    setIsSavingProduct(true);
    try {
      const finalGallery = editProdGallery.length > 0 ? editProdGallery : [editProdThumbnail.trim()];
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
        description: editProdDescription,
        warrantyPolicy: editProdDescription,
        images: finalGallery.map((img, idx) => ({
          imageUrl: img,
          isPrimary: idx === 0,
          sortOrder: idx + 1
        })),
        specs: specsPayload
      });

      const statusChanged = (editingProduct.status || 'ACTIVE') !== editProdStatus;
      if (statusChanged) {
        await productService.updateProductStatus(editingProduct.productId, editProdStatus, `Admin đổi trạng thái sản phẩm sang ${editProdStatus}`);
      }

      // Đồng bộ lưu các biến thể (bao gồm giá niêm yết gốc & giá bán hiện hành)
      for (const v of editProdVariants) {
        if (v && v.variantId) {
          const listPrice = Number(v.listPrice || 0);
          const salePrice = Number(v.salePrice || listPrice);
          const minThresh = Number(v.inventory?.minThreshold ?? v.minThreshold ?? 5);
          const effectiveList = listPrice > 0 ? listPrice : salePrice;
          const effectiveSale = salePrice > 0 ? salePrice : listPrice;
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
              imageUrl: v.imageUrl || editProdThumbnail
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
              isActive: v.isActive !== false
            });
          } catch (varErr) {
            console.warn('[PortalProductsView] Error saving variant in product edit', v.sku, varErr);
          }
        }
      }

      sharedStore.updateProduct(editingProduct.productId, {
        name: editProdName.trim(),
        categoryName: editProdCategory,
        brandName: editProdBrand,
        thumbnail: editProdThumbnail.trim(),
        gallery: finalGallery,
        warrantyPolicy: editProdDescription,
        status: editProdStatus,
        specGroups: editProdSpecGroups
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
    if (editSalePrice <= 0) {
      alert('Giá bán biến thể phải lớn hơn 0 đồng!');
      return;
    }

    const currentProd = products.find(p => p.productId === editingVariant.prodId);
    const finalImage = editVariantImage.trim() || editingVariant.variant.imageUrl || currentProd?.thumbnail || '';
    const finalColor = editVariantColor.trim() || editingVariant.variant.color;

    const listPrice = editListPrice > 0 ? editListPrice : editSalePrice;
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
            onClick={() => setShowAddModal(true)}
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
                              className="relative w-12 h-12 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden group cursor-pointer shadow-xs"
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

            <form onSubmit={handleCreateProduct} className="space-y-6">
              {/* 1. THÔNG TIN CƠ BẢN */}
              <div className="space-y-3 bg-surface-soft/40 p-4 rounded-xl border border-hairline-soft">
                <span className="font-bold text-ink-deep text-xs uppercase tracking-wider block">
                  1. Thông tin chung sản phẩm
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-medium text-charcoal mb-1">Tên sản phẩm / Model (*):</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: iPhone 16 Pro Max 5G..."
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none font-bold"
                    />
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
                          ramGb: hasRam ? (dv.ramGb || 8) : undefined,
                          romGb: hasRom ? (dv.romGb || 256) : undefined,
                          connectionType: hasConn ? (dv.connectionType || '5G') : undefined,
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
                      value={newWarranty}
                      onChange={(e) => setNewWarranty(e.target.value)}
                      className="w-full h-10 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs"
                    />
                  </div>
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
                            type="text"
                            required
                            placeholder="IP16PM-256-NAT"
                            value={v.sku}
                            onChange={(e) => handleUpdateDraftVariant(vIdx, 'sku', e.target.value)}
                            className="w-full h-8 px-2 bg-surface-soft border border-hairline-soft rounded font-mono uppercase text-xs focus:bg-canvas"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-steel block mb-0.5">Giá niêm yết (VNĐ):</label>
                          <input
                            type="number"
                            step={100000}
                            value={v.listPrice}
                            onChange={(e) => handleUpdateDraftVariant(vIdx, 'listPrice', Number(e.target.value))}
                            className="w-full h-8 px-2 bg-canvas border border-hairline-soft rounded text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-steel block mb-0.5">Giá bán (sale_price):</label>
                          <input
                            type="number"
                            step={100000}
                            value={v.salePrice}
                            onChange={(e) => handleUpdateDraftVariant(vIdx, 'salePrice', Number(e.target.value))}
                            className="w-full h-8 px-2 bg-canvas border border-hairline-soft rounded text-xs font-mono font-bold text-primary"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-steel block mb-0.5">Tồn kho ban đầu:</label>
                          <input
                            type="number"
                            min={0}
                            value={v.initialStock}
                            onChange={(e) => handleUpdateDraftVariant(vIdx, 'initialStock', Number(e.target.value))}
                            className="w-full h-8 px-2 bg-canvas border border-hairline-soft rounded text-xs font-mono font-bold text-success"
                          />
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

                  {editProdVariants.length > 0 && (
                    <div className="sm:col-span-3 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-2">
                      <AlertCircle size={15} className="shrink-0 text-amber-600" />
                      <span>
                        Sản phẩm đang có <strong>{editProdVariants.length} biến thể SKU</strong>. Để đảm bảo tính toàn vẹn của thuộc tính kỹ thuật, danh mục ngành hàng không được phép thay đổi.
                      </span>
                    </div>
                  )}

                  <div className="sm:col-span-3">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Mô tả sản phẩm & Chính sách bảo hành:</label>
                    <textarea
                      rows={2}
                      value={editProdDescription}
                      onChange={(e) => setEditProdDescription(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                      placeholder="Mô tả tóm tắt tính năng sản phẩm, cam kết chính hãng, thời hạn bảo hành..."
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
                      <label className="text-[11px] font-bold text-slate-700 block">Đường dẫn ảnh đại diện (Thumbnail):</label>
                      <input
                        type="url"
                        placeholder="Dán URL ảnh đại diện (https://...)..."
                        value={editProdThumbnail}
                        onChange={(e) => setEditProdThumbnail(e.target.value)}
                        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-blue-600 font-mono"
                      />

                      <div className="flex items-center gap-2 pt-1">
                        <label className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition">
                          <Upload size={13} className="text-blue-600" />
                          <span>Tải ảnh từ máy</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProductThumbnailUpload}
                            className="hidden"
                          />
                        </label>
                        <span className="text-[10px] text-slate-400 italic">Hỗ trợ PNG, JPG, WEBP</span>
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
                                min={0}
                                step={10000}
                                value={v.listPrice !== undefined && v.listPrice !== null ? v.listPrice : ''}
                                onChange={(e) => handleUpdateEditVariant(varIdx, { listPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                                className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-slate-700 focus:outline-none focus:border-blue-600"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-700 block mb-1">Giá bán hiện hành (VNĐ) *:</label>
                              <input
                                type="number"
                                min={0}
                                step={10000}
                                value={v.salePrice !== undefined && v.salePrice !== null ? v.salePrice : (v.listPrice ?? '')}
                                onChange={(e) => handleUpdateEditVariant(varIdx, { salePrice: e.target.value === '' ? '' : Number(e.target.value) })}
                                className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:border-blue-600"
                              />
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
      {adjustingVariant && (
        <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Package size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase">
                    Điều chỉnh tồn kho SKU
                  </h3>
                  <span className="text-[11px] font-mono text-indigo-600 font-bold">
                    {adjustingVariant.sku}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingVariant(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[11px] text-slate-500 block">Biến thể:</span>
                <strong className="text-slate-800 text-xs block">
                  {adjustingVariant.variantName || adjustingVariant.sku}
                </strong>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 block">Tồn kho hiện tại:</span>
                  <strong className="text-base font-mono text-slate-900">
                    {adjustingVariant.inventory?.onHandQty ?? adjustingVariant.onHandQty ?? 0}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Chênh lệch:</span>
                  {(() => {
                    const cur = adjustingVariant.inventory?.onHandQty ?? adjustingVariant.onHandQty ?? 0;
                    const diff = adjustActualCount - cur;
                    return (
                      <strong className={`text-base font-mono ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </strong>
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Số lượng tồn thực tế sau kiểm kê *:
                </label>
                <input
                  type="number"
                  min={0}
                  value={adjustActualCount}
                  onChange={(e) => setAdjustActualCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-sm focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Lý do điều chỉnh *:
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs font-medium focus:outline-none focus:border-blue-600 mb-2"
                >
                  <option value="Kiểm kê định kỳ cân đối số lượng">Kiểm kê định kỳ cân đối số lượng</option>
                  <option value="Hàng hỏng vỡ/lỗi linh kiện">Hàng hỏng vỡ/lỗi linh kiện</option>
                  <option value="Sai lệch trong quá trình nhập kho">Sai lệch trong quá trình nhập kho</option>
                  <option value="Trả hàng đối tác/nhà cung cấp">Trả hàng đối tác/nhà cung cấp</option>
                  <option value="Lý do khác">Lý do khác...</option>
                </select>
                {adjustReason === 'Lý do khác' && (
                  <input
                    type="text"
                    placeholder="Nhập lý do cụ thể..."
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                  />
                )}
              </div>
            </div>

            <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setAdjustingVariant(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSubmitStockAdjust}
                disabled={isSubmittingAdjust}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
              >
                {isSubmittingAdjust ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  <span>Xác nhận điều chỉnh</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
                    <input
                      type="url"
                      placeholder="Dán liên kết ảnh URL cho biến thể này..."
                      value={newVarDraftInEdit.imageUrl || ''}
                      onChange={(e) => setNewVarDraftInEdit(prev => ({ ...prev, imageUrl: e.target.value }))}
                      className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                    />

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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Giá niêm yết gốc (VNĐ) *:</label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={newVarDraftInEdit.listPrice}
                    onChange={(e) => setNewVarDraftInEdit({ ...newVarDraftInEdit, listPrice: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Giá bán hiện hành (VNĐ) *:</label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={newVarDraftInEdit.salePrice ?? newVarDraftInEdit.listPrice}
                    onChange={(e) => setNewVarDraftInEdit({ ...newVarDraftInEdit, salePrice: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Tồn kho ban đầu:</label>
                  <input
                    type="number"
                    min={0}
                    value={newVarDraftInEdit.initialStock}
                    onChange={(e) => setNewVarDraftInEdit({ ...newVarDraftInEdit, initialStock: Number(e.target.value) })}
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
                    <input
                      type="url"
                      placeholder="Dán URL ảnh cho biến thể này..."
                      value={editVariantImage}
                      onChange={(e) => setEditVariantImage(e.target.value)}
                      className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-blue-600 font-mono"
                    />

                    <div className="flex items-center gap-2">
                      <label className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-xs transition">
                        <Upload size={12} className="text-indigo-600" />
                        <span>Tải từ máy</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleVariantFileUpload}
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
                    <input
                      type="number"
                      step={50000}
                      min={0}
                      value={editSalePrice ? editSalePrice : ''}
                      onChange={(e) => setEditSalePrice(e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                      className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-extrabold font-mono focus:outline-none focus:border-blue-600 text-blue-700"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Giá niêm yết gốc (VNĐ):</label>
                    <input
                      type="number"
                      step={50000}
                      min={0}
                      value={editListPrice ? editListPrice : ''}
                      onChange={(e) => setEditListPrice(e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                      className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-600 text-xs font-bold font-mono focus:outline-none focus:border-blue-600"
                    />
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

    </div>
  );
};
