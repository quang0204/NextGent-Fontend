import { 
  PortalInventoryItem, 
  StockAdjustmentRecord, 
  StockMovementRecord, 
  PortalVoucher, 
  PortalUser, 
  PortalAuditLog, 
  PortalSupportTicket,
  PortalCategory,
  PortalBrandItem,
  PortalReturnRequest,
  PortalShipment,
  PortalFaqItem,
  PortalPromotion,
  PortalPromotionVariant
} from '../types/portal';

export const PORTAL_INVENTORY_ITEMS: PortalInventoryItem[] = [
  {
    variantId: 101,
    productId: 1,
    productName: 'iPhone 15 Pro Max',
    sku: 'IP15PM-256-NAT',
    color: 'Titan Tự Nhiên',
    romGb: 256,
    onHandQty: 15,
    reservedQty: 3,
    availableQty: 12,
    minThreshold: 5,
    status: 'IN_STOCK'
  },
  {
    variantId: 102,
    productId: 1,
    productName: 'iPhone 15 Pro Max',
    sku: 'IP15PM-256-BLU',
    color: 'Titan Xanh',
    romGb: 256,
    onHandQty: 10,
    reservedQty: 2,
    availableQty: 8,
    minThreshold: 4,
    status: 'IN_STOCK'
  },
  {
    variantId: 104,
    productId: 1,
    productName: 'iPhone 15 Pro Max',
    sku: 'IP15PM-512-NAT',
    color: 'Titan Tự Nhiên',
    romGb: 512,
    onHandQty: 5,
    reservedQty: 5,
    availableQty: 0,
    minThreshold: 3,
    status: 'OUT_OF_STOCK'
  },
  {
    variantId: 105,
    productId: 1,
    productName: 'iPhone 15 Pro Max',
    sku: 'IP15PM-1TB-NAT',
    color: 'Titan Tự Nhiên',
    romGb: 1024,
    onHandQty: 4,
    reservedQty: 1,
    availableQty: 3,
    minThreshold: 3,
    status: 'LOW_STOCK'
  },
  {
    variantId: 201,
    productId: 2,
    productName: 'Samsung Galaxy S24 Ultra',
    sku: 'SS-S24U-256-GRY',
    color: 'Xám Titan',
    romGb: 256,
    onHandQty: 18,
    reservedQty: 2,
    availableQty: 16,
    minThreshold: 5,
    status: 'IN_STOCK'
  },
  {
    variantId: 301,
    productId: 3,
    productName: 'Xiaomi 14 5G',
    sku: 'MI14-256-BLK',
    color: 'Đen Huyền Bí',
    romGb: 256,
    onHandQty: 10,
    reservedQty: 2,
    availableQty: 8,
    minThreshold: 4,
    status: 'IN_STOCK'
  },
  {
    variantId: 801,
    productId: 8,
    productName: 'Xiaomi Redmi Note 13',
    sku: 'RD-N13-128-BLK',
    color: 'Đen Bán Dạ',
    romGb: 128,
    onHandQty: 30,
    reservedQty: 4,
    availableQty: 26,
    minThreshold: 8,
    status: 'IN_STOCK'
  }
];

export const PORTAL_STOCK_ADJUSTMENTS: StockAdjustmentRecord[] = [
  {
    id: 1,
    formCode: 'PKK-20261020-001',
    sku: 'IP15PM-256-NAT',
    productName: 'iPhone 15 Pro Max (Titan Tự Nhiên 256GB)',
    qtySystem: 14,
    qtyActual: 15,
    qtyDiff: 1,
    reason: 'Kiểm kê đợt 3 phát hiện thừa 1 hộp do bưu tá hoàn về chưa quét mã',
    performedBy: 'Nguyễn Thanh Hùng (Thủ kho)',
    createdAt: '2026-10-20 16:30',
    status: 'APPROVED'
  },
  {
    id: 2,
    formCode: 'PKK-20261018-002',
    sku: 'SS-S24U-256-GRY',
    productName: 'Samsung Galaxy S24 Ultra (Xám 256GB)',
    qtySystem: 19,
    qtyActual: 18,
    qtyDiff: -1,
    reason: 'Rơi vỡ móp méo hộp trong kho, chuyển sang hàng thanh lý trưng bày',
    performedBy: 'Trần Duy Khôi (Nhân viên kho)',
    createdAt: '2026-10-18 09:15',
    status: 'APPROVED'
  }
];

export const PORTAL_STOCK_MOVEMENTS: StockMovementRecord[] = [
  {
    txnId: 101,
    formCode: 'PXK-009',
    sku: 'IP15PM-256-NAT',
    productName: 'iPhone 15 Pro Max',
    txnType: 'EXPORT',
    quantityChange: -1,
    qtyBefore: 16,
    qtyAfter: 15,
    reason: 'Xuất bán đơn hàng #DH20261015-087 bàn giao GHN',
    performedBy: 'Trần Duy Khôi',
    performedAt: '2026-10-23 12:00'
  },
  {
    txnId: 102,
    formCode: 'PNK-003',
    sku: 'IP15PM-256-BLU',
    productName: 'iPhone 15 Pro Max',
    txnType: 'RETURN',
    quantityChange: 1,
    qtyBefore: 9,
    qtyAfter: 10,
    reason: 'Khách từ chối nhận hàng do đổi ý, kiểm tra nguyên seal nhập lại kho bán',
    performedBy: 'Nguyễn Thanh Hùng',
    performedAt: '2026-10-22 17:15'
  },
  {
    txnId: 103,
    formCode: 'PKK-20261020-001',
    sku: 'IP15PM-256-NAT',
    productName: 'iPhone 15 Pro Max',
    txnType: 'ADJUST',
    quantityChange: 1,
    qtyBefore: 14,
    qtyAfter: 15,
    reason: 'Điều chỉnh cân bằng số liệu kiểm kê thực tế',
    performedBy: 'Nguyễn Thế Minh',
    performedAt: '2026-10-20 16:30'
  }
];

export const PORTAL_VOUCHERS: PortalVoucher[] = [
  {
    voucherId: 1,
    code: 'NEXTPICK200',
    discountType: 'FIXED',
    discountValue: 200000,
    minOrderValue: 5000000,
    usageLimit: 500,
    usedCount: 142,
    startAt: '2026-10-01',
    expiredAt: '2026-11-30',
    isActive: true
  },
  {
    voucherId: 2,
    code: 'FLAGSHIP500',
    discountType: 'FIXED',
    discountValue: 500000,
    minOrderValue: 20000000,
    usageLimit: 100,
    usedCount: 88,
    startAt: '2026-10-10',
    expiredAt: '2026-10-31',
    isActive: true
  },
  {
    voucherId: 3,
    code: 'WELCOME50K',
    discountType: 'FIXED',
    discountValue: 50000,
    minOrderValue: 500000,
    usageLimit: 1000,
    usedCount: 420,
    startAt: '2026-09-01',
    expiredAt: '2026-12-31',
    isActive: true
  }
];

export const PORTAL_USERS: PortalUser[] = [
  {
    userId: 1,
    fullName: 'Trần Thị Thu Huyền',
    email: 'thuhuyen.tran@gmail.com',
    phone: '0987654321',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-01-10',
    totalOrders: 5
  },
  {
    userId: 2,
    fullName: 'Nguyễn Thanh Hùng',
    email: 'hung.nguyen@nextpick.vn',
    phone: '0912345678',
    role: 'STAFF',
    status: 'ACTIVE',
    createdAt: '2026-02-01',
    totalOrders: 0
  },
  {
    userId: 3,
    fullName: 'Trần Duy Khôi',
    email: 'khoi.tran@nextpick.vn',
    phone: '0988111222',
    role: 'STAFF',
    status: 'ACTIVE',
    createdAt: '2026-02-15',
    totalOrders: 0
  },
  {
    userId: 4,
    fullName: 'Lê Thu Trang',
    email: 'trang.le@yahoo.com',
    phone: '0933999888',
    role: 'CUSTOMER',
    status: 'ACTIVE',
    createdAt: '2026-05-20',
    totalOrders: 3
  },
  {
    userId: 5,
    fullName: 'Nguyễn Văn Spam',
    email: 'spammer99@gmail.com',
    phone: '0999000111',
    role: 'CUSTOMER',
    status: 'LOCKED',
    lockReason: 'Spam tạo 20 đơn ảo không thanh toán chiếm dụng giữ chỗ kho (Câu 31 khảo sát)',
    createdAt: '2026-10-15',
    totalOrders: 0
  }
];

export const PORTAL_AUDIT_LOGS: PortalAuditLog[] = [
  {
    logId: 1001,
    performedBy: 'Trần Thị Thu Huyền (Admin)',
    action: 'LOCK_USER',
    entityName: 'Users',
    entityId: '5',
    oldValue: 'status: ACTIVE',
    newValue: 'status: LOCKED (Lý do: Spam tạo 20 đơn giữ chỗ kho)',
    createdAt: '2026-10-23 15:45'
  },
  {
    logId: 1002,
    performedBy: 'Nguyễn Thanh Hùng (Staff)',
    action: 'RESTOCK',
    entityName: 'Inventories',
    entityId: 'SKU: IP15PM-256-BLU',
    oldValue: 'onHandQty: 9, availableQty: 7',
    newValue: 'onHandQty: 10, availableQty: 8 (Hoàn kho)',
    createdAt: '2026-10-22 17:15'
  },
  {
    logId: 1003,
    performedBy: 'Trần Thị Thu Huyền (Admin)',
    action: 'UPDATE_PRICE_POLICY',
    entityName: 'Product_Variants',
    entityId: 'SKU: IP15PM-256-NAT',
    oldValue: 'listPrice: 35.990.000₫, salePrice: 30.490.000₫',
    newValue: 'listPrice: 34.990.000₫, salePrice: 29.490.000₫ (Flash Sale)',
    createdAt: '2026-10-21 08:00'
  },
  {
    logId: 1004,
    performedBy: 'Trần Duy Khôi (Staff)',
    action: 'TRANSITION_ORDER',
    entityName: 'Orders',
    entityId: '#DH20261015-087',
    oldValue: 'status: PREPARING',
    newValue: 'status: SHIPPING (Đã trừ kho vật lý & sinh phiếu xuất kho)',
    createdAt: '2026-10-23 12:00'
  }
];

export const PORTAL_TICKETS: PortalSupportTicket[] = [
  {
    ticketId: 1,
    customerName: 'Hoàng Văn Nam',
    phone: '0977222333',
    category: 'Bảo hành & Đổi trả ',
    content: 'Tôi mua iPhone 15 Pro Max được 10 ngày thì bị lỗi loa rè lúc đàm thoại. Muốn đổi máy mới 1-1 trong 30 ngày.',
    status: 'WAITING',
    createdAt: '2026-10-24 07:45'
  },
  {
    ticketId: 2,
    customerName: 'Đỗ Thùy Linh',
    phone: '0944555666',
    category: 'Tư vấn chọn mua máy',
    content: 'Em đang phân vân giữa Galaxy S24 Ultra và iPhone 15 Pro Max để quay vlog du lịch. Nhờ shop tư vấn ạ.',
    status: 'RESOLVED',
    reply: 'Dạ chào chị Linh, nếu chị ưu tiên màu sắc tự nhiên và hệ sinh thái iOS thì iPhone 15 Pro Max hỗ trợ quay Log/ProRes rất đỉnh. Còn nếu chị cần zoom xa và bút S-Pen ghi chú thì S24 Ultra là lựa chọn số 1 ạ!',
    handledBy: 'Nguyễn Thanh Hùng',
    createdAt: '2026-10-23 14:10',
    handledAt: '2026-10-23 14:35'
  }
];

export const PORTAL_CATEGORIES: PortalCategory[] = [
  {
    categoryId: 1,
    parentId: null,
    name: 'Điện thoại',
    description: 'Thiết bị di động thông minh, flagship và tầm trung',
    isVisible: true,
    sortOrder: 1,
    productCount: 10
  },
  {
    categoryId: 2,
    parentId: null,
    name: 'Máy tính bảng',
    description: 'Tablet, iPad phục vụ học tập, làm việc sáng tạo',
    isVisible: true,
    sortOrder: 2,
    productCount: 1
  },
  {
    categoryId: 3,
    parentId: null,
    name: 'Phụ kiện',
    description: 'Củ sạc nhanh, cáp sạc, ốp lưng, tai nghe chính hãng',
    isVisible: true,
    sortOrder: 3,
    productCount: 1
  },
  {
    categoryId: 4,
    parentId: 1,
    name: 'iPhone (iOS)',
    description: 'Dòng điện thoại cao cấp của Apple',
    isVisible: true,
    sortOrder: 1,
    productCount: 6
  },
  {
    categoryId: 5,
    parentId: 1,
    name: 'Android Flagship',
    description: 'Các mẫu smartphone Android cao cấp nhất',
    isVisible: true,
    sortOrder: 2,
    productCount: 4
  },
  {
    categoryId: 6,
    parentId: 2,
    name: 'Apple iPad',
    description: 'iPad Pro, iPad Air, iPad Gen',
    isVisible: true,
    sortOrder: 1,
    productCount: 1
  },
  {
    categoryId: 7,
    parentId: 3,
    name: 'Củ sạc & Cáp truyền dữ liệu',
    description: 'Phụ kiện nguồn sạc chuẩn PD/GaN',
    isVisible: true,
    sortOrder: 1,
    productCount: 1
  }
];

export const PORTAL_BRANDS: PortalBrandItem[] = [
  {
    brandId: 1,
    name: 'Apple',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
    description: 'Tập đoàn công nghệ hàng đầu thế giới với hệ sinh thái iPhone, iPad, Mac.',
    isVisible: true,
    productCount: 7
  },
  {
    brandId: 2,
    name: 'Samsung',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg',
    description: 'Dẫn đầu công nghệ màn hình Dynamic AMOLED 2X và trí tuệ nhân tạo Galaxy AI.',
    isVisible: true,
    productCount: 2
  },
  {
    brandId: 3,
    name: 'Xiaomi',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_%282021-%29.svg',
    description: 'Đột phá hiệu năng trên giá thành, hợp tác ống kính Leica chuyên nghiệp.',
    isVisible: true,
    productCount: 2
  },
  {
    brandId: 4,
    name: 'OPPO',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/OPPO_Logo.svg',
    description: 'Chuyên gia nhiếp ảnh chân dung với hệ thống camera Hasselblad đỉnh cao.',
    isVisible: true,
    productCount: 1
  },
  {
    brandId: 5,
    name: 'vivo',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png',
    description: 'Tiên phong cảm biến ZEISS và thiết kế siêu mỏng thời thượng.',
    isVisible: true,
    productCount: 0
  },
  {
    brandId: 6,
    name: 'Realme',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Realme_logo.svg',
    description: 'Dành riêng cho giới trẻ với sạc siêu nhanh và thiết kế phá cách.',
    isVisible: true,
    productCount: 0
  }
];

export const PORTAL_RETURN_REQUESTS: PortalReturnRequest[] = [
  {
    returnId: 1,
    orderId: 1001,
    orderCode: 'ORD2026102101',
    userId: 101,
    requestedBy: 'Trần Thị Thu Huyền',
    phone: '0987654321',
    reason: 'Sản phẩm bị lỗi ám màn hình góc trên bên phải khi hiển thị nền xám, yêu cầu đổi mới 1-1 theo chính sách 30 ngày.',
    status: 'PENDING',
    createdAt: '2026-10-27T08:00:00Z',
    items: [
      {
        productName: 'iPhone 15 Pro Max',
        sku: 'IP15PM-256-NAT',
        quantity: 1,
        unitPrice: 29490000
      }
    ]
  },
  {
    returnId: 2,
    orderId: 1002,
    orderCode: 'ORD2026102202',
    userId: 104,
    requestedBy: 'Lê Hoàng Nam',
    phone: '0933444555',
    reason: 'Máy bị trầy xước viền camera khi vừa bóc seal trước mặt shipper.',
    status: 'INSPECTING',
    inspectionResult: 'Kỹ thuật viên đã tiếp nhận máy, niêm phong tem niêm phong chờ biên bản giám định ngoại quan.',
    inspectedBy: 'Nguyễn Thanh Hùng (Staff)',
    inspectedAt: '2026-10-26T15:30:00Z',
    createdAt: '2026-10-26T11:20:00Z',
    items: [
      {
        productName: 'Samsung Galaxy S24 Ultra',
        sku: 'SS-S24U-256-XAM',
        quantity: 1,
        unitPrice: 27990000
      }
    ]
  },
  {
    returnId: 3,
    orderId: 1003,
    orderCode: 'ORD2026101903',
    userId: 105,
    requestedBy: 'Vũ Minh Trí',
    phone: '0911223344',
    reason: 'Khách hàng đặt nhầm màu Titan Đen thay vì Titan Trắng, máy nguyên seal chưa active.',
    status: 'APPROVED',
    inspectionResult: 'Máy nguyên vẹn seal hộp, đủ điều kiện nhập lại kho kinh doanh.',
    inspectedBy: 'Nguyễn Thế Minh (Admin)',
    inspectedAt: '2026-10-21T09:00:00Z',
    refundAmount: 29490000,
    createdAt: '2026-10-20T16:00:00Z',
    items: [
      {
        productName: 'iPhone 15 Pro Max',
        sku: 'IP15PM-256-BLK',
        quantity: 1,
        unitPrice: 29490000
      }
    ]
  }
];

export const PORTAL_SHIPMENTS: PortalShipment[] = [
  {
    shipmentId: 101,
    orderId: 4,
    orderCode: 'DH20261026-091',
    carrier: 'Giao Hàng Nhanh Express',
    trackingCode: 'GHN-99210291',
    status: 'WAITING_PICKUP',
    recipientName: 'Đặng Quốc Anh',
    recipientPhone: '0978112233',
    shippingAddress: 'Số 88, Đường Cầu Giấy, Quận Cầu Giấy, Hà Nội',
    codAmount: 0,
    updatedBy: 'Hệ thống tự động',
    updatedAt: '2026-10-26T09:15:00Z'
  },
  {
    shipmentId: 102,
    orderId: 2,
    orderCode: 'DH20261015-090',
    carrier: 'ViettelPost Hỏa Tốc',
    trackingCode: 'VTP-78192019',
    status: 'PICKED_UP',
    recipientName: 'Trần Duy Khôi',
    recipientPhone: '0912345678',
    shippingAddress: 'Số 9, Ngõ 181 Xuân Thủy, Cầu Giấy, Hà Nội',
    codAmount: 0,
    updatedBy: 'Nguyễn Thanh Hùng (Thủ kho)',
    updatedAt: '2026-10-23T14:55:00Z'
  },
  {
    shipmentId: 103,
    orderId: 3,
    orderCode: 'DH20261015-087',
    carrier: 'Giao Hàng Nhanh 2H (Mô phỏng)',
    trackingCode: 'GHN8829104',
    status: 'IN_TRANSIT',
    recipientName: 'Lê Thu Trang',
    recipientPhone: '0933999888',
    shippingAddress: 'Số 45, Đường Lê Duẩn, Quận 1, TP. Hồ Chí Minh',
    codAmount: 28490000,
    updatedBy: 'Điều phối viên GHN',
    updatedAt: '2026-10-23T12:00:00Z'
  },
  {
    shipmentId: 104,
    orderId: 5,
    orderCode: 'DH20261025-082',
    carrier: 'GHTK Tiết Kiệm',
    trackingCode: 'GHTK-33491820',
    status: 'DELIVERED',
    recipientName: 'Vũ Minh Trí',
    recipientPhone: '0911223344',
    shippingAddress: 'Số 45, Đường Lê Duẩn, Quận Hải Châu, Đà Nẵng',
    codAmount: 24490000,
    updatedBy: 'Bưu tá GHTK - Trần Văn Tài',
    updatedAt: '2026-10-25T11:45:00Z'
  },
  {
    shipmentId: 105,
    orderId: 6,
    orderCode: 'DH20261024-075',
    carrier: 'Giao Hàng Nhanh Express',
    trackingCode: 'GHN-11029384',
    status: 'DELIVERY_FAILED',
    failReason: 'Shipper đã liên hệ 3 lần trong 2 ngày nhưng số thuê bao không liên lạc được. Bưu kiện chuyển về kho lưu giữ.',
    recipientName: 'Phạm Quốc Bảo',
    recipientPhone: '0909090909',
    shippingAddress: 'Thôn 3, Xã Ea Kao, TP. Buôn Ma Thuột, Đắk Lắk',
    codAmount: 18490000,
    updatedBy: 'Điều phối viên GHN',
    updatedAt: '2026-10-25T17:00:00Z'
  },
  {
    shipmentId: 106,
    orderId: 7,
    orderCode: 'DH20261024-071',
    carrier: 'ViettelPost Hỏa Tốc',
    trackingCode: 'VTP-55219011',
    status: 'PICKUP_FAILED',
    failReason: 'Kho kiểm tra phát hiện vỏ hộp bị móp nhẹ ngoại quan, nhân viên hủy lệnh bàn giao bưu tá để đổi máy nguyên seal khác.',
    recipientName: 'Hoàng Kim Liên',
    recipientPhone: '0945678901',
    shippingAddress: 'Số 102, Phố Huế, Quận Hai Bà Trưng, Hà Nội',
    codAmount: 17990000,
    updatedBy: 'Nguyễn Thanh Hùng (Thủ kho)',
    updatedAt: '2026-10-24T15:30:00Z'
  }
];

export const PORTAL_FAQS: PortalFaqItem[] = [
  {
    faqId: 1,
    topic: 'Chính sách bảo hành & Đổi trả ',
    question: 'Chính sách bảo hành và đổi trả 1-1 tại NextGen Smart Tech được áp dụng như thế nào?',
    answer: 'NextGen Smart Tech cam kết 100% sản phẩm là hàng chính hãng. Trong vòng 30 ngày kể từ ngày mua, nếu sản phẩm phát sinh lỗi phần cứng do nhà sản xuất, khách hàng được đổi ngay 1 máy mới nguyên seal cùng model. Sau 30 ngày, sản phẩm được bảo hành chính hãng 12 tháng tại các trung tâm ủy quyền toàn quốc (Apple AASP, Samsung CS, Xiaomi...).',
    isVisible: true,
    sortOrder: 1
  },
  {
    faqId: 2,
    topic: 'Cơ chế Giữ chỗ tồn kho',
    question: 'Cơ chế Giữ chỗ tồn kho 30 phút hoạt động ra sao khi tôi đặt mua online?',
    answer: 'Khi bạn bấm đặt hàng với phương thức Chuyển khoản QR, hệ thống tự động khóa 1 suất tồn kho thực tế cho bạn và đếm ngược trong vòng 30 phút. Trong thời gian này, không khách hàng nào khác có thể mua tranh chiếc máy của bạn. Nếu sau 30 phút chưa thanh toán, hệ thống sẽ tự động hủy đơn và hoàn lại số lượng vào tồn kho bán lẻ để tránh chiếm dụng kho.',
    isVisible: true,
    sortOrder: 2
  },
  {
    faqId: 3,
    topic: 'Giao hàng & Kiểm hàng COD',
    question: 'Tôi ở tỉnh xa thì thời gian nhận hàng bao lâu và có được bóc máy kiểm tra không?',
    answer: 'Với khu vực nội thành Hà Nội & TP.HCM, NextGen Smart Tech giao hỏa tốc trong 2 giờ. Các tỉnh thành khác thời gian giao từ 1 - 3 ngày qua Viettel Post hoặc GHTK. Bạn hoàn toàn ĐƯỢC PHÉP kiểm tra niêm phong, ngoại quan hộp máy trước khi thanh toán tiền mặt cho shipper.',
    isVisible: true,
    sortOrder: 3
  },
  {
    faqId: 4,
    topic: 'Thanh toán & Trả góp 0%',
    question: 'NextGen Smart Tech hỗ trợ những hình thức thanh toán và trả góp nào?',
    answer: 'Chúng tôi hỗ trợ Thanh toán khi nhận hàng (COD), Chuyển khoản trực tiếp qua mã VietQR thông minh tự động nhận diện và Trả góp 0% lãi suất qua thẻ tín dụng của hơn 25 ngân hàng liên kết.',
    isVisible: true,
    sortOrder: 4
  }
];

// Bảng Promotions (Bảng 11) & Promotion_Variants (Bảng 12)
// Bảng Promotions (Bảng 11) & Promotion_Variants (Bảng 12)
export const PORTAL_PROMOTIONS: PortalPromotion[] = [
  {
    promotionId: 1,
    name: 'Tuần Lễ Flash Sale Flagship 2026',
    description: 'Ưu đãi sốc cho các dòng điện thoại cao cấp nhất Apple, Samsung, Xiaomi.',
    startAt: '2026-11-01T00:00:00Z',
    endAt: '2026-11-30T23:59:59Z',
    status: 'ACTIVE',
    createdBy: 'Nguyễn Thế Minh (Admin)',
    createdAt: '2026-10-25T09:30:00Z',
    variants: [
      {
        promoVariantId: 1,
        promotionId: 1,
        variantId: 1,
        productId: 1,
        productName: 'iPhone 16 Pro Max',
        sku: 'IP16PM-256-DESERT',
        color: 'Titan Sa Mạc',
        romGb: 256,
        listPrice: 34990000,
        promoPrice: 33990000
      },
      {
        promoVariantId: 2,
        promotionId: 1,
        variantId: 5,
        productId: 3,
        productName: 'Samsung Galaxy S24 Ultra',
        sku: 'S24U-256-GRAY',
        color: 'Xám Titan',
        romGb: 256,
        listPrice: 31990000,
        promoPrice: 29990000
      },
      {
        promoVariantId: 3,
        promotionId: 1,
        variantId: 9,
        productId: 7,
        productName: 'Tai nghe Sony WH-1000XM5',
        sku: 'SONY-XM5-BLACK',
        color: 'Đen Nhám',
        romGb: 0,
        listPrice: 8490000,
        promoPrice: 7990000
      },
      {
        promoVariantId: 4,
        promotionId: 1,
        variantId: 101,
        productId: 10,
        productName: 'iPhone 15 Pro Max',
        sku: 'IP15PM-256-TI',
        color: 'Titan Tự Nhiên',
        romGb: 256,
        listPrice: 29990000,
        promoPrice: 28990000
      }
    ]
  },
  {
    promotionId: 2,
    name: 'Sale',
    description: 'Ưu đãi phụ kiện chính hãng công nghệ đỉnh cao.',
    startAt: '2026-11-10T04:55:00Z',
    endAt: '2026-11-24T04:55:00Z',
    status: 'ACTIVE',
    createdBy: 'Admin',
    createdAt: '2026-11-10T11:56:08Z',
    variants: [
      {
        promoVariantId: 5,
        promotionId: 2,
        variantId: 11,
        productId: 9,
        productName: 'Củ sạc Anker GaNPrime 65W',
        sku: 'ANKER-GAN-65W-BLK',
        color: 'Đen Nhám',
        romGb: 0,
        listPrice: 1250000,
        promoPrice: 1130000
      }
    ]
  },
  {
    promotionId: 3,
    name: 'Sale',
    description: 'Chiến dịch Flash Sale thiết bị Apple & Audio.',
    startAt: '2026-11-10T04:55:00Z',
    endAt: '2026-11-24T04:55:00Z',
    status: 'ACTIVE',
    createdBy: 'Admin',
    createdAt: '2026-11-10T11:58:28Z',
    variants: [
      {
        promoVariantId: 6,
        promotionId: 3,
        variantId: 7,
        productId: 5,
        productName: 'iPad Air M2 11 inch',
        sku: 'IPADAIR-M2-128-GRAY',
        color: 'Xám Không Gian',
        romGb: 128,
        listPrice: 16990000,
        promoPrice: 15290000
      },
      {
        promoVariantId: 7,
        promotionId: 3,
        variantId: 8,
        productId: 6,
        productName: 'MacBook Pro 14 M3 Pro',
        sku: 'MBP14-M3P-512-BLACK',
        color: 'Đen Không Gian',
        romGb: 512,
        listPrice: 49990000,
        promoPrice: 44990000
      },
      {
        promoVariantId: 8,
        promotionId: 3,
        variantId: 9,
        productId: 7,
        productName: 'Tai nghe Sony WH-1000XM5',
        sku: 'SONY-XM5-BLACK',
        color: 'Đen Nhám',
        romGb: 0,
        listPrice: 8490000,
        promoPrice: 7640000
      },
      {
        promoVariantId: 9,
        promotionId: 3,
        variantId: 10,
        productId: 8,
        productName: 'Loa Marshall Emberton II',
        sku: 'MARSHALL-EMB2-BRASS',
        color: 'Black and Brass',
        romGb: 0,
        listPrice: 3590000,
        promoPrice: 3230000
      }
    ]
  }
];
