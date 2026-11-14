export interface SmartSearchParsed {
  rawQuery: string;
  category?: 'phone' | 'laptop' | 'tablet' | 'accessory';
  minPrice?: number;
  maxPrice?: number;
  isCheapIntent?: boolean;
  isPremiumIntent?: boolean;
  isFlashSale?: boolean;
  isInstallment0?: boolean;
  ram?: number;
  rom?: number;
  cpu?: string;
  connectionType?: string;
  requirement?: string;
  suggestedSort?: 'price_asc' | 'price_desc' | 'best_seller' | 'discount_desc' | 'newest';
  coreTokens: string[];
  intentTags: string[];
}

export const stripVietnameseAccents = (str: string): string =>
  (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

export const parseSmartSearchQuery = (rawSearch?: string): SmartSearchParsed => {
  const rawQuery = (rawSearch || '').trim();
  if (!rawQuery) {
    return { rawQuery: '', coreTokens: [], intentTags: [] };
  }

  let working = rawQuery.toLowerCase();
  const intentTags: string[] = [];
  let category: SmartSearchParsed['category'];
  let minPrice: number | undefined;
  let maxPrice: number | undefined;
  let isCheapIntent = false;
  let isPremiumIntent = false;
  let isFlashSale: boolean | undefined;
  let isInstallment0: boolean | undefined;
  let ram: number | undefined;
  let rom: number | undefined;
  let cpu: string | undefined;
  let connectionType: string | undefined;
  let requirement: string | undefined;
  let suggestedSort: SmartSearchParsed['suggestedSort'];

  const asciiAll = stripVietnameseAccents(working);

  if (/\b(dien thoai|smartphone|phone|de yeu)\b/.test(asciiAll)) {
    category = 'phone';
    intentTags.push('Ngành: Điện thoại');
    working = working.replace(/(điện thoại di động|điện thoại thông minh|điện thoại|dien thoai di dong|dien thoai thong minh|dien thoai|smartphone|\bphone\b|dế yêu|de yeu)/gi, ' ');
  } else if (/\b(may tinh bang|tablet)\b/.test(asciiAll)) {
    category = 'tablet';
    intentTags.push('Ngành: Máy tính bảng');
    working = working.replace(/(máy tính bảng|may tinh bang|tablet)/gi, ' ');
  } else if (/\b(laptop|may tinh xach tay|notebook|macbook)\b/.test(asciiAll)) {
    category = 'laptop';
    intentTags.push('Ngành: Laptop');
    working = working.replace(/(máy tính xách tay|may tinh xach tay|laptop|notebook)/gi, ' ');
  } else if (/\b(phu kien|am thanh|tai nghe|earbuds|airpods|cu sac|sac du phong|pin du phong|cap sac|day sac|loa|op lung|bao da|chuot|ban phim)\b/.test(asciiAll)) {
    category = 'accessory';
    intentTags.push('Ngành: Phụ kiện');
    working = working.replace(/(phụ kiện di động|phụ kiện âm thanh|phụ kiện|phu kien di dong|phu kien am thanh|phu kien)/gi, ' ');
  }

  let asciiWorking = stripVietnameseAccents(working);
  const rangeMatch = asciiWorking.match(/(?:tu\s*)?(\d+(?:[.,]\d+)?)\s*(?:trieu|tr|cu)?\s*(?:den|-|toi)\s*(\d+(?:[.,]\d+)?)\s*(trieu|tr|cu)/);
  if (rangeMatch) {
    minPrice = parseFloat(rangeMatch[1].replace(',', '.')) * 1_000_000;
    maxPrice = parseFloat(rangeMatch[2].replace(',', '.')) * 1_000_000;
    intentTags.push(`Giá: ${rangeMatch[1]} - ${rangeMatch[2]} triệu`);
    working = working.replace(/(từ|tu)?\s*\d+([.,]\d+)?\s*(triệu|trieu|tr|củ|cu)?\s*(đến|den|-|tới|toi)\s*\d+([.,]\d+)?\s*(triệu|trieu|tr|củ|cu)/gi, ' ');
  } else {
    const underMatch = asciiWorking.match(/(?:duoi|nho hon|<=|<)\s*(\d+(?:[.,]\d+)?)\s*(trieu|tr|cu|k|nghin|ngan)/);
    if (underMatch) {
      const val = parseFloat(underMatch[1].replace(',', '.'));
      const unit = underMatch[2];
      const mult = unit.startsWith('k') || unit.startsWith('ngh') || unit.startsWith('nga') ? 1_000 : 1_000_000;
      maxPrice = val * mult;
      intentTags.push(`Giá dưới ${val}${mult === 1_000 ? 'k' : ' triệu'}`);
      working = working.replace(/(dưới|duoi|nhỏ hơn|nho hon|<=|<)\s*\d+([.,]\d+)?\s*(triệu|trieu|tr|củ|cu|k|nghìn|nghin|ngàn|ngan)/gi, ' ');
    }
    const overMatch = asciiWorking.match(/(?:tren|lon hon|>=|>|tu)\s*(\d+(?:[.,]\d+)?)\s*(trieu|tr|cu)/);
    if (overMatch) {
      const val = parseFloat(overMatch[1].replace(',', '.'));
      minPrice = val * 1_000_000;
      intentTags.push(`Giá trên ${val} triệu`);
      working = working.replace(/(trên|tren|lớn hơn|lon hon|>=|>|từ|tu)\s*\d+([.,]\d+)?\s*(triệu|trieu|tr|củ|cu)/gi, ' ');
    }
    const aroundMatch = asciiWorking.match(/(?:tam|khoang|quanh)\s*(\d+(?:[.,]\d+)?)\s*(trieu|tr|cu)/);
    if (aroundMatch) {
      const val = parseFloat(aroundMatch[1].replace(',', '.'));
      minPrice = Math.max(0, val - 3) * 1_000_000;
      maxPrice = (val + 3) * 1_000_000;
      intentTags.push(`Giá tầm ${val} triệu`);
      working = working.replace(/(tầm|tam|khoảng|khoang|quanh)\s*\d+([.,]\d+)?\s*(triệu|trieu|tr|củ|cu)/gi, ' ');
    }
  }

  asciiWorking = stripVietnameseAccents(working);
  if (/\b(gia re|re nhat|binh dan|tiet kiem|gia tot|gia thap|sinh vien|re)\b/.test(asciiWorking)) {
    isCheapIntent = true;
    suggestedSort = 'price_asc';
    intentTags.push('Phân khúc: Giá rẻ (Ưu tiên giá thấp)');
    working = working.replace(/(giá rẻ nhất|giá rẻ|rẻ nhất|bình dân|tiết kiệm|giá tốt|giá thấp|sinh viên|gia re nhat|gia re|re nhat|binh dan|tiet kiem|gia tot|gia thap|sinh vien|\brẻ\b|\bre\b)/gi, ' ');
  } else if (/\b(cao cap|flagship|dat nhat|gia cao|sang trong|hang sang)\b/.test(asciiWorking)) {
    isPremiumIntent = true;
    suggestedSort = 'price_desc';
    intentTags.push('Phân khúc: Cao cấp (Ưu tiên giá cao)');
    working = working.replace(/(cao cấp|cao cap|flagship|đắt nhất|dat nhat|giá cao|gia cao|sang trọng|sang trong|hạng sang|hang sang)/gi, ' ');
  }

  if (/\b(ban chay|hot|pho bien)\b/.test(asciiWorking)) {
    if (!suggestedSort) suggestedSort = 'best_seller';
    intentTags.push('Bán chạy');
    working = working.replace(/(bán chạy nhất|bán chạy|ban chay nhat|ban chay|\bhot\b|phổ biến|pho bien)/gi, ' ');
  }

  if (/\b(giam gia|khuyen mai|flash sale|sale|uu dai)\b/.test(asciiWorking)) {
    isFlashSale = true;
    if (!suggestedSort) suggestedSort = 'discount_desc';
    intentTags.push('Đang giảm giá / Flash Sale');
    working = working.replace(/(giảm giá sốc|giảm giá|giam gia|khuyến mãi|khuyen mai|flash sale|\bsale\b|ưu đãi|uu dai)/gi, ' ');
  }

  if (/\b(tra gop)\b/.test(asciiWorking)) {
    isInstallment0 = true;
    intentTags.push('Trả góp 0%');
    working = working.replace(/(trả góp 0%|trả góp|tra gop 0%|tra gop)/gi, ' ');
  }

  asciiWorking = stripVietnameseAccents(working);
  const ramMatch = asciiWorking.match(/\bram\s*(\d{1,2})\s*(?:gb|g)?\b/);
  if (ramMatch) {
    ram = parseInt(ramMatch[1], 10);
    intentTags.push(`RAM ${ram}GB`);
    working = working.replace(/\bram\s*\d{1,2}\s*(?:gb|g)?\b/gi, ' ');
  }

  asciiWorking = stripVietnameseAccents(working);
  const romMatch = asciiWorking.match(/\b(?:rom|ssd|bo nho)?\s*(64|128|256|512|1024)\s*(?:gb|g)\b|\b(1)\s*tb\b/);
  if (romMatch) {
    rom = romMatch[1] ? parseInt(romMatch[1], 10) : 1024;
    intentTags.push(`Bộ nhớ ${rom >= 1024 ? '1TB' : `${rom}GB`}`);
    working = working.replace(/\b(?:rom|ssd|bộ nhớ|bo nho)?\s*(64|128|256|512|1024)\s*(?:gb|g)\b|\b1\s*tb\b/gi, ' ');
  }

  asciiWorking = stripVietnameseAccents(working);
  if (/\b(gaming|choi game|chien game|cau hinh manh|game)\b/.test(asciiWorking)) {
    requirement = 'gaming';
    intentTags.push('Nhu cầu: Gaming / Hiệu năng cao');
    working = working.replace(/(chơi game|choi game|chiến game|chien game|cấu hình mạnh|cau hinh manh|gaming|\bgame\b)/gi, ' ');
  } else if (/\b(van phong|mong nhe|hoc tap)\b/.test(asciiWorking)) {
    requirement = 'office';
    intentTags.push('Nhu cầu: Văn phòng mỏng nhẹ');
    working = working.replace(/(văn phòng|van phong|mỏng nhẹ|mong nhe|học tập|hoc tap)/gi, ' ');
  } else if (/\b(do hoa|ky thuat|render|thiet ke)\b/.test(asciiWorking)) {
    requirement = 'graphic';
    intentTags.push('Nhu cầu: Đồ họa & Kỹ thuật');
    working = working.replace(/(thiết kế đồ họa|đồ họa|do hoa|kỹ thuật|ky thuat|render|thiết kế|thiet ke)/gi, ' ');
  } else if (/\b(chup anh|camera|nhiep anh|zoom|quay phim)\b/.test(asciiWorking)) {
    requirement = 'camera';
    intentTags.push('Nhu cầu: Chụp ảnh / Camera đẹp');
    working = working.replace(/(chụp ảnh đẹp|chụp ảnh|chup anh dep|chup anh|nhiếp ảnh|nhiep anh|camera đẹp|camera|zoom quang|zoom|quay phim)/gi, ' ');
  } else if (/\b(pin trau|pin khung|pin lau|sac nhanh)\b/.test(asciiWorking)) {
    requirement = 'battery';
    intentTags.push('Nhu cầu: Pin trâu / Sạc nhanh');
    working = working.replace(/(pin trâu|pin trau|pin khủng|pin khung|pin lâu|pin lau|sạc nhanh|sac nhanh)/gi, ' ');
  } else if (/\b(man hinh gap|dien thoai gap|gap)\b/.test(asciiWorking)) {
    requirement = 'foldable';
    intentTags.push('Thiết kế: Màn hình gập');
    working = working.replace(/(màn hình gập|man hinh gap|điện thoại gập|dien thoai gap|\bgập\b|\bgap\b)/gi, ' ');
  } else if (/\b(chong on|anc)\b/.test(asciiWorking)) {
    requirement = 'anc';
    intentTags.push('Tính năng: Chống ồn ANC');
    working = working.replace(/(chống ồn chủ động|chống ồn|chong on|anc)/gi, ' ');
  }

  working = working.replace(/(chính hãng|chinh hang|mới nhất|moi nhat|tốt nhất|tot nhat|đẹp|dep|xịn|xin)/gi, ' ');
  const stopWords = new Set(['cua', 'cho', 'loai', 'dong', 'may', 'can', 'mua', 'tim', 'co', 'voi', 'va', 'hoac', 'nhung', 'cac', 'chiec', 'con']);
  const coreTokens = working
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 1 && !stopWords.has(stripVietnameseAccents(t)));

  return {
    rawQuery,
    category,
    minPrice,
    maxPrice,
    isCheapIntent,
    isPremiumIntent,
    isFlashSale,
    isInstallment0,
    ram,
    rom,
    cpu,
    connectionType,
    requirement,
    suggestedSort,
    coreTokens,
    intentTags,
  };
};
