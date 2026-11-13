import React, { useState, useEffect, useCallback } from 'react';
import { brandService, BrandItem, BrandPayload } from '../../services/brandService';
import { sharedStore } from '../../services/sharedStore';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { 
  Award, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  X, 
  AlertCircle, 
  Package,
  Loader2,
  ExternalLink,
  UploadCloud,
  ImageIcon
} from 'lucide-react';

// Chuyển đổi tên sang slug
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

export const PortalBrandsView: React.FC = () => {
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const isAdmin = user?.role === 'ADMIN';

  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoUploadId, setLogoUploadId] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [description, setDescription] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Tải danh sách thương hiệu (API 3.6: GET /api/v1/brands?includeHidden=true)
  const loadBrands = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await brandService.getBrands(true);
      if (res.data && Array.isArray(res.data)) {
        setBrands(res.data);
      }
    } catch (err) {
      console.warn('API getBrands error, falling back to local store', err);
      const localBrands = sharedStore.getPortalBrands();
      setBrands(
        localBrands.map(b => ({
          brandId: b.brandId,
          name: b.name,
          slug: generateSlug(b.name),
          logoUrl: b.logoUrl,
          description: b.description,
          isVisible: b.isVisible,
          totalProducts: b.productCount || 0
        }))
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  const handleOpenAddModal = () => {
    setEditingBrand(null);
    setName('');
    setSlug('');
    setLogoUrl('');
    setLogoUploadId(null);
    setUploadError('');
    setDescription('');
    setIsVisible(true);
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (b: BrandItem) => {
    setEditingBrand(b);
    setName(b.name);
    setSlug(b.slug || generateSlug(b.name));
    setLogoUrl(b.logoUrl || '');
    setLogoUploadId(null);
    setUploadError('');
    setDescription(b.description || '');
    setIsVisible(b.isVisible !== false);
    setFormError('');
    setShowModal(true);
  };

  // Upload logo trực tiếp lên MinIO theo quy trình Presigned URL & Redis Session
  const handleLogoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploadingLogo(true);
    setUploadError('');

    try {
      // Bước 1: Yêu cầu backend cấp Presigned URL
      const presignedRes = await brandService.createPresignedUrls({
        storageType: 'BRANDS',
        brandId: editingBrand?.brandId,
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
      await brandService.uploadBinaryToMinio(item.uploadUrl, file);

      // Bước 3: Xác nhận tải lên hoàn tất và kiểm tra magic bytes
      const confirmRes = await brandService.confirmUpload({
        uploadId: item.uploadId,
        objectKey: item.objectKey,
      });

      const confirmedData = confirmRes.data;
      setLogoUrl(confirmedData.accessUrl || confirmedData.canonicalUrl);
      setLogoUploadId(confirmedData.uploadId);

      showToast('Tải lên và xác thực logo qua MinIO thành công!', 'success');

      // Nếu là Cách A (cập nhật trực tiếp vào brandId có sẵn), DB đã lưu thẳng -> refresh danh sách
      if (editingBrand) {
        await loadBrands();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi tải ảnh lên MinIO!';
      setUploadError(msg);
      showToast(msg, 'error');
    } finally {
      setIsUploadingLogo(false);
      e.target.value = '';
    }
  };

  // Xóa logo riêng của thương hiệu
  const handleRemoveLogo = async () => {
    if (editingBrand && editingBrand.logoUrl) {
      if (!window.confirm(`Bạn có chắc chắn muốn xóa logo của thương hiệu "${editingBrand.name}"?`)) {
        return;
      }
      try {
        await brandService.deleteBrandLogo(editingBrand.brandId);
        showToast('Đã xóa logo thương hiệu thành công!', 'success');
        setLogoUrl('');
        setLogoUploadId(null);
        await loadBrands();
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Không thể xóa logo thương hiệu!';
        showToast(msg, 'error');
      }
    } else {
      setLogoUrl('');
      setLogoUploadId(null);
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingBrand) {
      setSlug(generateSlug(val));
    }
  };

  // Lưu thương hiệu (API 3.8 POST /admin/brands hoặc API 3.9 PUT /admin/brands/{id})
  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Vui lòng nhập tên thương hiệu!');
      return;
    }

    const payload: BrandPayload = {
      name: name.trim(),
      slug: slug.trim() || generateSlug(name.trim()),
      logoUrl: logoUrl.trim(),
      logoUploadId: logoUploadId || undefined,
      description: description.trim(),
      isVisible: isVisible,
    };

    if (editingBrand && editingBrand.isVisible && !isVisible && (editingBrand.totalProducts || 0) > 0) {
      const confirmed = window.confirm(
        `CẢNH BÁO RÀNG BUỘC TOÀN VẸN:\nThương hiệu "${name}" hiện có ${editingBrand.totalProducts} sản phẩm đang liên kết!\n\nKhi chuyển sang trạng thái Ẩn, các sản phẩm thuộc hãng này sẽ bị ảnh hưởng hiển thị trên trang bán lẻ.\nBạn có chắc chắn muốn lưu thay đổi này?`
      );
      if (!confirmed) return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      if (editingBrand) {
        // API 3.9: PUT /api/v1/admin/brands/{id}
        const res = await brandService.updateBrand(editingBrand.brandId, payload);
        const isWarning = editingBrand.isVisible && !isVisible && (editingBrand.totalProducts || 0) > 0;
        showToast(res.message || `Cập nhật thương hiệu "${name}" thành công!`, isWarning ? 'warning' : 'success');
      } else {
        // API 3.8: POST /api/v1/admin/brands
        const res = await brandService.createBrand(payload);
        showToast(res.message || `Thêm mới thương hiệu "${name}" thành công!`, 'success');
      }

      setShowModal(false);
      await loadBrands();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Có lỗi xảy ra khi lưu thương hiệu!';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bật/tắt hiển thị nhanh (Có kiểm tra ràng buộc & cảnh báo khi ẩn thương hiệu đang có sản phẩm)
  const handleToggleVisibility = async (b: BrandItem) => {
    const nextVisible = !b.isVisible;
    if (!nextVisible && (b.totalProducts || 0) > 0) {
      const confirmed = window.confirm(
        `CẢNH BÁO RÀNG BUỘC TOÀN VẸN:\nThương hiệu "${b.name}" hiện đang có ${b.totalProducts} sản phẩm kinh doanh liên kết!\n\nKhi tạm ẩn thương hiệu, các sản phẩm thuộc hãng này sẽ bị ảnh hưởng hiển thị trên trang bán lẻ.\nBạn có chắc chắn muốn tạm ẩn thương hiệu này không?`
      );
      if (!confirmed) return;
    }

    try {
      const res = await brandService.updateBrand(b.brandId, {
        name: b.name,
        slug: b.slug,
        logoUrl: b.logoUrl,
        description: b.description,
        isVisible: nextVisible,
      });
      const isWarn = !nextVisible && (b.totalProducts || 0) > 0;
      const defaultMsg = isWarn
        ? `Cảnh báo: Đã tạm ẩn thương hiệu "${b.name}" (đang có ${b.totalProducts} sản phẩm liên kết)!`
        : `Đã ${nextVisible ? 'mở kinh doanh' : 'tạm ẩn'} thương hiệu "${b.name}"!`;
      showToast(res.message || defaultMsg, isWarn ? 'warning' : 'info');
      await loadBrands();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Không thể đổi trạng thái thương hiệu!';
      showToast(msg, 'error');
    }
  };

  // Xóa thương hiệu (API 3.10: DELETE /api/v1/admin/brands/{id} - Kiểm tra ràng buộc và cảnh báo khi có sản phẩm)
  const handleDeleteBrand = async (b: BrandItem) => {
    if (!isAdmin) {
      showToast('Chỉ tài khoản Quản trị viên (ADMIN) mới có quyền xóa thương hiệu đối tác!', 'error');
      return;
    }

    if ((b.totalProducts || 0) > 0) {
      showToast(
        `CẢNH BÁO RÀNG BUỘC: Không thể xóa thương hiệu "${b.name}" vì đang có ${b.totalProducts} sản phẩm liên kết trên hệ thống! Hãy đổi hãng cho các sản phẩm trước hoặc chọn ẩn thương hiệu thay vì xóa.`,
        'error',
        6000
      );
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn thương hiệu "${b.name}"?`)) {
      return;
    }

    try {
      const res = await brandService.deleteBrand(b.brandId);
      showToast(res.message || `Đã xóa thương hiệu "${b.name}" thành công!`, 'success');
      await loadBrands();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Không thể xóa thương hiệu này!';
      showToast(msg, 'error', 6000);
    }
  };

  // Lọc thương hiệu theo từ khóa
  const filtered = brands.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.slug && b.slug.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (b.description && b.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Thống kê nhanh
  const totalActive = brands.filter(b => b.isVisible).length;
  const totalHidden = brands.filter(b => !b.isVisible).length;
  const totalProducts = brands.reduce((acc, cur) => acc + (cur.totalProducts || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Header & Metric Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award className="text-blue-600" size={22} />
            Quản trị Thương hiệu Đối tác
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý nhà sản xuất chính hãng, logo nhận diện, đường dẫn SEO và số lượng sản phẩm trực thuộc
          </p>
        </div>

        <button 
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition"
        >
          <Plus size={16} />
          Thêm thương hiệu mới
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Tổng thương hiệu</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{brands.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Tất cả đối tác sản xuất</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Đang kinh doanh</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{totalActive}</div>
          <div className="text-[10px] text-emerald-500 mt-0.5">Hiển thị trong bộ lọc Storefront</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Tổng sản phẩm hãng</div>
          <div className="text-xl font-bold text-blue-700 mt-1">{totalProducts}</div>
          <div className="text-[10px] text-blue-500 mt-0.5">Sản phẩm gắn mã thương hiệu</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Tạm ẩn kinh doanh</div>
          <div className="text-xl font-bold text-amber-700 mt-1">{totalHidden}</div>
          <div className="text-[10px] text-amber-500 mt-0.5">Tạm dừng phân phối sản phẩm</div>
        </div>
      </div>

      {/* Toolbar Search */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Tìm theo tên thương hiệu, slug hoặc mô tả..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Hiển thị <span className="font-bold text-slate-700">{filtered.length}</span> thương hiệu
          </div>
        </div>
      </div>

      {/* Brands Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-bold border-b border-slate-200/80 tracking-wider">
              <tr>
                <th className="py-3.5 px-4 whitespace-nowrap">Logo & Thương hiệu</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Đường dẫn Slug</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Mô tả tóm tắt</th>
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
                      <span className="text-xs font-medium">Đang tải thương hiệu từ máy chủ...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Không tìm thấy thương hiệu nào phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.brandId} className="hover:bg-slate-50/70 transition-colors">
                    {/* Logo & Tên */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-2xs">
                          {b.logoUrl ? (
                            <img
                              src={b.logoUrl}
                              alt={b.name}
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="font-bold text-slate-500 text-xs">
                              {b.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm leading-tight">{b.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">Mã #{b.brandId}</div>
                        </div>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      /{b.slug || generateSlug(b.name)}
                    </td>

                    {/* Mô tả */}
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={b.description}>
                      {b.description || '—'}
                    </td>

                    {/* Số sản phẩm */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono font-bold text-slate-800">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs">
                        <Package size={12} className="text-slate-400" />
                        {b.totalProducts ?? 0}
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleToggleVisibility(b)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                          b.isVisible
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Nhấn để đổi trạng thái Kinh doanh / Tạm ẩn"
                      >
                        {b.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                        <span>{b.isVisible ? 'Kinh doanh' : 'Tạm ẩn'}</span>
                      </button>
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(b)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg transition"
                          title="Sửa thương hiệu"
                        >
                          <Edit3 size={12} />
                          <span>Sửa</span>
                        </button>

                        <button
                          onClick={() => handleDeleteBrand(b)}
                          disabled={!isAdmin}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                            isAdmin 
                              ? 'text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                              : 'text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed opacity-60'
                          }`}
                          title={isAdmin ? "Xóa vĩnh viễn thương hiệu" : "Chỉ tài khoản ADMIN mới có quyền xóa"}
                        >
                          <Trash2 size={12} />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Brand */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form 
            onSubmit={handleSaveBrand} 
            className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Award className="text-blue-600" size={18} />
                <span>{editingBrand ? 'Chỉnh sửa thương hiệu' : 'Thêm thương hiệu mới'}</span>
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
                  Tên thương hiệu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Apple, Samsung, Xiaomi, Garmin..."
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
                    placeholder="apple"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full h-10 pl-6 pr-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Logo Thương hiệu: Tải lên MinIO qua Presigned URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Logo thương hiệu (MinIO Object Storage)</span>
                  <span className="text-[10px] text-slate-400 font-normal">PNG, JPG, WEBP, SVG (tối đa 10MB)</span>
                </label>

                {/* Khung tải file */}
                <div className="mt-1 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 transition-colors bg-slate-50/50">
                  <div className="flex flex-col items-center justify-center text-center">
                    {isUploadingLogo ? (
                      <div className="py-3 flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin text-blue-600" size={26} />
                        <span className="text-xs text-blue-600 font-medium">Đang tải ảnh trực tiếp lên MinIO & xác thực...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                          <UploadCloud size={20} />
                        </div>
                        <label className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-700 inline-block mb-1">
                          <span>Nhấp để chọn tệp tải lên</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                            onChange={handleLogoFileSelect}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[11px] text-slate-400">hoặc kéo thả tệp hình ảnh vào đây</p>
                      </>
                    )}
                  </div>
                </div>

                {uploadError && (
                  <p className="text-rose-600 text-[11px] mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12} /> {uploadError}
                  </p>
                )}

                {/* Xem trước Logo & Tùy chọn Xóa */}
                {logoUrl && (
                  <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0">
                        <img
                          src={logoUrl}
                          alt="Logo Preview"
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800 truncate">Logo hiện tại</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[220px]" title={logoUrl}>
                          {logoUrl}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition flex items-center gap-1 font-medium"
                      title="Xóa logo này"
                    >
                      <Trash2 size={13} />
                      <span>Xóa logo</span>
                    </button>
                  </div>
                )}

                {/* Nhập URL thủ công (fallback) */}
                <details className="mt-2 text-[11px] text-slate-500">
                  <summary className="cursor-pointer hover:text-slate-700">Tùy chọn: Nhập liên kết URL bên ngoài</summary>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full mt-1.5 h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-[11px] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </details>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả thương hiệu
                </label>
                <textarea
                  rows={3}
                  placeholder="Giới thiệu xuất xứ, thế mạnh công nghệ và sản phẩm nổi bật..."
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
                  Hiển thị trong bộ lọc & catalog khách hàng
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
                <span>{editingBrand ? 'Lưu thay đổi' : 'Tạo thương hiệu'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
