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
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.DATABASE_MIGRATION_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/loqme?schema=public';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

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

  const urmiaMerchantOwner = await prisma.user.upsert({
    where: { mobile: '09142222222' },
    update: { role: Role.MERCHANT_OWNER, isActive: true },
    create: {
      mobile: '09142222222',
      role: Role.MERCHANT_OWNER,
      customer: {
        create: {
          fullName: 'علی رضایی (ارومیه)',
        },
      },
    },
  });
  console.log('✅ Urmia Merchant Owner seeded:', urmiaMerchantOwner.mobile);

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
    } else {
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: { ownerUserId: ownerUser.id },
      });
      const ownerStaff = await prisma.merchantStaff.findFirst({
        where: { merchantId: merchant.id, role: StaffRole.OWNER },
      });
      if (ownerStaff) {
        await prisma.merchantStaff.update({
          where: { id: ownerStaff.id },
          data: { userId: ownerUser.id, canScanPickup: true },
        });
      } else {
        await prisma.merchantStaff.create({
          data: {
            merchantId: merchant.id,
            userId: ownerUser.id,
            role: StaffRole.OWNER,
            canScanPickup: true,
          },
        });
      }

      if (!locationId) {
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
    }

    merchantIds[m.idKey] = {
      merchantId: merchant.id,
      locationId: locationId!,
    };

    if (i === 0) {
      await prisma.merchantStaff.upsert({
        where: {
          merchantId_userId: {
            merchantId: merchant.id,
            userId: urmiaMerchantOwner.id,
          },
        },
        update: { role: StaffRole.OWNER, canScanPickup: true },
        create: {
          merchantId: merchant.id,
          userId: urmiaMerchantOwner.id,
          role: StaffRole.OWNER,
          canScanPickup: true,
        },
      });
    }
  }
  console.log('✅ 12 Local Merchants & Locations seeded in Urmia & Tehran');

  // ==========================================
  // 5. Authentic Surplus Listings with Images
  // ==========================================
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const makeWindow = (baseDate: Date, startHour: number, startMin: number, endHour: number, endMin: number) => {
    const start = new Date(baseDate);
    start.setHours(startHour, startMin, 0, 0);
    const end = new Date(baseDate);
    end.setDate(end.getDate() + 30);
    end.setHours(endHour, endMin, 0, 0);
    return { start, end };
  };

  // Only retain seed listings that have verified images
  const listingsData = [
    // --- رستوران سنتی و کترینگ دیاکو ارومیه (استادان) ---
    {
      merchantKey: 'diako_urmia',
      categoryKey: 'restaurant',
      type: ListingType.SURPRISE_BAG,
      title: 'بسته شگفت‌انگیز چلوکباب کوبیده زعفرانی و جوجه مخصوص',
      desc: 'شامل دو سیخ کباب کوبیده سنتی گوسفندی و یک سیخ جوجه‌کباب زعفرانی همراه با دیس چلو کره ایرانی، گوجه کبابی تازه و مخلفات اصیل مطبخ دیاکو.',
      origPrice: 360000,
      discPrice: 155000,
      qty: 6,
      date: today,
      window: makeWindow(today, 19, 0, 22, 30),
      imageUrl: '/images/listings/chelo-kabab.jpg',
      allergens: ['DAIRY'],
      dietary: ['HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'نگهداری در یخچال و گرم کردن کامل قبل از مصرف',
    },
    {
      merchantKey: 'diako_urmia',
      categoryKey: 'restaurant',
      type: ListingType.FLASH_DEAL,
      title: 'خوراک زرشک‌پلو با ران مرغ مجلسی و ته‌دیگ زعفرانی',
      desc: 'خوراک مرغ زعفرانی با سس غلیظ و پلو طارم ایرانی همراه با زرشک اعلا، خلال پسته و ته‌دیگ طلایی ترد پخت ظهر رستوران دیاکو.',
      origPrice: 290000,
      discPrice: 128000,
      qty: 5,
      date: today,
      window: makeWindow(today, 18, 30, 21, 30),
      imageUrl: '/images/listings/zereshk-polo.jpg',
      allergens: ['NUTS'],
      dietary: ['HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'نگهداری در یخچال و گرم کردن کامل قبل از مصرف',
    },
    {
      merchantKey: 'diako_urmia',
      categoryKey: 'restaurant',
      type: ListingType.SURPRISE_BAG,
      title: 'بسته شگفت‌انگیز خورش قورمه‌سبزی جاافتاده با پلو زعفرانی',
      desc: 'بسته سورپرایز روز دیاکو شامل یک پرس خورش قورمه‌سبزی جاافتاده با گوشت تازه گوسفندی و لوبیا قرمز همراه با کته زعفرانی معطر و ته‌دیگ ترد.',
      origPrice: 310000,
      discPrice: 135000,
      qty: 4,
      date: today,
      window: makeWindow(today, 19, 30, 22, 0),
      imageUrl: '/images/listings/ghormeh-sabzi.jpg',
      allergens: [],
      dietary: ['HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'گرم کردن کامل تا دمای داغ قبل از سرو',
    },
    {
      merchantKey: 'diako_urmia',
      categoryKey: 'restaurant',
      type: ListingType.FLASH_DEAL,
      title: 'سینی مزه و پیش‌غذای سنتی ارومیه (کشک بادمجان، میرزاقاسمی و بورانی)',
      desc: 'سینی لذیذ پیش‌غذاهای اصیل شامل کشک بادمجان با پیازداغ و نعناداغ، میرزاقاسمی ذغالی و ماست چکیده محلی همراه با نان بربری داغ.',
      origPrice: 240000,
      discPrice: 98000,
      qty: 8,
      date: today,
      window: makeWindow(today, 18, 0, 21, 0),
      imageUrl: '/images/listings/persian-appetizers.jpg',
      allergens: ['DAIRY', 'NUTS'],
      dietary: ['VEGETARIAN', 'HALAL'],
      temp: TemperatureRequirement.CHILLED,
      storage: 'در یخچال در ظرف دربسته نگهداری شود',
    },
  ];

  // Purge any existing seed/legacy listings that do not have images
  await prisma.listing.deleteMany({
    where: {
      images: { none: {} },
      orderItems: { none: {} },
      reservations: { none: {} },
    },
  });

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

    if (existingListing) {
      await prisma.listing.update({
        where: { id: existingListing.id },
        data: {
          pickupDate: item.date,
          pickupStart: item.window.start,
          pickupEnd: item.window.end,
          status: ListingStatus.PUBLISHED,
        },
      });
      await prisma.listingImage.deleteMany({ where: { listingId: existingListing.id } });
      await prisma.listingImage.create({
        data: {
          listingId: existingListing.id,
          imageUrl: item.imageUrl,
          displayOrder: 0,
          isPrimary: true,
        },
      });
    } else {
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
          images: {
            create: {
              imageUrl: item.imageUrl,
              displayOrder: 0,
              isPrimary: true,
            },
          },
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

  console.log(`✅ ${listingsData.length} Authentic Listings with images seeded across Urmia`);
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
