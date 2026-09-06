import {
  PrismaClient,
  Role,
  BusinessType,
  VerificationStatus,
  StaffRole,
  ListingType,
  ListingStatus,
  SafetyStatus,
  TemperatureRequirement,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Loqme database (Phase 1: Urmia Launch, Phase 2: Tehran Expansion)...');

  // ==========================================
  // 1. Core Users (Customer, Merchant, Admin)
  // ==========================================
  const customerUser = await prisma.user.upsert({
    where: { mobile: '09121111111' },
    update: {},
    create: {
      mobile: '09121111111',
      role: Role.CUSTOMER,
      customer: {
        create: {
          fullName: 'سارا محمدی',
          cumulativeSavingsToman: BigInt(450000),
        },
      },
    },
  });
  console.log('✅ Customer seeded:', customerUser.mobile);

  const primaryMerchantOwner = await prisma.user.upsert({
    where: { mobile: '09122222222' },
    update: {},
    create: {
      mobile: '09122222222',
      role: Role.MERCHANT_OWNER,
      customer: {
        create: {
          fullName: 'علی رضایی',
        },
      },
    },
  });
  console.log('✅ Primary Merchant Owner seeded:', primaryMerchantOwner.mobile);

  const adminUser = await prisma.user.upsert({
    where: { mobile: '09123333333' },
    update: {},
    create: {
      mobile: '09123333333',
      role: Role.ADMIN,
      customer: {
        create: {
          fullName: 'مدیر سامانه لقمه',
        },
      },
    },
  });
  console.log('✅ Admin seeded:', adminUser.mobile);

  // ==========================================
  // 2. Geography: Urmia (Launch City) & Tehran (Expansion)
  // ==========================================

  // --- Phase 1 Launch City: Urmia, West Azerbaijan ---
  const urmiaProvince = await prisma.province.upsert({
    where: { slug: 'azarbaijan-gharbi' },
    update: {},
    create: {
      nameFa: 'آذربایجان غربی',
      slug: 'azarbaijan-gharbi',
    },
  });

  const urmiaCity = await prisma.city.upsert({
    where: {
      provinceId_slug: {
        provinceId: urmiaProvince.id,
        slug: 'urmia',
      },
    },
    update: {},
    create: {
      provinceId: urmiaProvince.id,
      nameFa: 'ارومیه',
      slug: 'urmia',
    },
  });

  const urmiaNeighborhoodsData = [
    { slug: 'daneshkadeh', nameFa: 'دانشکده', centerLat: 37.5342, centerLng: 45.0681 },
    { slug: 'sheykh-tappeh', nameFa: 'شیخ‌تپه', centerLat: 37.5258, centerLng: 45.0495 },
    { slug: 'ostadan', nameFa: 'استادان', centerLat: 37.5385, centerLng: 45.0592 },
    { slug: 'khayyam', nameFa: 'خیام', centerLat: 37.5501, centerLng: 45.0743 },
    { slug: 'kashani', nameFa: 'کاشانی', centerLat: 37.5453, centerLng: 45.0702 },
    { slug: 'behdari', nameFa: 'بهداری و درستکار', centerLat: 37.5190, centerLng: 45.0550 },
    { slug: 'emam', nameFa: 'خیابان امام', centerLat: 37.5530, centerLng: 45.0780 },
  ];

  const neighborhoods: Record<string, { id: string; cityId: string }> = {};
  for (const n of urmiaNeighborhoodsData) {
    const record = await prisma.neighborhood.upsert({
      where: {
        cityId_slug: {
          cityId: urmiaCity.id,
          slug: n.slug,
        },
      },
      update: {
        centerLat: n.centerLat,
        centerLng: n.centerLng,
      },
      create: {
        cityId: urmiaCity.id,
        nameFa: n.nameFa,
        slug: n.slug,
        centerLat: n.centerLat,
        centerLng: n.centerLng,
      },
    });
    neighborhoods[n.slug] = { id: record.id, cityId: urmiaCity.id };
  }
  console.log('✅ Phase 1 Launch Geography: Urmia with 7 neighborhoods');

  // --- Phase 2 Expansion City: Tehran ---
  const tehranProvince = await prisma.province.upsert({
    where: { slug: 'tehran' },
    update: {},
    create: {
      nameFa: 'تهران',
      slug: 'tehran',
    },
  });

  const tehranCity = await prisma.city.upsert({
    where: {
      provinceId_slug: {
        provinceId: tehranProvince.id,
        slug: 'tehran',
      },
    },
    update: {},
    create: {
      provinceId: tehranProvince.id,
      nameFa: 'تهران',
      slug: 'tehran',
    },
  });

  const tehranNeighborhoodsData = [
    { slug: 'saadat-abad', nameFa: 'سعادت‌آباد', centerLat: 35.7891, centerLng: 51.3735 },
    { slug: 'shahrak-gharb', nameFa: 'شهرک غرب', centerLat: 35.7656, centerLng: 51.3688 },
    { slug: 'enghelab', nameFa: 'میدان انقلاب', centerLat: 35.7008, centerLng: 51.3912 },
    { slug: 'tajrish', nameFa: 'تجریش', centerLat: 35.8069, centerLng: 51.4286 },
    { slug: 'sadeghiyeh', nameFa: 'صادقیه', centerLat: 35.7205, centerLng: 51.3347 },
  ];

  for (const n of tehranNeighborhoodsData) {
    const record = await prisma.neighborhood.upsert({
      where: {
        cityId_slug: {
          cityId: tehranCity.id,
          slug: n.slug,
        },
      },
      update: {
        centerLat: n.centerLat,
        centerLng: n.centerLng,
      },
      create: {
        cityId: tehranCity.id,
        nameFa: n.nameFa,
        slug: n.slug,
        centerLat: n.centerLat,
        centerLng: n.centerLng,
      },
    });
    neighborhoods[n.slug] = { id: record.id, cityId: tehranCity.id };
  }
  console.log('✅ Phase 2 Expansion Geography: Tehran with 5 neighborhoods');

  // ==========================================
  // 3. Hierarchical Categories
  // ==========================================
  const categoriesData = [
    { slug: 'bakery', nameFa: 'نان و شیرینی', iconUrl: '🍞' },
    { slug: 'cafe', nameFa: 'کافه و نوشیدنی', iconUrl: '☕' },
    { slug: 'restaurant', nameFa: 'غذا و رستوران', iconUrl: '🍲' },
    { slug: 'supermarket', nameFa: 'سوپرمارکت و خواربار', iconUrl: '🛒' },
    { slug: 'produce', nameFa: 'میوه و تره‌بار', iconUrl: '🥦' },
    { slug: 'deli', nameFa: 'پروتئین و دلی', iconUrl: '🥩' },
  ];

  const categories: Record<string, string> = {};
  for (const c of categoriesData) {
    const record = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { nameFa: c.nameFa, iconUrl: c.iconUrl },
      create: {
        slug: c.slug,
        nameFa: c.nameFa,
        iconUrl: c.iconUrl,
      },
    });
    categories[c.slug] = record.id;
  }
  console.log('✅ Categories seeded: 6 core categories');

  // ==========================================
  // 4. Authentic Merchants in Urmia & Tehran
  // ==========================================
  const merchantsData = [
    // --- URMIA MERCHANTS (Launch City) ---
    {
      idKey: 'homa_urmia',
      name: 'نقل و حلوای سنتی هما ارومیه',
      type: BusinessType.BAKERY,
      rating: 4.95,
      ratingCount: 380,
      neighborhood: 'emam',
      address: 'ارومیه، خیابان امام، تقاطع خیام جنوبی، روبروی مسجد سردار',
      lat: 37.5535,
      lng: 45.0785,
      phone: '04432223344',
    },
    {
      idKey: 'toos_urmia',
      name: 'قنادی و شیرینی طوس ارومیه',
      type: BusinessType.BAKERY,
      rating: 4.90,
      ratingCount: 290,
      neighborhood: 'kashani',
      address: 'ارومیه، خیابان کاشانی، بالاتر از چهارراه دانشکده، پلاک ۱۱۴',
      lat: 37.5458,
      lng: 45.0708,
      phone: '04433445566',
    },
    {
      idKey: 'barekat_urmia',
      name: 'نانوایی و نان روغنی سنتی برکت ارومیه',
      type: BusinessType.BAKERY,
      rating: 4.88,
      ratingCount: 215,
      neighborhood: 'sheykh-tappeh',
      address: 'ارومیه، بلوار شیخ‌تپه، نبش خیابان صائب تبریزی، پلاک ۲۲',
      lat: 37.5262,
      lng: 45.0501,
      phone: '04433367788',
    },
    {
      idKey: 'gallery_daneshkadeh',
      name: 'کافه گالری دانشکده ارومیه',
      type: BusinessType.CAFE,
      rating: 4.89,
      ratingCount: 340,
      neighborhood: 'daneshkadeh',
      address: 'ارومیه، خیابان دانشکده، روبروی پارک ملت، پلاک ۴۸',
      lat: 37.5345,
      lng: 45.0685,
      phone: '04433469900',
    },
    {
      idKey: 'diako_urmia',
      name: 'رستوران سنتی و کترینگ دیاکو ارومیه',
      type: BusinessType.RESTAURANT,
      rating: 4.85,
      ratingCount: 195,
      neighborhood: 'ostadan',
      address: 'ارومیه، بلوار استادان، نبش کوچه ششم، مجتمع کوروش',
      lat: 37.5390,
      lng: 45.0598,
      phone: '04433451122',
    },
    {
      idKey: 'parsian_behdari',
      name: 'هایپرمارکت پارسیان بهداری',
      type: BusinessType.SUPERMARKET,
      rating: 4.70,
      ratingCount: 120,
      neighborhood: 'behdari',
      address: 'ارومیه، بلوار بهداری، نرسیده به کوچه درستکار، پلاک ۸۵',
      lat: 37.5195,
      lng: 45.0555,
      phone: '04433658899',
    },
    {
      idKey: 'negin_sheykh',
      name: 'میوه و تره‌بار تازه نگین ارومیه',
      type: BusinessType.PRODUCE,
      rating: 4.78,
      ratingCount: 145,
      neighborhood: 'sheykh-tappeh',
      address: 'ارومیه، میدان شیخ‌تپه، ابتدای بلوار نبوت، پلاک ۱۶',
      lat: 37.5255,
      lng: 45.0490,
      phone: '04433371133',
    },

    // --- TEHRAN MERCHANTS (Expansion Market) ---
    {
      idKey: 'barekat',
      name: 'نانوایی و شیرینی سنتی برکت',
      type: BusinessType.BAKERY,
      rating: 4.88,
      ratingCount: 164,
      neighborhood: 'saadat-abad',
      address: 'سعادت‌آباد، خیابان سرو غربی، نبش خیابان مروارید، پلاک ۱۲',
      lat: 35.7895,
      lng: 51.3742,
      phone: '02122091234',
    },
    {
      idKey: 'lamiz_tajrish',
      name: 'کافه لمیز تجریش',
      type: BusinessType.CAFE,
      rating: 4.92,
      ratingCount: 310,
      neighborhood: 'tajrish',
      address: 'میدان تجریش، خیابان شهرداری، روبروی بازار سنتی، پلاک ۴۴',
      lat: 35.8075,
      lng: 51.4290,
      phone: '02122718899',
    },
    {
      idKey: 'alef_shahrak',
      name: 'قنادی الف شهرک غرب',
      type: BusinessType.BAKERY,
      rating: 4.81,
      ratingCount: 220,
      neighborhood: 'shahrak-gharb',
      address: 'شهرک غرب، بلوار فرحزادی، بالاتر از بلوار دادمان، پلاک ۸۰',
      lat: 35.7662,
      lng: 51.3695,
      phone: '02188371122',
    },
    {
      idKey: 'bahar_enghelab',
      name: 'هایپرمارکت بهار انقلاب',
      type: BusinessType.SUPERMARKET,
      rating: 4.65,
      ratingCount: 95,
      neighborhood: 'enghelab',
      address: 'میدان انقلاب، خیابان کارگر شمالی، نرسیده به خیابان نصرت، پلاک ۱۱۸',
      lat: 35.7020,
      lng: 51.3918,
      phone: '02166405566',
    },
    {
      idKey: 'toranj_sadeghiyeh',
      name: 'رستوران سنتی ترنج صادقیه',
      type: BusinessType.RESTAURANT,
      rating: 4.75,
      ratingCount: 180,
      neighborhood: 'sadeghiyeh',
      address: 'فلکه دوم صادقیه، ابتدای خیابان آیت‌الله کاشانی، پلاک ۱۵',
      lat: 35.7212,
      lng: 51.3355,
      phone: '02144007788',
    },
  ];

  const merchantIds: Record<string, { merchantId: string; locationId: string }> = {};

  for (let i = 0; i < merchantsData.length; i++) {
    const m = merchantsData[i];
    const mobile = i === 0 ? '09122222222' : `0914000000${i}`;

    const ownerUser = await prisma.user.upsert({
      where: { mobile },
      update: {},
      create: {
        mobile,
        role: Role.MERCHANT_OWNER,
        customer: {
          create: {
            fullName: `مالک ${m.name}`,
          },
        },
      },
    });

    let merchant = await prisma.merchant.findFirst({
      where: { businessNameFa: m.name },
      include: { locations: true },
    });

    const neighborhoodRef = neighborhoods[m.neighborhood];
    let locationId = merchant?.locations[0]?.id;

    if (!merchant) {
      merchant = await prisma.merchant.create({
        data: {
          ownerUserId: ownerUser.id,
          businessNameFa: m.name,
          businessType: m.type,
          verificationStatus: VerificationStatus.APPROVED,
          ratingAverage: m.rating,
          ratingCount: m.ratingCount,
          licenseNumber: `LIC-1403-${1000 + i}`,
          commissionPercent: 10.0,
          staff: {
            create: {
              userId: ownerUser.id,
              role: StaffRole.OWNER,
              canScanPickup: true,
            },
          },
          locations: {
            create: {
              cityId: neighborhoodRef.cityId,
              neighborhoodId: neighborhoodRef.id,
              addressFa: m.address,
              latitude: m.lat,
              longitude: m.lng,
              phone: m.phone,
              hours: {
                createMany: {
                  data: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
                    dayOfWeek: day,
                    isOpen: true,
                    storeOpenTime: '08:00',
                    storeCloseTime: '23:00',
                    defaultPickupStart: '19:30',
                    defaultPickupEnd: '22:00',
                  })),
                },
              },
            },
          },
        },
        include: { locations: true },
      });
      locationId = merchant.locations[0].id;
    } else if (!locationId) {
      const newLoc = await prisma.merchantLocation.create({
        data: {
          merchantId: merchant.id,
          cityId: neighborhoodRef.cityId,
          neighborhoodId: neighborhoodRef.id,
          addressFa: m.address,
          latitude: m.lat,
          longitude: m.lng,
          phone: m.phone,
          hours: {
            createMany: {
              data: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
                dayOfWeek: day,
                isOpen: true,
                storeOpenTime: '08:00',
                storeCloseTime: '23:00',
                defaultPickupStart: '19:30',
                defaultPickupEnd: '22:00',
              })),
            },
          },
        },
      });
      locationId = newLoc.id;
    }

    merchantIds[m.idKey] = {
      merchantId: merchant.id,
      locationId: locationId!,
    };
  }
  console.log('✅ 12 Local Merchants & Locations seeded in Urmia & Tehran');

  // ==========================================
  // 5. 25 Authentic Surplus Listings
  // ==========================================
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const makeWindow = (baseDate: Date, startHour: number, startMin: number, endHour: number, endMin: number) => {
    const start = new Date(baseDate);
    start.setHours(startHour, startMin, 0, 0);
    const end = new Date(baseDate);
    end.setHours(endHour, endMin, 0, 0);
    return { start, end };
  };

  const listingsData = [
    // --- 1-3: نقل و حلوای سنتی هما ارومیه ---
    {
      merchantKey: 'homa_urmia',
      categoryKey: 'bakery',
      type: ListingType.SURPRISE_BAG,
      title: 'بسته شگفت‌انگیز نقل زعفرانی بیدمشک و حلوای اصل ارومیه',
      desc: 'شامل نقل ابریشمی بیدمشک، حلوای هویج سنتی تازه و گردوی اعلای باغات ارومیه تولید امروز.',
      origPrice: 220000,
      discPrice: 89000,
      qty: 6,
      date: today,
      window: makeWindow(today, 19, 0, 21, 30),
      allergens: ['NUTS'],
      dietary: ['VEGETARIAN', 'HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'در ظرف دربسته در جای خشک و خنک',
    },
    {
      merchantKey: 'homa_urmia',
      categoryKey: 'bakery',
      type: ListingType.FLASH_DEAL,
      title: 'دیس حلوای گردوی تازه ارومیه (نیم‌کیلوگرم)',
      desc: 'حلوای گردوی سنتی فوق‌العاده مقوی پخت دیگ مسی روز با شیره انگور محلی.',
      origPrice: 190000,
      discPrice: 95000,
      qty: 5,
      date: today,
      window: makeWindow(today, 18, 30, 21, 0),
      allergens: ['NUTS'],
      dietary: ['VEGETARIAN', 'HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'در دمای معتدل اتاق',
    },

    // --- 4-5: قنادی طوس ارومیه (کاشانی) ---
    {
      merchantKey: 'toos_urmia',
      categoryKey: 'bakery',
      type: ListingType.SURPRISE_BAG,
      title: 'بسته سورپرایز شیرینی تر و ناپلئونی قنادی طوس',
      desc: 'مجموعه نیم‌کیلویی شیرینی تر تازه شامل ناپلئونی کره‌ای، لطیفه و نان خامه‌ای پخت عصر طوس.',
      origPrice: 240000,
      discPrice: 99000,
      qty: 5,
      date: today,
      window: makeWindow(today, 20, 0, 22, 0),
      allergens: ['GLUTEN', 'DAIRY', 'EGGS'],
      dietary: ['VEGETARIAN', 'HALAL'],
      temp: TemperatureRequirement.CHILLED,
      storage: 'نگهداری حتمی در یخچال',
    },
    {
      merchantKey: 'toos_urmia',
      categoryKey: 'bakery',
      type: ListingType.FLASH_DEAL,
      title: 'باقلوای استانبولی شهددار طوس ارومیه (جعبه ۴۰۰ گرم)',
      desc: 'باقلوای تازه با مغز گردوی تازه و شهد عسل طبیعی.',
      origPrice: 210000,
      discPrice: 105000,
      qty: 4,
      date: tomorrow,
      window: makeWindow(tomorrow, 17, 30, 20, 0),
      allergens: ['GLUTEN', 'NUTS', 'DAIRY'],
      dietary: ['VEGETARIAN', 'HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'در جای خشک و خنک',
    },

    // --- 6-7: نانوایی و نان روغنی برکت ارومیه (شیخ‌تپه) ---
    {
      merchantKey: 'barekat_urmia',
      categoryKey: 'bakery',
      type: ListingType.SURPRISE_BAG,
      title: 'بسته نان روغنی سنتی (یاغلی چورک) و بربری کنجدی داغ ارومیه',
      desc: 'شامل ۲ قرص نان روغنی محلی تبریز/ارومیه با زردچوبه و کنجد همراه با بربری داغ عصرگاهی.',
      origPrice: 110000,
      discPrice: 45000,
      qty: 8,
      date: today,
      window: makeWindow(today, 19, 30, 21, 30),
      allergens: ['GLUTEN', 'SESAME', 'DAIRY'],
      dietary: ['VEGETARIAN', 'HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'در کیسه پارچه‌ای',
    },
    {
      merchantKey: 'barekat_urmia',
      categoryKey: 'bakery',
      type: ListingType.FLASH_DEAL,
      title: 'نان سنگک دو رو کنجدی و فطیر محلی (۳ عدد)',
      desc: 'پک عصرانه نان سنگک برشته و فطیر محلی داغ برکت.',
      origPrice: 85000,
      discPrice: 38000,
      qty: 6,
      date: tomorrow,
      window: makeWindow(tomorrow, 18, 0, 20, 30),
      allergens: ['GLUTEN', 'SESAME'],
      dietary: ['VEGETARIAN', 'HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'در فریزر یا دمای اتاق',
    },

    // --- 8-9: کافه گالری دانشکده ارومیه ---
    {
      merchantKey: 'gallery_daneshkadeh',
      categoryKey: 'cafe',
      type: ListingType.SURPRISE_BAG,
      title: 'بسته بیکری و کیک عصرانه کافه دانشکده',
      desc: 'کرواسان شکلاتی تازه، مافین گردویی و اسلایس پای سیب پخت امروز کافه دانشکده.',
      origPrice: 195000,
      discPrice: 82000,
      qty: 5,
      date: today,
      window: makeWindow(today, 20, 30, 22, 30),
      allergens: ['GLUTEN', 'DAIRY', 'EGGS', 'NUTS'],
      dietary: ['VEGETARIAN', 'HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'در دمای خنک',
    },
    {
      merchantKey: 'gallery_daneshkadeh',
      categoryKey: 'cafe',
      type: ListingType.FLASH_DEAL,
      title: 'چیزکیک لوتوس و موکا کافه گالری',
      desc: 'دسر محبوب کرمی لوتوس با پایه بیسکویت ترد و پنیر تازه.',
      origPrice: 150000,
      discPrice: 75000,
      qty: 4,
      date: today,
      window: makeWindow(today, 19, 0, 21, 30),
      allergens: ['DAIRY', 'GLUTEN'],
      dietary: ['VEGETARIAN', 'HALAL'],
      temp: TemperatureRequirement.CHILLED,
      storage: 'حتماً در یخچال نگهداری شود',
    },

    // --- 10-11: رستوران سنتی دیاکو ارومیه (استادان) ---
    {
      merchantKey: 'diako_urmia',
      categoryKey: 'restaurant',
      type: ListingType.SURPRISE_BAG,
      title: 'بسته شگفت‌انگیز غذای اصیل آذربایجان و برنج زعفرانی',
      desc: 'غذای اضافه باکیفیت و دست‌نخورده مطبخ دیاکو شامل چلو جوجه یا کوبیده با برنج محلی ایرانی.',
      origPrice: 310000,
      discPrice: 135000,
      qty: 4,
      date: today,
      window: makeWindow(today, 21, 0, 22, 30),
      allergens: [],
      dietary: ['HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'گرم کردن کامل قبل از میل کردن',
    },
    {
      merchantKey: 'diako_urmia',
      categoryKey: 'restaurant',
      type: ListingType.FLASH_DEAL,
      title: 'پیش‌غذا و کوفته سنتی آذربایجان با مخلفات',
      desc: 'کوفته معروف ارومیه/تبریز همراه با دلمه برگ مو تازه و ماست موسیر سنتی.',
      origPrice: 220000,
      discPrice: 99000,
      qty: 5,
      date: tomorrow,
      window: makeWindow(tomorrow, 20, 0, 22, 0),
      allergens: ['EGGS'],
      dietary: ['HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'نگهداری در یخچال',
    },

    // --- 12-13: هایپرمارکت پارسیان بهداری ---
    {
      merchantKey: 'parsian_behdari',
      categoryKey: 'supermarket',
      type: ListingType.SURPRISE_BAG,
      title: 'سبد لبنیات پاستوریزه پگاه و اروم‌آدا',
      desc: 'ماست سنتی چکیده، شیر تازه کم‌چرب و پنیر لیقوان پلمپ کارخانه‌ای با فاصله مطمئن تا انقضا.',
      origPrice: 210000,
      discPrice: 89000,
      qty: 7,
      date: today,
      window: makeWindow(today, 18, 30, 21, 0),
      allergens: ['DAIRY'],
      dietary: ['VEGETARIAN', 'HALAL'],
      temp: TemperatureRequirement.CHILLED,
      storage: 'در یخچال نگهداری گردد',
    },
    {
      merchantKey: 'parsian_behdari',
      categoryKey: 'supermarket',
      type: ListingType.FLASH_DEAL,
      title: 'پک کمپوت اروم‌آدا و آبمیوه ارگانیک باغات ارومیه (۳ عدد)',
      desc: 'کمپوت گیلاس و هلو ممتاز اروم‌آدا با استاندارد کامل بهداشتی.',
      origPrice: 160000,
      discPrice: 75000,
      qty: 8,
      date: tomorrow,
      window: makeWindow(tomorrow, 17, 0, 20, 0),
      allergens: [],
      dietary: ['VEGAN', 'HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'در جای خشک و خنک',
    },

    // --- 14: میوه و تره‌بار نگین ارومیه (شیخ‌تپه) ---
    {
      merchantKey: 'negin_sheykh',
      categoryKey: 'produce',
      type: ListingType.SURPRISE_BAG,
      title: 'جعبه میوه‌های ممتاز باغات ارومیه و اشنویه (۳.۵ کیلوگرم)',
      desc: 'شامل سیب قرمز لبنانی ارومیه، انگور بی‌دانه و هلو زعفرانی کاملاً شیرین و رسیده.',
      origPrice: 175000,
      discPrice: 69000,
      qty: 9,
      date: today,
      window: makeWindow(today, 18, 0, 20, 30),
      allergens: [],
      dietary: ['VEGAN', 'HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'در جای خنک یا جامیوه‌ای یخچال',
    },

    // --- 15-18: تهران - برکت سعادت‌آباد ---
    {
      merchantKey: 'barekat',
      categoryKey: 'bakery',
      type: ListingType.SURPRISE_BAG,
      title: 'بسته شگفت‌انگیز نان سنتی و بربری داغ تهران',
      desc: 'شامل ۳ تا ۴ قرص نان سنتی کنجدی، بربری اعلا و نان شیرمال تازه روز با پخت عصرگاهی.',
      origPrice: 120000,
      discPrice: 48000,
      qty: 6,
      date: today,
      window: makeWindow(today, 19, 30, 21, 30),
      allergens: ['GLUTEN', 'SESAME'],
      dietary: ['VEGETARIAN', 'HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'در جای خشک و خنک',
    },
    {
      merchantKey: 'barekat',
      categoryKey: 'bakery',
      type: ListingType.FLASH_DEAL,
      title: 'نان فانتزی باگت فرانسوی و تست جو (۳ عدد)',
      desc: 'پک اقتصادی نان تست و باگت فرانسوی سوخاری مناسب عصرانه و وعده شام.',
      origPrice: 90000,
      discPrice: 42000,
      qty: 8,
      date: tomorrow,
      window: makeWindow(tomorrow, 18, 0, 20, 30),
      allergens: ['GLUTEN'],
      dietary: ['VEGAN', 'HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'در فریزر یا نایلون دربسته',
    },

    // --- 19-20: تهران - کافه لمیز تجریش ---
    {
      merchantKey: 'lamiz_tajrish',
      categoryKey: 'cafe',
      type: ListingType.SURPRISE_BAG,
      title: 'بسته شگفت‌انگیز بیکری و مافین عصرانه کافه لمیز',
      desc: 'شامل کرواسان کره‌ای، کوکی شکلات تلخ و مافین بلوبری پخت صبح.',
      origPrice: 210000,
      discPrice: 89000,
      qty: 5,
      date: today,
      window: makeWindow(today, 20, 30, 22, 30),
      allergens: ['GLUTEN', 'DAIRY', 'EGGS'],
      dietary: ['VEGETARIAN', 'HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'در جعبه مخصوص در دمای محیط',
    },
    {
      merchantKey: 'lamiz_tajrish',
      categoryKey: 'cafe',
      type: ListingType.FLASH_DEAL,
      title: 'چیزکیک سن‌سباستین کافه لمیز (اسلایس)',
      desc: 'چیزکیک کرمی پرطرفدار با طعم کاراملی اصیل، تهیه شده از پنیر ماسکارپونه تازه.',
      origPrice: 160000,
      discPrice: 85000,
      qty: 4,
      date: today,
      window: makeWindow(today, 19, 0, 21, 30),
      allergens: ['DAIRY', 'EGGS', 'GLUTEN'],
      dietary: ['VEGETARIAN', 'HALAL'],
      temp: TemperatureRequirement.CHILLED,
      storage: 'حتماً در یخچال نگهداری شود',
    },

    // --- 21-22: تهران - قنادی الف شهرک غرب ---
    {
      merchantKey: 'alef_shahrak',
      categoryKey: 'bakery',
      type: ListingType.SURPRISE_BAG,
      title: 'بسته سورپرایز شیرینی تر و دسرهای فرانسوی الف',
      desc: 'گلچینی از انواع رولت، نان خامه‌ای و تارت میوه تازه قنادی الف شهرک غرب.',
      origPrice: 290000,
      discPrice: 129000,
      qty: 5,
      date: today,
      window: makeWindow(today, 20, 0, 22, 0),
      allergens: ['GLUTEN', 'DAIRY', 'EGGS'],
      dietary: ['VEGETARIAN', 'HALAL'],
      temp: TemperatureRequirement.CHILLED,
      storage: 'نگهداری در یخچال با دمای ۴ درجه',
    },
    {
      merchantKey: 'alef_shahrak',
      categoryKey: 'bakery',
      type: ListingType.FLASH_DEAL,
      title: 'دیس باقلوای استانبولی اعلا تهران (۳۰۰ گرم)',
      desc: 'باقلوای گردویی و پسته تازه با شهد عسل و گلاب ناب.',
      origPrice: 240000,
      discPrice: 115000,
      qty: 4,
      date: tomorrow,
      window: makeWindow(tomorrow, 17, 30, 20, 0),
      allergens: ['GLUTEN', 'NUTS', 'DAIRY'],
      dietary: ['VEGETARIAN', 'HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'در دمای معتدل اتاق',
    },

    // --- 23-24: تهران - هایپرمارکت بهار انقلاب ---
    {
      merchantKey: 'bahar_enghelab',
      categoryKey: 'supermarket',
      type: ListingType.SURPRISE_BAG,
      title: 'سبد شگفت‌انگیز لبنیات ممتاز پاستوریزه بهار',
      desc: 'شامل ماست یونانی، پنیر فتا بسته‌بندی، شیر کم‌چرب شناسنامه‌دار.',
      origPrice: 230000,
      discPrice: 98000,
      qty: 7,
      date: today,
      window: makeWindow(today, 18, 30, 21, 0),
      allergens: ['DAIRY'],
      dietary: ['VEGETARIAN', 'HALAL'],
      temp: TemperatureRequirement.CHILLED,
      storage: 'زنجیره سرما در یخچال رعایت گردد',
    },
    {
      merchantKey: 'bahar_enghelab',
      categoryKey: 'supermarket',
      type: ListingType.FLASH_DEAL,
      title: 'بسته‌های غلات صبحانه و بار پروتئین بهار',
      desc: 'بسته صبحانه مقوی شامل موسلی میوه‌ای و بار پروتئینی با بسته‌بندی پلمپ.',
      origPrice: 175000,
      discPrice: 79000,
      qty: 10,
      date: tomorrow,
      window: makeWindow(tomorrow, 16, 0, 19, 0),
      allergens: ['GLUTEN', 'SOY', 'NUTS'],
      dietary: ['VEGAN', 'HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'در جای خشک و خنک',
    },

    // --- 25: تهران - رستوران سنتی ترنج صادقیه ---
    {
      merchantKey: 'toranj_sadeghiyeh',
      categoryKey: 'restaurant',
      type: ListingType.SURPRISE_BAG,
      title: 'بسته شگفت‌انگیز خوراک اصیل ایرانی با برنج طارم',
      desc: 'غذای باکیفیت و تازه مطبخ ترنج شامل برنج زعفرانی اعلا با خورش قیمه نثار یا فسنجان.',
      origPrice: 320000,
      discPrice: 139000,
      qty: 4,
      date: today,
      window: makeWindow(today, 21, 0, 22, 30),
      allergens: ['NUTS'],
      dietary: ['HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'گرم کردن کامل قبل از مصرف',
    },
  ];

  for (const item of listingsData) {
    const merchantRef = merchantIds[item.merchantKey];
    const categoryId = categories[item.categoryKey];

    if (!merchantRef || !categoryId) continue;

    const existingListing = await prisma.listing.findFirst({
      where: {
        merchantId: merchantRef.merchantId,
        titleFa: item.title,
      },
    });

    if (!existingListing) {
      await prisma.listing.create({
        data: {
          merchantId: merchantRef.merchantId,
          merchantLocationId: merchantRef.locationId,
          categoryId,
          type: item.type,
          titleFa: item.title,
          descriptionFa: item.desc,
          originalPriceToman: BigInt(item.origPrice),
          discountedPriceToman: BigInt(item.discPrice),
          pickupDate: item.date,
          pickupStart: item.window.start,
          pickupEnd: item.window.end,
          status: ListingStatus.PUBLISHED,
          inventory: {
            create: {
              totalQuantity: item.qty,
              reservedQuantity: 0,
              soldQuantity: 0,
              version: 1,
            },
          },
          safety: {
            create: {
              safetyStatus: SafetyStatus.APPROVED,
              allergens: item.allergens,
              dietaryTags: item.dietary,
              storageInstructionsFa: item.storage,
              temperatureRequirement: item.temp,
            },
          },
        },
      });
    }
  }

  console.log('✅ 25 Authentic Listings seeded across Urmia & Tehran');
  console.log('✨ Loqme database seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
