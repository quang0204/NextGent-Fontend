import { Product, Brand } from '../types/product';
import { ProductReview } from '../types/review';
import { OrderDetail } from '../types/order';

export const BRANDS: Brand[] = [
  {
    brandId: 1,
    name: 'Apple',
    slug: 'apple',
    logoUrl: 'http://localhost:9000/brands/brands/1/446bbd63-6d10-4009-8f6a-b00b55e89fd4-Apple_logo_black.svg',
    description: 'Thương hiệu công nghệ hàng đầu thế giới với hệ sinh thái iPhone, iPad, Mac',
    isVisible: true,
  },
  {
    brandId: 2,
    name: 'Samsung',
    slug: 'samsung',
    logoUrl: 'http://localhost:9000/brands/brands/2/bbcd5610-2a04-4c41-ac54-53320f56c418-Samsung_old_logo_before_year_2015.svg.webp',
    description: 'Tập đoàn điện tử công nghệ đa quốc gia từ Hàn Quốc',
    isVisible: true,
  },
  {
    brandId: 3,
    name: 'Xiaomi',
    slug: 'xiaomi',
    logoUrl: 'http://localhost:9000/brands/brands/3/bcc64df8-125d-479c-9eea-75ec88e8189c-images.png',
    description: 'Hệ sinh thái thiết bị thông minh và flagship cấu hình cao giá tốt',
    isVisible: true,
  },
  {
    brandId: 4,
    name: 'Sony',
    slug: 'sony',
    logoUrl: 'http://localhost:9000/brands/brands/4/1a3dd88f-296b-437a-a454-bae91860c9d1-Sony_logo.svg',
    description: 'Âm thanh chuyên nghiệp đỉnh cao và thiết bị nhiếp ảnh hàng đầu',
    isVisible: true,
  },
  {
    brandId: 5,
    name: 'Asus',
    slug: 'asus',
    logoUrl: 'http://localhost:9000/brands/brands/5/33a9e35d-bf8d-4e8a-bb2c-c35e6488b179-ASUS_Corporate_Logo.svg.webp',
    description: 'Nhà sản xuất bo mạch chủ, laptop gaming ROG và linh kiện PC cao cấp',
    isVisible: true,
  },
  {
    brandId: 6,
    name: 'Anker',
    slug: 'anker',
    logoUrl: 'http://localhost:9000/brands/brands/6/db4362ee-74ba-48db-8496-e1f74d0c963c-Anker_logo.svg.webp',
    description: 'Thương hiệu phụ kiện sạc nhanh, pin dự phòng và audio số 1 toàn cầu',
    isVisible: true,
  },
  {
    brandId: 7,
    name: 'Marshall',
    slug: 'marshall',
    logoUrl: 'http://localhost:9000/brands/brands/7/974db7fb-bc24-4b43-9191-928d229edac6-Marshall_logo.svg.webp',
    description: 'Huyền thoại âm thanh vintage từ Anh Quốc với chất âm rock đặc trưng',
    isVisible: true,
  },
];
export const MOCK_PRODUCTS: Product[] = [];
export const MOCK_REVIEWS: ProductReview[] = [];
export const MOCK_ORDERS_DETAIL: OrderDetail[] = [];
export const MOCK_FAQS: Array<{ faqId: number; category: string; question: string; answer: string }> = [];
