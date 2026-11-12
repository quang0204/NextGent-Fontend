export interface VariantSchemaField {
  key: string;
  label: string;
  storage: 'COLUMN' | 'ATTRIBUTE';
  type: 'text' | 'number' | 'select';
  required: boolean;
  options?: (string | number)[];
  unit?: string;
}

export interface ProductVariant {
  variantId: number;
  productId: number;
  sku: string;                    // Mã SKU biến thể độc lập
  variantName?: string;
  color: string;                  // Tên màu (Titan Tự Nhiên, Đen, Xanh...)
  colorHex?: string;              // Mã màu hiển thị dot swatch
  ramGb?: number;                 // RAM (8, 12, 16...) - Không bắt buộc với phụ kiện
  romGb?: number;                 // ROM (128, 256, 512, 1024...) - Không bắt buộc với phụ kiện
  connectionType?: string;        // 5G, LTE, Wifi
  attributes?: Record<string, any>; // Thuộc tính động dạng JSON (CPU, GPU, wattage, cableLength...)
  listPrice: number;              // Giá niêm yết
  salePrice: number;              // Giá bán hiện hành (hoặc sau Flash sale)
  price?: number;                 // Tương thích backend entity price
  compareAtPrice?: number;        // Tương thích backend entity compareAtPrice
  onHandQty: number;              // Tồn thực tế vật lý
  reservedQty: number;            // Tồn đang giữ chỗ
  availableQty: number;           // Tồn khả dụng = onHandQty - reservedQty
  imageUrl: string;               // Ảnh của đúng màu sắc biến thể
  isActive?: boolean;             // Trạng thái kinh doanh biến thể
  minThreshold?: number;          // Ngưỡng cảnh báo tồn kho thấp
  hasTransactions?: boolean;      // Đã có phát sinh giao dịch đơn hàng hoặc kho
}

export interface ProductSpecItem {
  specId?: number;
  name: string;
  value: string;
  sortOrder?: number;
}

export interface ProductSpecGroup {
  groupName: string;              // Ví dụ: "Màn hình", "Camera sau", "Cấu hình & Bộ nhớ", "Pin & Sạc"
  items: ProductSpecItem[];
}

export interface Product {
  productId: number;
  name: string;
  brandName: string;
  categoryName: string;
  categoryId?: number;
  brandId?: number;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE' | string;
  isInstallment0: boolean;        // Hỗ trợ Trả góp 0%
  warrantyPolicy: string;         // Chính sách bảo hành
  thumbnail: string;
  gallery: string[];
  variants: ProductVariant[];
  rating: number;
  reviewCount: number;
  specGroups: ProductSpecGroup[];
  highlights: string[];           // Các đặc điểm nổi bật tóm tắt
  giftDescription?: string;       // Quà tặng đi kèm nếu có
  isFlashSale?: boolean;
  soldCount?: number;             // Số lượng đã bán
  variantSchema?: VariantSchemaField[];
}

export interface Category {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  iconUrl?: string;
  count?: number;
  isVisible?: boolean;
  variantSchema?: VariantSchemaField[];
  effectiveVariantSchema?: VariantSchemaField[];
}

export interface Brand {
  brandId: number;
  name: string;
  logoUrl?: string;
  slug: string;
  description?: string;
  isVisible?: boolean;
}

export interface AdminProductDetailResponse {
  productId: number;
  name: string;
  categoryId: number;
  categoryName: string;
  brandId: number;
  brandName: string;
  description: string;
  warrantyPolicy: string;
  status: string;
  effectiveVariantSchema?: VariantSchemaField[];
  images: {
    imageId: number;
    imageUrl: string;
    objectKey?: string;
    bucket?: string;
    isPrimary: boolean;
    sortOrder: number;
  }[];
  specs: {
    specId: number;
    groupName: string;
    specName: string;
    specValue: string;
    sortOrder: number;
  }[];
  variants: {
    variantId: number;
    sku: string;
    variantName?: string;
    color: string;
    ramGb?: number;
    romGb?: number;
    connectionType?: string;
    attributes?: Record<string, any>;
    listPrice: number;
    salePrice?: number;
    compareAtPrice?: number;
    price?: number;
    isActive: boolean;
    hasTransactions?: boolean;
    inventory?: {
      inventoryId: number;
      onHandQty: number;
      reservedQty: number;
      availableQty: number;
      minThreshold: number;
    };
  }[];
}
