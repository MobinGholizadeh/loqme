import { PrismaClient, Role, BusinessType, VerificationStatus, StaffRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Loqme database...');

  // 1. Customer User
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

  // 2. Merchant Owner User & Store
  const merchantOwner = await prisma.user.upsert({
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

  const existingStore = await prisma.merchant.findFirst({
    where: { ownerUserId: merchantOwner.id },
  });

  if (!existingStore) {
    const store = await prisma.merchant.create({
      data: {
        ownerUserId: merchantOwner.id,
        businessNameFa: 'نانوایی و شیرینی سنتی برکت',
        businessType: BusinessType.BAKERY,
        verificationStatus: VerificationStatus.APPROVED,
        ratingAverage: 4.85,
        ratingCount: 142,
        staff: {
          create: {
            userId: merchantOwner.id,
            role: StaffRole.OWNER,
            canScanPickup: true,
          },
        },
      },
    });
    console.log('✅ Merchant seeded:', store.businessNameFa);
  }

  // 3. Admin User
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

  console.log('✨ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
