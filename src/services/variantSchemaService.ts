import { VariantSchemaField, ProductVariant } from '../types/product';
import { apiClient } from './apiClient';

export const STANDARD_PHONE_VARIANT_SCHEMA: VariantSchemaField[] = [
  { key: 'color', label: 'Màu sắc', storage: 'COLUMN', type: 'text', required: true },
  { key: 'ramGb', label: 'RAM', storage: 'COLUMN', type: 'select', options: [4, 6, 8, 12, 16], unit: 'GB', required: true },
  { key: 'romGb', label: 'Bộ nhớ trong', storage: 'COLUMN', type: 'select', options: [64, 128, 256, 512, 1024], unit: 'GB', required: true },
  { key: 'edition', label: 'Phiên bản', storage: 'ATTRIBUTE', type: 'select', options: ['VN/A', 'Chính hãng', 'eSIM'], required: false }
];

export const STANDARD_TABLET_VARIANT_SCHEMA: VariantSchemaField[] = [
  { key: 'color', label: 'Màu sắc', storage: 'COLUMN', type: 'text', required: true },
  { key: 'ramGb', label: 'RAM', storage: 'COLUMN', type: 'select', options: [4, 6, 8, 12, 16], unit: 'GB', required: true },
  { key: 'romGb', label: 'Bộ nhớ trong', storage: 'COLUMN', type: 'select', options: [64, 128, 256, 512, 1024], unit: 'GB', required: true },
  { key: 'connectionType', label: 'Chuẩn kết nối', storage: 'COLUMN', type: 'select', options: ['Wifi Only', '5G + Wifi', 'LTE'], required: true },
  { key: 'edition', label: 'Phiên bản', storage: 'ATTRIBUTE', type: 'select', options: ['Chính hãng', 'eSIM'], required: false }
];

export const STANDARD_LAPTOP_VARIANT_SCHEMA: VariantSchemaField[] = [
  { key: 'color', label: 'Màu sắc', storage: 'COLUMN', type: 'text', required: true },
  { key: 'cpu', label: 'Vi xử lý (CPU)', storage: 'ATTRIBUTE', type: 'text', required: true },
  { key: 'ramGb', label: 'RAM', storage: 'COLUMN', type: 'select', options: [8, 16, 32, 64], unit: 'GB', required: true },
  { key: 'romGb', label: 'Ổ cứng SSD', storage: 'COLUMN', type: 'select', options: [256, 512, 1024, 2048], unit: 'GB', required: true },
  { key: 'gpu', label: 'Card đồ họa (GPU)', storage: 'ATTRIBUTE', type: 'text', required: false },
  { key: 'screen', label: 'Màn hình', storage: 'ATTRIBUTE', type: 'text', required: false }
];

export const STANDARD_ACCESSORY_VARIANT_SCHEMA: VariantSchemaField[] = [
  { key: 'color', label: 'Màu sắc', storage: 'COLUMN', type: 'text', required: true },
  { key: 'connectionType', label: 'Chuẩn kết nối', storage: 'COLUMN', type: 'select', options: ['USB-C', 'Lightning', 'USB-A', 'Bluetooth 5.3', '3.5mm', 'MagSafe', 'Wireless 2.4G'], required: true },
  { key: 'wattage', label: 'Công suất', storage: 'ATTRIBUTE', type: 'text', required: false },
  { key: 'cableLength', label: 'Độ dài dây', storage: 'ATTRIBUTE', type: 'text', required: false },
  { key: 'compatibleModel', label: 'Thiết bị tương thích', storage: 'ATTRIBUTE', type: 'text', required: false }
];

export const variantSchemaService = {
  getStandardSchemaByCategoryName(categoryName?: string): VariantSchemaField[] {
    if (!categoryName) return STANDARD_PHONE_VARIANT_SCHEMA;
    const cat = categoryName.toLowerCase();

    if (cat.includes('laptop') || cat.includes('macbook') || cat.includes('máy tính') || cat.includes('pc')) {
      return STANDARD_LAPTOP_VARIANT_SCHEMA;
    }
    if (cat.includes('phụ kiện') || cat.includes('tai nghe') || cat.includes('sạc') || cat.includes('cáp') || cat.includes('loa') || cat.includes('chuột') || cat.includes('bàn phím') || cat.includes('ốp')) {
      return STANDARD_ACCESSORY_VARIANT_SCHEMA;
    }
    if (cat.includes('tablet') || cat.includes('ipad') || cat.includes('bảng')) {
      return STANDARD_TABLET_VARIANT_SCHEMA;
    }
    return STANDARD_PHONE_VARIANT_SCHEMA;
  },

  async fetchCategoryVariantSchema(categoryId: number, categoryName?: string): Promise<VariantSchemaField[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: VariantSchemaField[] }>(`/categories/${categoryId}/variant-schema`);
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        return res.data.data;
      }
    } catch {
      // API backend offline or not seeded -> fallback to category name heuristics
    }
    return this.getStandardSchemaByCategoryName(categoryName);
  },

  buildVariantName(productName: string, variant: Partial<ProductVariant>, schema?: VariantSchemaField[]): string {
    const activeSchema = (schema && schema.length > 0) ? schema : this.getStandardSchemaByCategoryName();
    const parts: string[] = [];
    let colorPart: string | undefined = undefined;

    for (const field of activeSchema) {
      const key = field.key;
      let val: any = undefined;

      if (field.storage === 'COLUMN') {
        if (key === 'color') {
          colorPart = variant.color;
          continue;
        } else if (key === 'ramGb' && variant.ramGb && variant.ramGb > 0) {
          val = `${variant.ramGb}${field.unit || 'GB'}`;
        } else if (key === 'romGb' && variant.romGb && variant.romGb > 0) {
          val = variant.romGb >= 1024 ? '1TB' : `${variant.romGb}${field.unit || 'GB'}`;
        } else if (key === 'connectionType' && variant.connectionType) {
          val = variant.connectionType;
        }
      } else if (variant.attributes && variant.attributes[key]) {
        const raw = variant.attributes[key];
        if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
          val = `${String(raw).trim()}${field.unit || ''}`;
        }
      }

      if (val !== undefined && String(val).trim() !== '') {
        parts.push(String(val).trim());
      }
    }

    let result = parts.join(' / ');
    if (colorPart && colorPart.trim()) {
      if (result) {
        result += ` - ${colorPart.trim()}`;
      } else {
        result = colorPart.trim();
      }
    }

    return result || productName;
  }
};
