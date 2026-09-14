export interface NeighborhoodOption {
  slug: string;
  nameFa: string;
  city: "urmia" | "tehran";
  cityNameFa: string;
  lat: number;
  lng: number;
}

export const NEIGHBORHOODS: NeighborhoodOption[] = [
  // --- Urmia (Launch City) ---
  {
    slug: "daneshkadeh",
    nameFa: "دانشکده",
    city: "urmia",
    cityNameFa: "ارومیه",
    lat: 37.5342,
    lng: 45.0681,
  },
  {
    slug: "sheykh-tappeh",
    nameFa: "شیخ‌تپه",
    city: "urmia",
    cityNameFa: "ارومیه",
    lat: 37.5258,
    lng: 45.0495,
  },
  {
    slug: "ostadan",
    nameFa: "استادان",
    city: "urmia",
    cityNameFa: "ارومیه",
    lat: 37.5385,
    lng: 45.0592,
  },
  {
    slug: "khayyam",
    nameFa: "خیام",
    city: "urmia",
    cityNameFa: "ارومیه",
    lat: 37.5501,
    lng: 45.0743,
  },
  {
    slug: "kashani",
    nameFa: "کاشانی",
    city: "urmia",
    cityNameFa: "ارومیه",
    lat: 37.5453,
    lng: 45.0702,
  },
  {
    slug: "behdari",
    nameFa: "بهداری",
    city: "urmia",
    cityNameFa: "ارومیه",
    lat: 37.519,
    lng: 45.055,
  },
  {
    slug: "emam",
    nameFa: "خیابان امام",
    city: "urmia",
    cityNameFa: "ارومیه",
    lat: 37.553,
    lng: 45.078,
  },
  // --- Tehran (Expansion City) ---
  {
    slug: "saadat-abad",
    nameFa: "سعادت‌آباد",
    city: "tehran",
    cityNameFa: "تهران",
    lat: 35.7891,
    lng: 51.3735,
  },
  {
    slug: "valiasr",
    nameFa: "ولیعصر",
    city: "tehran",
    cityNameFa: "تهران",
    lat: 35.728,
    lng: 51.411,
  },
  {
    slug: "yousef-abad",
    nameFa: "یوسف‌آباد",
    city: "tehran",
    cityNameFa: "تهران",
    lat: 35.733,
    lng: 51.405,
  },
  {
    slug: "farmanieh",
    nameFa: "فرمانیه",
    city: "tehran",
    cityNameFa: "تهران",
    lat: 35.801,
    lng: 51.465,
  },
  {
    slug: "pasdaran",
    nameFa: "پاسداران",
    city: "tehran",
    cityNameFa: "تهران",
    lat: 35.765,
    lng: 51.458,
  },
];
