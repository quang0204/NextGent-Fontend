import React, { useState, useEffect, useCallback } from 'react';
import { categoryService, CategoryItem, CategoryPayload } from '../../services/categoryService';
import { sharedStore } from '../../services/sharedStore';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { 
  FolderTree, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  ChevronRight, 
  X,
  AlertCircle,
  Package,
  Layers,
  Loader2,
  UploadCloud
} from 'lucide-react';

// Chuyển đổi tên tiếng Việt thành slug chuẩn SEO URL
function generateSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Hàm làm phẳng cây danh mục phục vụ hiển thị bảng có phân cấp
interface FlatCategoryItem extends CategoryItem {
  depth: number;
}

function flattenCategories(nodes: CategoryItem[], depth = 0): FlatCategoryItem[] {
  let result: FlatCategoryItem[] = [];
  for (const node of nodes) {
    result.push({ ...node, depth });
    if (node.children && node.children.length > 0) {
      result = result.concat(flattenCategories(node.children, depth + 1));
    }
  }
  return result;
}

export const PortalCategoriesView: React.FC = () => {
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const isAdmin = user?.role === 'ADMIN';

  // State danh mục
  const [categoryTree, setCategoryTree] = useState<CategoryItem[]>([]);
  const [flatCategories, setFlatCategories] = useState<FlatCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [iconUploadId, setIconUploadId] = useState<string | null>(null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Tải danh sách danh mục từ API 3.1
  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const res: any = await categoryService.getCategories(true);
      const rawData = Array.isArray(res)
        ? res
        : (Array.isArray(res?.data)
            ? res.data
            : (Array.isArray(res?.data?.data) ? res.data.data : null));

      if (rawData && rawData.length > 0) {
        setCategoryTree(rawData);
        const flatted = flattenCategories(rawData);
        setFlatCategories(flatted);
        // Đồng bộ vào sharedStore cho toàn bộ hệ thống
        sharedStore.setCategories(flatted.map((c, i) => ({
          categoryId: c.categoryId,
          parentId: c.parentId,
          name: c.name,
          description: c.description,
          isVisible: c.isVisible,
          sortOrder: i + 1,
          productCount: c.productCount,
        })));
      } else {
        // Fallback local store nếu API trả về mảng rỗng
        let localCats = sharedStore.getCategories();
        if (!localCats || localCats.length === 0) {
          sharedStore.resetToDefault();
          localCats = sharedStore.getCategories();
        }
        if (localCats.length > 0) {
          const mappedTree: CategoryItem[] = localCats
            .filter(c => c.parentId === null)
            .map(root => ({
              categoryId: root.categoryId,
              parentId: null,
              name: root.name,
              slug: generateSlug(root.name),
              description: root.description,
              iconUrl: '',
              isVisible: root.isVisible,
              productCount: root.productCount || 0,
              children: localCats
                .filter(sub => sub.parentId === root.categoryId)
                .map(sub => ({
                  categoryId: sub.categoryId,
                  parentId: root.categoryId,
                  parentName: root.name,
                  name: sub.name,
                  slug: generateSlug(sub.name),
                  description: sub.description,
                  iconUrl: '',
                  isVisible: sub.isVisible,
                  productCount: sub.productCount || 0,
                  children: []
                }))
            }));
          setCategoryTree(mappedTree);
          setFlatCategories(flattenCategories(mappedTree));
        }
      }
    } catch (err) {
      console.warn('API getCategories error, falling back to local store', err);
      // Fallback local store nếu không có mạng hoặc chưa bật BE
      let localCats = sharedStore.getCategories();
      if (!localCats || localCats.length === 0) {
        sharedStore.resetToDefault();
        localCats = sharedStore.getCategories();
      }
      const mappedTree: CategoryItem[] = localCats
        .filter(c => c.parentId === null)
        .map(root => ({
          categoryId: root.categoryId,
          parentId: null,
          name: root.name,
          slug: generateSlug(root.name),
          description: root.description,
          iconUrl: '',
          isVisible: root.isVisible,
          productCount: root.productCount || 0,
          children: localCats
            .filter(sub => sub.parentId === root.categoryId)
            .map(sub => ({
              categoryId: sub.categoryId,
              parentId: root.categoryId,
              parentName: root.name,
              name: sub.name,
              slug: generateSlug(sub.name),
              description: sub.description,
              iconUrl: '',
              isVisible: sub.isVisible,
              productCount: sub.productCount || 0,
              children: []
            }))
        }));
      setCategoryTree(mappedTree);
      setFlatCategories(flattenCategories(mappedTree));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Mở modal Thêm mới
  const handleOpenAddModal = (defaultParentId?: number | null) => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setParentId(defaultParentId !== undefined ? defaultParentId : null);
    setDescription('');
    setIconUrl('');
    setIconUploadId(null);
    setUploadError('');
    setIsVisible(true);
    setFormError('');
    setShowModal(true);
  };

  // Mở modal Chỉnh sửa
  const handleOpenEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug || generateSlug(cat.name));
    setParentId(cat.parentId || null);
    setDescription(cat.description || '');
    setIconUrl(cat.iconUrl || '');
    setIconUploadId(null);
    setUploadError('');
    setIsVisible(cat.isVisible !== false);
    setFormError('');
    setShowModal(true);
  };

  // Upload icon trực tiếp lên MinIO theo quy trình Presigned URL & Redis Session
  const handleIconFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Tệp chọn không phải là định dạng hình ảnh hợp lệ (JPG, PNG, WEBP, GIF, SVG)!', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Kích thước ảnh không được vượt quá 10MB!', 'error');
      return;
    }

    setIsUploadingIcon(true);
    setUploadError('');

    try {
      // Bước 1: Yêu cầu backend cấp Presigned URL
      const presignedRes = await categoryService.createPresignedUrls({
        storageType: 'CATEGORIES',
        categoryId: editingCategory?.categoryId,
        files: [{
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        }],
      });

      const item = presignedRes.data?.[0];
      if (!item) {
        throw new Error('Không thể khởi tạo liên kết tải ảnh lên MinIO');
      }

      // Bước 2: Tải binary trực tiếp từ trình duyệt lên MinIO bằng HTTP PUT
      await categoryService.uploadBinaryToMinio(item.uploadUrl, file);

      // Bước 3: Xác nhận tải lên hoàn tất và kiểm tra magic bytes
      const confirmRes = await categoryService.confirmUpload({
        uploadId: item.uploadId,
        objectKey: item.objectKey,
      });

      const confirmedData = confirmRes.data;
      setIconUrl(confirmedData.accessUrl || confirmedData.canonicalUrl || confirmedData.imageUrl || '');
      setIconUploadId(confirmedData.uploadId);

      showToast('Tải lên và xác thực icon danh mục qua MinIO thành công!', 'success');

      // Nếu là Cách A (cập nhật trực tiếp vào categoryId có sẵn), DB đã lưu thẳng -> refresh danh sách
      if (editingCategory) {
        await loadCategories();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi tải ảnh lên MinIO!';
      setUploadError(msg);
      showToast(msg, 'error');
    } finally {
      setIsUploadingIcon(false);
      e.target.value = '';
    }
  };

  // Xóa icon riêng của danh mục
  const handleRemoveIcon = async () => {
    if (editingCategory && editingCategory.iconUrl) {
      if (!window.confirm(`Bạn có chắc chắn muốn xóa icon của danh mục "${editingCategory.name}"?`)) {
        return;
      }
      try {
        await categoryService.deleteCategoryIcon(editingCategory.categoryId);
        showToast('Đã xóa icon danh mục thành công!', 'success');
        setIconUrl('');
        setIconUploadId(null);
        await loadCategories();
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Không thể xóa icon danh mục!';
        showToast(msg, 'error');
      }
    } else {
      setIconUrl('');
      setIconUploadId(null);
    }
  };

  // Tự động sinh slug khi nhập tên (nếu chưa sửa thủ công)
  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      setSlug(generateSlug(val));
    }
  };

  // Xử lý lưu danh mục (API 3.3 Create hoặc API 3.4 Update)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Vui lòng nhập tên danh mục!');
      return;
    }

    const payload: CategoryPayload = {
      parentId: parentId || null,
      name: name.trim(),
      slug: slug.trim() || generateSlug(name.trim()),
      description: description.trim(),
      iconUrl: iconUrl.trim(),
      iconUploadId: iconUploadId || undefined,
      isVisible: isVisible,
    };

    setIsSubmitting(true);
    setFormError('');

    try {
      if (editingCategory) {
        // API 3.4: PUT /api/v1/admin/categories/{id}
        const res = await categoryService.updateCategory(editingCategory.categoryId, payload);
        showToast(res.message || `Cập nhật danh mục "${name}" thành công!`, 'success');
      } else {
        // API 3.3: POST /api/v1/admin/categories
        const res = await categoryService.createCategory(payload);
        showToast(res.message || `Thêm danh mục mới "${name}" thành công!`, 'success');
      }

      setShowModal(false);
      await loadCategories();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Có lỗi xảy ra khi lưu danh mục!';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý bật/tắt hiển thị danh mục nhanh
  const handleToggleVisibility = async (cat: CategoryItem) => {
    const nextVisible = !cat.isVisible;
    try {
      await categoryService.updateCategory(cat.categoryId, {
        parentId: cat.parentId,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        iconUrl: cat.iconUrl,
        isVisible: nextVisible,
      });
      showToast(`Đã ${nextVisible ? 'hiển thị' : 'tạm ẩn'} danh mục "${cat.name}"!`, 'info');
      await loadCategories();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể thay đổi trạng thái danh mục!';
      showToast(msg, 'error');
    }
  };

  // Xử lý xóa danh mục (API 3.5: DELETE /api/v1/admin/categories/{id} - Chặn hoàn toàn nếu có sản phẩm hoặc danh mục con)
  const handleDeleteCategory = async (cat: CategoryItem) => {
    if (!isAdmin) {
      showToast('Chỉ tài khoản Quản trị viên (ADMIN) mới có quyền xóa danh mục!', 'error');
      return;
    }

    // 1. Chặn hoàn toàn hành vi xóa nếu đang có sản phẩm liên kết
    if ((cat.productCount || 0) > 0) {
      showToast(
        `HỆ THỐNG CHẶN HOÀN TOÀN: Không thể xóa danh mục "${cat.name}" vì đang có ${cat.productCount} sản phẩm liên kết! Vui lòng chuyển sản phẩm sang danh mục khác trước khi xóa.`,
        'error',
        6000
      );
      return;
    }

    // 2. Chặn hoàn toàn nếu đang có danh mục con
    if (cat.children && cat.children.length > 0) {
      showToast(
        `HỆ THỐNG CHẶN HOÀN TOÀN: Không thể xóa danh mục "${cat.name}" vì đang chứa ${cat.children.length} danh mục con trực thuộc! Vui lòng xóa hoặc di chuyển các nhánh con trước.`,
        'error',
        6000
      );
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn danh mục "${cat.name}"?`)) {
      return;
    }

    try {
      const res = await categoryService.deleteCategory(cat.categoryId);
      showToast(res.message || `Đã xóa danh mục "${cat.name}" thành công!`, 'success');
      await loadCategories();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Không thể xóa danh mục này!';
      showToast(msg, 'error', 6000);
    }
  };

  // Lọc danh sách theo từ khóa tìm kiếm
  const filtered = flatCategories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.slug && c.slug.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Thống kê nhanh
  const totalRoot = categoryTree.length;
  const totalSub = flatCategories.length - totalRoot;
  const totalHidden = flatCategories.filter(c => !c.isVisible).length;
  const totalProducts = categoryTree.reduce((acc, cur) => acc + (cur.productCount || 0), 0);

  // Lấy danh sách ID con cháu để chống chọn vòng lặp trong dropdown
  const getDescendantIds = (catId: number): number[] => {
    let ids: number[] = [catId];
    const findChildren = (nodes: CategoryItem[]) => {
      for (const node of nodes) {
        if (node.parentId === catId || ids.includes(node.parentId || 0)) {
          if (!ids.includes(node.categoryId)) ids.push(node.categoryId);
        }
        if (node.children) findChildren(node.children);
      }
    };
    findChildren(categoryTree);
    return ids;
  };

  const forbiddenParentIds = editingCategory ? getDescendantIds(editingCategory.categoryId) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Header & Metric Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FolderTree className="text-blue-600" size={22} />
            Quản trị Danh mục Sản phẩm
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Phân cấp cây cha/con, quản lý đường dẫn slug chuẩn SEO và số lượng sản phẩm liên kết
          </p>
        </div>

        <button 
          onClick={() => handleOpenAddModal(null)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition"
        >
          <Plus size={16} />
          Thêm danh mục mới
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Tổng danh mục</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{flatCategories.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Tất cả cấp trên hệ thống</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Danh mục cấp gốc</div>
          <div className="text-xl font-bold text-blue-700 mt-1">{totalRoot}</div>
          <div className="text-[10px] text-blue-500 mt-0.5">{totalSub} danh mục con cấp dưới</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Tổng sản phẩm</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{totalProducts}</div>
          <div className="text-[10px] text-emerald-500 mt-0.5">Tự động cộng dồn cây cha/con</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Danh mục đang ẩn</div>
          <div className="text-xl font-bold text-amber-700 mt-1">{totalHidden}</div>
          <div className="text-[10px] text-amber-500 mt-0.5">Khách vãng lai không nhìn thấy</div>
        </div>
      </div>

      {/* Toolbar Filter & Search */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Tìm theo tên danh mục, đường dẫn slug hoặc mô tả..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Hiển thị <span className="font-bold text-slate-700">{filtered.length}</span> danh mục
          </div>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-bold border-b border-slate-200/80 tracking-wider">
              <tr>
                <th className="py-3.5 px-4 whitespace-nowrap">Tên danh mục & Phân cấp</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Đường dẫn Slug</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Cấp cha trực thuộc</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Số sản phẩm</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Trạng thái</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="animate-spin text-blue-600" size={24} />
                      <span className="text-xs font-medium">Đang tải danh mục từ máy chủ...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Không tìm thấy danh mục nào phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map((cat) => {
                  const isRoot = cat.parentId === null;

                  return (
                    <tr key={cat.categoryId} className="hover:bg-slate-50/70 transition-colors">
                      {/* Tên danh mục & icon */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div 
                          className="flex items-center gap-2.5" 
                          style={{ paddingLeft: `${cat.depth * 28}px` }}
                        >
                          {!isRoot && (
                            <ChevronRight size={13} className="text-blue-500 flex-shrink-0" />
                          )}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isRoot ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {cat.iconUrl ? (
                              <img 
                                src={cat.iconUrl} 
                                alt="" 
                                className="w-4 h-4 object-contain"
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                            ) : (
                              <FolderTree size={14} />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{cat.name}</span>
                              {isRoot && (
                                <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200">
                                  Gốc
                                </span>
                              )}
                            </div>
                            {cat.description && (
                              <div className="text-[11px] text-slate-400 max-w-[280px] truncate" title={cat.description}>
                                {cat.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        /{cat.slug || generateSlug(cat.name)}
                      </td>

                      {/* Danh mục cha */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isRoot ? (
                          <span className="text-[11px] text-slate-400 italic">— (Cấp cao nhất)</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                            <Layers size={11} className="text-slate-400" />
                            {cat.parentName || 'Danh mục cha'}
                          </span>
                        )}
                      </td>

                      {/* Số sản phẩm */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono font-bold text-slate-800">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs">
                          <Package size={12} className="text-slate-400" />
                          {cat.productCount ?? 0}
                        </span>
                      </td>

                      {/* Trạng thái hiển thị */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleVisibility(cat)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                            cat.isVisible
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Nhấn để đổi trạng thái Ẩn / Hiển thị"
                        >
                          {cat.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                          <span>{cat.isVisible ? 'Hiển thị' : 'Đang ẩn'}</span>
                        </button>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isRoot && (
                            <button
                              onClick={() => handleOpenAddModal(cat.categoryId)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                              title="Thêm danh mục con cấp dưới"
                            >
                              <Plus size={12} />
                              <span>Thêm con</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenEditModal(cat)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg transition"
                            title="Sửa danh mục"
                          >
                            <Edit3 size={12} />
                            <span>Sửa</span>
                          </button>

                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            disabled={!isAdmin}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                              isAdmin 
                                ? 'text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                                : 'text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed opacity-60'
                            }`}
                            title={isAdmin ? "Xóa vĩnh viễn danh mục" : "Chỉ tài khoản ADMIN mới có quyền xóa"}
                          >
                            <Trash2 size={12} />
                            <span>Xóa</span>
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
      </div>

      {/* Modal Add / Edit Category */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form 
            onSubmit={handleSaveCategory} 
            className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FolderTree className="text-blue-600" size={18} />
                <span>{editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục sản phẩm'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên danh mục <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Điện thoại di động, iPhone, Samsung Galaxy..."
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full h-10 px-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Đường dẫn Slug (URL)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Tự động tạo từ tên nếu để trống</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">/</span>
                  <input
                    type="text"
                    placeholder="dien-thoai-di-dong"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full h-10 pl-6 pr-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Danh mục cấp cha
                </label>
                <select
                  value={parentId === null ? '' : parentId}
                  onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full h-10 px-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">— Cấp gốc (Danh mục cha cao nhất) —</option>
                  {categoryTree
                    .filter(c => !forbiddenParentIds.includes(c.categoryId))
                    .map(c => (
                      <option key={c.categoryId} value={c.categoryId}>
                        {c.name}
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Hệ thống tự động ngăn chặn vòng lặp cây khi chọn danh mục cha.
                </p>
              </div>

              {/* Icon Danh mục: Tải lên MinIO qua Presigned URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Icon danh mục (MinIO Object Storage)</span>
                  <span className="text-[10px] text-slate-400 font-normal">PNG, JPG, WEBP, SVG (tối đa 10MB)</span>
                </label>

                {/* Khung tải file */}
                <div className="mt-1 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 transition-colors bg-slate-50/50">
                  <div className="flex flex-col items-center justify-center text-center">
                    {isUploadingIcon ? (
                      <div className="py-3 flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin text-blue-600" size={26} />
                        <span className="text-xs text-blue-600 font-medium">Đang tải icon trực tiếp lên MinIO & xác thực...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                          <UploadCloud size={20} />
                        </div>
                        <label className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-700 inline-block mb-1">
                          <span>Nhấp để chọn icon tải lên</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                            onChange={handleIconFileSelect}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[11px] text-slate-400">hoặc kéo thả tệp hình ảnh/SVG vào đây</p>
                      </>
                    )}
                  </div>
                </div>

                {uploadError && (
                  <p className="text-rose-600 text-[11px] mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12} /> {uploadError}
                  </p>
                )}

                {/* Xem trước Icon & Tùy chọn Xóa */}
                {iconUrl && (
                  <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0">
                        <img
                          src={iconUrl}
                          alt="Icon Preview"
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800 truncate">Icon hiện tại</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[220px]" title={iconUrl}>
                          {iconUrl}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveIcon}
                      className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition flex items-center gap-1 font-medium"
                      title="Xóa icon này"
                    >
                      <Trash2 size={13} />
                      <span>Xóa icon</span>
                    </button>
                  </div>
                )}

                {/* Nhập URL thủ công (fallback) */}
                <details className="mt-2 text-[11px] text-slate-500">
                  <summary className="cursor-pointer hover:text-slate-700">Tùy chọn: Nhập liên kết URL bên ngoài</summary>
                  <input
                    type="url"
                    placeholder="https://cdn.nextgen.vn/categories/phone.svg"
                    value={iconUrl}
                    onChange={(e) => setIconUrl(e.target.value)}
                    className="w-full mt-1.5 h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  />
                </details>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả danh mục
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả tóm tắt nội dung danh mục phục vụ khách hàng và SEO..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={(e) => setIsVisible(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-800 text-xs">
                  Hiển thị trên website cho khách hàng xem
                </span>
              </label>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                <span>{editingCategory ? 'Lưu thay đổi' : 'Tạo danh mục'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
