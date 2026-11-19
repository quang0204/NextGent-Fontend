const MINIO_BRAND_LOGOS: Record<string, string> = {
  apple: 'http://localhost:9000/brands/brands/1/446bbd63-6d10-4009-8f6a-b00b55e89fd4-Apple_logo_black.svg',
  samsung: 'http://localhost:9000/brands/brands/2/bbcd5610-2a04-4c41-ac54-53320f56c418-Samsung_old_logo_before_year_2015.svg.webp',
  xiaomi: 'http://localhost:9000/brands/brands/3/bcc64df8-125d-479c-9eea-75ec88e8189c-images.png',
  sony: 'http://localhost:9000/brands/brands/4/1a3dd88f-296b-437a-a454-bae91860c9d1-Sony_logo.svg',
  asus: 'http://localhost:9000/brands/brands/5/33a9e35d-bf8d-4e8a-bb2c-c35e6488b179-ASUS_Corporate_Logo.svg.webp',
  anker: 'http://localhost:9000/brands/brands/6/db4362ee-74ba-48db-8496-e1f74d0c963c-Anker_logo.svg.webp',
  marshall: 'http://localhost:9000/brands/brands/7/974db7fb-bc24-4b43-9191-928d229edac6-Marshall_logo.svg.webp',
};

/**
 * Resolve MinIO logo URL from DB or fallback mapping
 */
export const resolveBrandLogo = (logoUrl?: string, brandName?: string): string | undefined => {
  if (logoUrl && logoUrl.trim() !== '') {
    if (logoUrl.startsWith('minio://brands/')) {
      return `http://localhost:9000/brands/${logoUrl.replace('minio://brands/', '')}`;
    }
    if (logoUrl.startsWith('minio://')) {
      return `http://localhost:9000/${logoUrl.replace('minio://', '')}`;
    }
    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
      return logoUrl;
    }
    if (!logoUrl.startsWith('/')) {
      return `http://localhost:9000/brands/${logoUrl}`;
    }
    return logoUrl;
  }
  if (brandName) {
    const key = brandName.toLowerCase().trim();
    if (MINIO_BRAND_LOGOS[key]) {
      return MINIO_BRAND_LOGOS[key];
    }
  }
  return undefined;
};
