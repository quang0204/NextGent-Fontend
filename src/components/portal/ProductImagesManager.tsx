import React, { useState } from 'react';
import { Image, Plus, Trash2, ArrowUp, ArrowDown, Star, Upload, Loader2 } from 'lucide-react';
import { storageService, StorageFileResponse } from '../../services/storageService';

interface ProductImagesManagerProps {
  gallery: string[];
  thumbnail: string;
  onChangeGallery: (updatedGallery: string[]) => void;
  onChangeThumbnail: (primaryUrl: string) => void;
  onImageUploaded?: (uploaded: StorageFileResponse) => void;
}

export const ProductImagesManager: React.FC<ProductImagesManagerProps> = ({
  gallery,
  thumbnail,
  onChangeGallery,
  onChangeThumbnail,
  onImageUploaded
}) => {
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    const url = newImageUrl.trim();
    if (gallery.includes(url)) {
      alert('Ảnh này đã có trong danh mục ảnh sản phẩm!');
      return;
    }
    const updated = [...gallery, url];
    onChangeGallery(updated);
    if (!thumbnail) {
      onChangeThumbnail(url);
    }
    setNewImageUrl('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP, GIF)!');
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await storageService.uploadImageToMinio(file);
      onImageUploaded?.(uploaded);
      const updated = gallery.includes(uploaded.imageUrl)
        ? gallery
        : [...gallery, uploaded.imageUrl];
      onChangeGallery(updated);
      if (!thumbnail) {
        onChangeThumbnail(uploaded.imageUrl);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể tải ảnh lên MinIO.';
      alert(`Lỗi tải ảnh: ${msg}`);
    } finally {
      setIsUploading(false);
    }
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
            Thư viện ảnh sản phẩm (Product_Images)
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
          className="flex-1 h-9 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
        />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleAddImage}
            className="btn-marketing px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1"
          >
            <Plus size={14} />
            <span>Thêm URL</span>
          </button>

          <label
            className={`px-3.5 py-1.5 bg-canvas hover:bg-surface-soft border border-hairline rounded-lg text-ink font-semibold text-xs flex items-center gap-1.5 transition shadow-xs ${
              isUploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {isUploading ? (
              <Loader2 size={14} className="text-primary animate-spin" />
            ) : (
              <Upload size={14} className="text-primary" />
            )}
            <span>{isUploading ? 'Đang tải...' : 'Tải từ máy'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

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
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Error';
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
