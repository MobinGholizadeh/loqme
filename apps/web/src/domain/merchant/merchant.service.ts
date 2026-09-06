import { prisma } from '@/lib/prisma';
import { BusinessType, VerificationStatus, StaffRole, Prisma } from '@prisma/client';
import { CreateMerchantInput, CreateMerchantSchema } from '@loqme/validation';
import { NearbyMerchantQuery } from '@loqme/types';

export interface NearbyLocationResult {
  id: string;
  merchantId: string;
  cityId: string;
  neighborhoodId: string | null;
  addressFa: string;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
  distanceMeters: number;
  businessNameFa: string;
  businessType: BusinessType;
  ratingAverage: number;
  ratingCount: number;
  verificationStatus: VerificationStatus;
}

export class MerchantService {
  /**
   * Creates a new merchant profile with primary location and initial owner staff role
   */
  async createMerchant(input: CreateMerchantInput) {
    const validated = CreateMerchantSchema.parse(input);

    return await prisma.$transaction(async (tx) => {
      // 1. Create Merchant
      const merchant = await tx.merchant.create({
        data: {
          ownerUserId: validated.ownerUserId,
          businessNameFa: validated.businessNameFa,
          businessType: validated.businessType as BusinessType,
          licenseNumber: validated.licenseNumber,
          commissionPercent: validated.commissionPercent,
          verificationStatus: VerificationStatus.PENDING,
          staff: {
            create: {
              userId: validated.ownerUserId,
              role: StaffRole.OWNER,
              canScanPickup: true,
            },
          },
        },
      });

      // 2. Create primary store location
      const location = await tx.merchantLocation.create({
        data: {
          merchantId: merchant.id,
          cityId: validated.location.cityId,
          neighborhoodId: validated.location.neighborhoodId,
          addressFa: validated.location.addressFa,
          postalCode: validated.location.postalCode,
          latitude: validated.location.latitude,
          longitude: validated.location.longitude,
          phone: validated.location.phone,
        },
      });

      return {
        ...merchant,
        locations: [location],
      };
    });
  }

  /**
   * Fetches a merchant with locations, hours, and staff
   */
  async getMerchantById(id: string) {
    return await prisma.merchant.findUnique({
      where: { id },
      include: {
        locations: {
          include: {
            city: true,
            neighborhood: true,
            hours: true,
          },
        },
        staff: {
          include: {
            user: true,
          },
        },
        listings: {
          where: { status: 'PUBLISHED' },
          include: {
            inventory: true,
            safety: true,
            category: true,
          },
        },
      },
    });
  }

  /**
   * Lists merchants with optional filters
   */
  async listMerchants(options?: {
    businessType?: BusinessType;
    verificationStatus?: VerificationStatus;
    limit?: number;
  }) {
    return await prisma.merchant.findMany({
      where: {
        businessType: options?.businessType,
        verificationStatus: options?.verificationStatus,
      },
      include: {
        locations: {
          include: {
            city: true,
            neighborhood: true,
          },
        },
      },
      take: options?.limit ?? 50,
      orderBy: { ratingAverage: 'desc' },
    });
  }

  /**
   * Finds store locations nearby using PostGIS ST_DWithin and calculates exact distance with ST_Distance
   */
  async findNearby(query: NearbyMerchantQuery): Promise<NearbyLocationResult[]> {
    const radiusMeters = query.radiusMeters ?? 5000;
    const limit = query.limit ?? 20;

    let businessTypeFilter = Prisma.empty;
    if (query.businessType) {
      businessTypeFilter = Prisma.sql`AND m."businessType" = ${query.businessType}::"BusinessType"`;
    }

    const results = await prisma.$queryRaw<NearbyLocationResult[]>`
      SELECT 
        ml.id,
        ml."merchantId",
        ml."cityId",
        ml."neighborhoodId",
        ml."addressFa",
        ml."postalCode",
        ml.latitude,
        ml.longitude,
        ml.phone,
        ROUND(ST_Distance(ml.geom, ST_SetSRID(ST_MakePoint(${query.longitude}, ${query.latitude}), 4326)::geography)::numeric, 1)::float as "distanceMeters",
        m."businessNameFa",
        m."businessType",
        m."ratingAverage",
        m."ratingCount",
        m."verificationStatus"
      FROM "MerchantLocation" ml
      JOIN "Merchant" m ON m.id = ml."merchantId"
      WHERE ml.geom IS NOT NULL
        AND ST_DWithin(ml.geom, ST_SetSRID(ST_MakePoint(${query.longitude}, ${query.latitude}), 4326)::geography, ${radiusMeters})
        AND m."verificationStatus" = 'APPROVED'::"VerificationStatus"
        ${businessTypeFilter}
      ORDER BY "distanceMeters" ASC
      LIMIT ${limit};
    `;

    return results;
  }

  /**
   * Updates merchant verification status (Admin moderation)
   */
  async updateVerificationStatus(merchantId: string, status: VerificationStatus) {
    return await prisma.merchant.update({
      where: { id: merchantId },
      data: { verificationStatus: status },
    });
  }
}

export const merchantService = new MerchantService();
