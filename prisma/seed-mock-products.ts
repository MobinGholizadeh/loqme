import { PrismaClient, ListingType, ListingStatus, SafetyStatus, TemperatureRequirement } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🥘 Seeding mocked surplus products with images for restaurant...');

  // Find Diako restaurant
  const diako = await prisma.merchant.findFirst({
    where: {
      businessNameFa: { contains: 'دیاکو' },
    },
    include: {
      locations: true,
    },
  });

  if (!diako) {
    throw new Error('Restaurant Diako not found in database!');
  }

  const locationId = diako.locations[0]?.id;
  if (!locationId) {
    throw new Error('Diako location not found in database!');
  }

  // Find restaurant category
  const restaurantCat = await prisma.category.findUnique({
    where: { slug: 'restaurant' },
  });

  if (!restaurantCat) {
    throw new Error('Restaurant category not found in database!');
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Function to create unexpired window with realistic pickup hours
  const createWindow = (startHour: number, startMin: number, endHour: number, endMin: number) => {
    const start = new Date(today);
    start.setHours(startHour, startMin, 0, 0);
    const end = new Date(today);
    // 30 days into future so dev preview never expires
    end.setDate(end.getDate() + 30);
    end.setHours(endHour, endMin, 0, 0);
    return { start, end };
  };

  const mockProducts = [
    {
      type: ListingType.SURPRISE_BAG,
      title: 'بسته شگفت‌انگیز چلوکباب کوبیده زعفرانی و جوجه مخصوص',
      desc: 'شامل دو سیخ کباب کوبیده سنتی گوسفندی و یک سیخ جوجه‌کباب زعفرانی همراه با دیس چلو کره ایرانی، گوجه کبابی تازه و مخلفات اصیل مطبخ دیاکو.',
      origPrice: 360000,
      discPrice: 155000,
      qty: 6,
      window: createWindow(19, 0, 22, 30),
      imageUrl: '/images/listings/chelo-kabab.jpg',
      allergens: ['DAIRY'],
      dietary: ['HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'نگهداری در یخچال و گرم کردن کامل قبل از مصرف',
    },
    {
      type: ListingType.FLASH_DEAL,
      title: 'خوراک زرشک‌پلو با ران مرغ مجلسی و ته‌دیگ زعفرانی',
      desc: 'خوراک مرغ زعفرانی با سس غلیظ و پلو طارم ایرانی همراه با زرشک اعلا، خلال پسته و ته‌دیگ طلایی ترد پخت ظهر رستوران دیاکو.',
      origPrice: 290000,
      discPrice: 128000,
      qty: 5,
      window: createWindow(18, 30, 21, 30),
      imageUrl: '/images/listings/zereshk-polo.jpg',
      allergens: ['NUTS'],
      dietary: ['HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'نگهداری در یخچال و گرم کردن قبل از مصرف',
    },
    {
      type: ListingType.SURPRISE_BAG,
      title: 'بسته شگفت‌انگیز خورش قورمه‌سبزی جاافتاده با پلو زعفرانی',
      desc: 'بسته سورپرایز روز دیاکو شامل یک پرس خورش قورمه‌سبزی جاافتاده با گوشت تازه گوسفندی و لوبیا قرمز همراه با کته زعفرانی معطر و ته‌دیگ ترد.',
      origPrice: 310000,
      discPrice: 135000,
      qty: 4,
      window: createWindow(19, 30, 22, 0),
      imageUrl: '/images/listings/ghormeh-sabzi.jpg',
      allergens: [],
      dietary: ['HALAL'],
      temp: TemperatureRequirement.ROOM_TEMP,
      storage: 'گرم کردن کامل تا دمای داغ قبل از سرو',
    },
    {
      type: ListingType.FLASH_DEAL,
      title: 'سینی مزه و پیش‌غذای سنتی ارومیه (کشک بادمجان، میرزاقاسمی و بورانی)',
      desc: 'سینی لذیذ پیش‌غذاهای اصیل شامل کشک بادمجان با پیازداغ و نعناداغ، میرزاقاسمی ذغالی و ماست چکیده محلی همراه با نان بربری داغ.',
      origPrice: 240000,
      discPrice: 98000,
      qty: 8,
      window: createWindow(18, 0, 21, 0),
      imageUrl: '/images/listings/persian-appetizers.jpg',
      allergens: ['DAIRY', 'NUTS'],
      dietary: ['VEGETARIAN', 'HALAL'],
      temp: TemperatureRequirement.CHILLED,
      storage: 'در یخچال در ظرف دربسته نگهداری شود',
    },
  ];

  for (const prod of mockProducts) {
    // Check if listing with same title exists
    const existing = await prisma.listing.findFirst({
      where: {
        merchantId: diako.id,
        titleFa: prod.title,
      },
      include: {
        images: true,
        inventory: true,
      },
    });

    let listingId: string;

    if (existing) {
      console.log(`Updating existing listing: ${prod.title}`);
      await prisma.listing.update({
        where: { id: existing.id },
        data: {
          descriptionFa: prod.desc,
          originalPriceToman: BigInt(prod.origPrice),
          discountedPriceToman: BigInt(prod.discPrice),
          pickupDate: today,
          pickupStart: prod.window.start,
          pickupEnd: prod.window.end,
          status: ListingStatus.PUBLISHED,
          type: prod.type,
          categoryId: restaurantCat.id,
          merchantLocationId: locationId,
        },
      });
      listingId = existing.id;

      if (existing.inventory) {
        await prisma.listingInventory.update({
          where: { listingId },
          data: {
            totalQuantity: prod.qty,
            reservedQuantity: 0,
            soldQuantity: 0,
          },
        });
      }

      await prisma.listingSafety.upsert({
        where: { listingId },
        update: {
          safetyStatus: SafetyStatus.APPROVED,
          allergens: prod.allergens,
          dietaryTags: prod.dietary,
          storageInstructionsFa: prod.storage,
          temperatureRequirement: prod.temp,
        },
        create: {
          listingId,
          safetyStatus: SafetyStatus.APPROVED,
          allergens: prod.allergens,
          dietaryTags: prod.dietary,
          storageInstructionsFa: prod.storage,
          temperatureRequirement: prod.temp,
        },
      });
    } else {
      console.log(`Creating new listing: ${prod.title}`);
      const created = await prisma.listing.create({
        data: {
          merchantId: diako.id,
          merchantLocationId: locationId,
          categoryId: restaurantCat.id,
          type: prod.type,
          titleFa: prod.title,
          descriptionFa: prod.desc,
          originalPriceToman: BigInt(prod.origPrice),
          discountedPriceToman: BigInt(prod.discPrice),
          pickupDate: today,
          pickupStart: prod.window.start,
          pickupEnd: prod.window.end,
          status: ListingStatus.PUBLISHED,
          inventory: {
            create: {
              totalQuantity: prod.qty,
              reservedQuantity: 0,
              soldQuantity: 0,
              version: 1,
            },
          },
          safety: {
            create: {
              safetyStatus: SafetyStatus.APPROVED,
              allergens: prod.allergens,
              dietaryTags: prod.dietary,
              storageInstructionsFa: prod.storage,
              temperatureRequirement: prod.temp,
            },
          },
        },
      });
      listingId = created.id;
    }

    // Upsert primary image
    await prisma.listingImage.deleteMany({
      where: { listingId },
    });

    await prisma.listingImage.create({
      data: {
        listingId,
        imageUrl: prod.imageUrl,
        displayOrder: 0,
        isPrimary: true,
      },
    });
    console.log(`✅ Attached image ${prod.imageUrl} to listing ${prod.title}`);
  }

  console.log('🎉 Successfully seeded mocked restaurant surplus products with images!');
}

main()
  .catch((e) => {
    console.error('Error seeding products:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
