import React, { useState } from 'react';
import { Image, Plus, Trash2, ArrowUp, ArrowDown, Star, Upload, Loader2, AlertCircle, UploadCloud } from 'lucide-react';
import { productService } from '../../services/productService';

interface ProductImagesManagerProps {
  gallery: string[];
  thumbnail: string;
  onChangeGallery: (updatedGallery: string[]) => void;
  onChangeThumbnail: (primaryUrl: string) => void;
  productId?: number;
}

export const ProductImagesManager: React.FC<ProductImagesManagerProps> = ({
  gallery,
  thumbnail,
  onChangeGallery,
  onChangeThumbnail,
  productId,
}) => {
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Upload file (File hoặc Blob) trực tiếp lên MinIO thông qua Presigned URL
  const uploadToMinio = async (file: File | Blob, rawFileName: string): Promise<string> => {
    const ext = rawFileName.split('.').pop() || 'png';
    const contentType = file.type || 'image/png';
    const fileName = rawFileName.includes('.') ? rawFileName : `image-${Date.now()}.${ext}`;

    const presignedRes = await productService.createPresignedUrls({
      storageType: 'PRODUCTS',
      productId: productId,
      files: [{
        fileName,
        contentType,
        fileSize: file.size,
      }],
    });

    const item = presignedRes.data?.[0];
    if (!item || !item.uploadUrl) {
      throw new Error('Không nhận được liên kết tải lên từ máy chủ MinIO!');
    }

    // Tải binary trực tiếp lên MinIO
    await productService.uploadBinaryToMinio(item.uploadUrl, file);

    // Xác nhận hoàn tất upload & kiểm tra magic bytes
    const confirmRes = await productService.confirmUpload({
      uploadId: item.uploadId,
      objectKey: item.objectKey,
      isPrimary: gallery.length === 0,
    });

    const finalUrl = confirmRes.data?.accessUrl || confirmRes.data?.imageUrl || confirmRes.data?.canonicalUrl;
    if (!finalUrl) {
      throw new Error('Máy chủ không trả về đường dẫn ảnh sau khi xác nhận!');
    }
    return finalUrl;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP, JPEG, SVG)!');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Kích thước ảnh tối đa cho phép là 10MB!');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const minioUrl = await uploadToMinio(file, file.name);
      const updated = [...gallery, minioUrl];
      onChangeGallery(updated);
      if (!thumbnail) {
        onChangeThumbnail(minioUrl);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Tải ảnh lên MinIO thất bại!';
      setUploadError(msg);
      alert(`LỖI TẢI ẢNH: ${msg}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleAddImage = async () => {
    const rawUrl = newImageUrl.trim();
    if (!rawUrl) return;

    if (rawUrl.toLowerCase().startsWith('data:')) {
      alert('Hệ thống không chấp nhận chuỗi base64 (data URI). Vui lòng dùng nút "Tải từ máy" để tải file ảnh lên MinIO!');
      return;
    }

    if (gallery.includes(rawUrl)) {
      alert('Ảnh này đã có trong danh mục ảnh sản phẩm!');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    // Thử fetch ảnh từ URL để đẩy trực tiếp vào MinIO
    try {
      const response = await fetch(rawUrl, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        if (blob.type.startsWith('image/')) {
          const fileName = rawUrl.split('/').pop()?.split('?')[0] || `url-image-${Date.now()}.png`;
          const minioUrl = await uploadToMinio(blob, fileName);
          const updated = [...gallery, minioUrl];
          onChangeGallery(updated);
          if (!thumbnail) {
            onChangeThumbnail(minioUrl);
          }
          setNewImageUrl('');
          return;
        }
      }
    } catch {
      // Nếu bị giới hạn bởi CORS của domain nguồn, fallback giữ nguyên URL nhưng lưu ý
      console.warn('Không thể fetch blob qua CORS từ domain nguồn, sử dụng URL gốc.');
    } finally {
      setIsUploading(false);
    }

    // Fallback: thêm trực tiếp URL nếu là liên kết ngoại lệ hợp lệ
    const updated = [...gallery, rawUrl];
    onChangeGallery(updated);
    if (!thumbnail) {
      onChangeThumbnail(rawUrl);
    }
    setNewImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    const removedUrl = gallery[index];
    const updated = gallery.filter((_, idx) => idx !== index);
    onChangeGallery(updated);
    if (thumbnail === removedUrl) {
      onChangeThumbnail(updated[0] || '');
    }
  };

  const handleSetPrimary = (url: string) => {
    onChangeThumbnail(url);
  };

  const handleMove = (index: number, direction: 'UP' | 'DOWN') => {
    const updated = [...gallery];
    if (direction === 'UP' && index > 0) {
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
    } else if (direction === 'DOWN' && index < updated.length - 1) {
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
    }
    onChangeGallery(updated);
  };

  return (
    <div className="space-y-4 border border-hairline-soft rounded-xl p-4 bg-surface-soft/30 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-hairline-soft">
        <div className="flex items-center gap-2">
          <Image size={16} className="text-primary" />
          <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider">
            Thư viện ảnh sản phẩm (MinIO Object Storage)
          </h4>
        </div>
        <span className="text-[11px] text-steel">Tổng: {gallery.length} ảnh</span>
      </div>

      {/* Add New Image Input */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          placeholder="Dán đường dẫn ảnh (URL) mới (VD: https://cdn...jpg)..."
          value={newImageUrl}
          onChange={(e) => setNewImageUrl(e.target.value)}
          disabled={isUploading}
          className="flex-1 h-9 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
        />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleAddImage}
            disabled={isUploading || !newImageUrl.trim()}
            className="btn-marketing px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            <span>Thêm URL</span>
          </button>

          <label className={`px-3.5 py-1.5 bg-canvas hover:bg-surface-soft border border-hairline rounded-lg text-ink font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs ${
            isUploading ? 'opacity-50 pointer-events-none' : ''
          }`}>
            {isUploading ? (
              <Loader2 size={14} className="animate-spin text-primary" />
            ) : (
              <UploadCloud size={14} className="text-primary" />
            )}
            <span>{isUploading ? 'Đang tải MinIO...' : 'Tải từ máy lên MinIO'}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {uploadError && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2 text-xs">
          <AlertCircle size={14} className="flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Images Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {gallery.map((url, idx) => {
          const isPrimary = url === thumbnail;

          return (
            <div
              key={idx}
              className={`relative bg-canvas border rounded-xl p-2 space-y-2 group transition-all ${
                isPrimary ? 'border-2 border-primary shadow-xs' : 'border-hairline-soft'
              }`}
            >
              <div className="h-28 w-full rounded-lg overflow-hidden bg-surface-soft flex items-center justify-center border border-hairline-soft/50">
                <img
                  src={url}
                  alt={`Sản phẩm ${idx + 1}`}
                  className="h-full w-full object-contain p-1"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/150x150/f1f4f7/5d6c7b?text=Image';
                  }}
                />
              </div>

              {/* Badges & Actions */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => handleSetPrimary(url)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition ${
                    isPrimary
                      ? 'bg-primary text-canvas'
                      : 'bg-surface-soft text-charcoal hover:bg-hairline-soft'
                  }`}
                  title={isPrimary ? 'Ảnh đại diện chính' : 'Đặt làm ảnh đại diện'}
                >
                  <Star size={10} className={isPrimary ? 'fill-canvas' : ''} />
                  <span>{isPrimary ? 'Ảnh chính' : 'Đặt làm chính'}</span>
                </button>

                <div className="flex items-center gap-1">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'UP')}
                      className="p-1 text-steel hover:text-ink rounded hover:bg-surface-soft"
                      title="Chuyển lên trước"
                    >
                      <ArrowUp size={12} />
                    </button>
                  )}
                  {idx < gallery.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'DOWN')}
                      className="p-1 text-steel hover:text-ink rounded hover:bg-surface-soft"
                      title="Chuyển xuống sau"
                    >
                      <ArrowDown size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="p-1 text-steel hover:text-critical rounded hover:bg-surface-soft"
                    title="Xóa ảnh"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
