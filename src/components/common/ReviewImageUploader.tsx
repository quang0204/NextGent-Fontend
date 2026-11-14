import React, { useEffect, useRef } from 'react';
import { Camera, X, AlertCircle } from 'lucide-react';

/** Một ảnh đánh giá đã chọn: file gốc (để tải lên MinIO) + link xem trước. */
export interface ReviewImageFile {
  file: File;
  previewUrl: string;
}

export interface ReviewImageUploaderProps {
  images: ReviewImageFile[];
  onChange: (images: ReviewImageFile[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
  disabled?: boolean;
}

/** Khớp backend: ảnh đánh giá chỉ nhận JPEG, PNG, WEBP, GIF. */
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const ReviewImageUploader: React.FC<ReviewImageUploaderProps> = ({
  images,
  onChange,
  maxImages = 5,
  maxSizeMB = 5,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Giải phóng link xem trước khi ảnh bị gỡ khỏi danh sách (xóa ảnh / reset form).
  const previewUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    const current = images.map(img => img.previewUrl);
    previewUrlsRef.current
      .filter(url => !current.includes(url))
      .forEach(url => URL.revokeObjectURL(url));
    previewUrlsRef.current = current;
  }, [images]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      setErrorMsg(`Bạn chỉ có thể tải lên tối đa ${maxImages} hình ảnh.`);
      return;
    }

    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    const newImages: ReviewImageFile[] = [];

    selectedFiles.forEach((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setErrorMsg(`Tệp "${file.name}" không hợp lệ. Chỉ nhận ảnh JPG, PNG, WEBP, GIF.`);
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setErrorMsg(`Hình "${file.name}" vượt quá dung lượng cho phép (tối đa ${maxSizeMB}MB/ảnh).`);
        return;
      }
      newImages.push({ file, previewUrl: URL.createObjectURL(file) });
    });

    if (newImages.length > 0) {
      onChange([...images, ...newImages]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setErrorMsg(null);
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <label className="font-bold text-charcoal flex items-center gap-1.5">
          <Camera size={14} className="text-primary" />
          <span>Hình ảnh thực tế đính kèm:</span>
        </label>
        <span className="text-[11px] text-steel">
          ({images.length}/{maxImages} ảnh)
        </span>
      </div>

      {errorMsg && (
        <div className="p-2.5 bg-critical/10 border border-critical/30 rounded-lg text-critical text-[11px] flex items-center gap-1.5">
          <AlertCircle size={14} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        disabled={disabled || images.length >= maxImages}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Previews and Add Button */}
      <div className="flex flex-wrap gap-2.5 items-center">
        {images.map((img, idx) => (
          <div
            key={img.previewUrl}
            className="relative w-20 h-20 rounded-xl border border-hairline-soft overflow-hidden group shadow-xs bg-surface-soft"
          >
            <img
              src={img.previewUrl}
              alt={`Ảnh đánh giá ${idx + 1}`}
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                className="absolute top-1 right-1 w-5 h-5 bg-ink-deep/80 hover:bg-critical text-canvas rounded-full flex items-center justify-center transition opacity-90 group-hover:opacity-100 shadow-sm"
                title="Xóa ảnh này"
              >
                <X size={12} />
              </button>
            )}
            <div className="absolute bottom-0 inset-x-0 bg-ink-deep/60 text-canvas text-[9px] text-center py-0.5 font-mono">
              Ảnh {idx + 1}
            </div>
          </div>
        ))}

        {/* Upload Trigger Button */}
        {images.length < maxImages && !disabled && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-hairline hover:border-primary bg-surface-soft/60 hover:bg-surface-soft flex flex-col items-center justify-center gap-1 text-steel hover:text-primary transition-all group"
          >
            <div className="p-1 rounded-full bg-canvas border border-hairline-soft group-hover:scale-110 transition-transform">
              <Camera size={16} />
            </div>
            <span className="text-[10px] font-bold">Thêm ảnh</span>
          </button>
        )}
      </div>

      <p className="text-[10px] text-steel">
        * Tối đa {maxImages} ảnh chụp thật ngoại quan hoặc hóa đơn mở hộp máy (Định dạng JPG, PNG, WEBP, GIF, tối đa {maxSizeMB}MB/ảnh).
      </p>
    </div>
  );
};
