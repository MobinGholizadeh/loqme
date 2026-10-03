import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { db, storage } = vi.hoisted(() => ({
  db: { user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() }, merchant: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    merchantStaff: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), delete: vi.fn() }, merchantLocation: { update: vi.fn() }, merchantHours: { upsert: vi.fn() }, $transaction: vi.fn() },
  storage: { authorize: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ prisma: db })); vi.mock('@/domain/listing/image-storage', () => ({ listingImageStorage: storage }));
import { MerchantService } from '@/domain/merchant/merchant.service';
describe('Merchant membership and settings boundaries', () => {
  let service: MerchantService;
  const merchant = () => ({ id: 'merchant', ownerUserId: 'owner', businessNameFa: 'فروشگاه', commissionPercent: 0, staff: [], locations: [] });
  beforeEach(() => { vi.resetAllMocks(); service = new MerchantService(); db.user.findUnique.mockResolvedValue({ role: 'MERCHANT_OWNER', isActive: true }); db.merchant.findUnique.mockResolvedValue(merchant()); db.$transaction.mockImplementation(fn => fn(db)); });
  afterEach(() => vi.restoreAllMocks());
  it.each([null, { role: 'CUSTOMER', isActive: true }, { role: 'ADMIN', isActive: true }, { role: 'MERCHANT_OWNER', isActive: false }])('rejects non-merchant or inactive users %o', async user => {
    db.user.findUnique.mockResolvedValue(user); await expect(service.resolveMerchantAndAuthorize('owner', 'merchant')).rejects.toThrow('عدم دسترسی'); expect(db.merchant.findUnique).not.toHaveBeenCalled();
  });
  it('resolves an owned primary store or fails when no membership exists', async () => {
    db.merchant.findFirst.mockResolvedValueOnce({ id: 'merchant' }).mockResolvedValue(null);
    expect(await service.resolveMerchantAndAuthorize('owner')).toMatchObject({ isOwner: true, role: 'OWNER' });
    await expect(service.resolveMerchantAndAuthorize('owner')).rejects.toThrow('فروشگاهی');
    db.merchant.findUnique.mockResolvedValue(null); await expect(service.resolveMerchantAndAuthorize('owner', 'missing')).rejects.toThrow('یافت نشد');
  });
  it('resolves staff primary membership and enforces minimum role within that store', async () => {
    db.merchantStaff.findFirst.mockResolvedValue({ merchantId: 'merchant' }); db.merchant.findUnique.mockResolvedValue({ ...merchant(), staff: [{ id: 'staff', userId: 'cashier', role: 'CASHIER' }] });
    expect(await service.resolveMerchantAndAuthorize('cashier')).toMatchObject({ role: 'CASHIER', isOwner: false });
    await expect(service.resolveMerchantAndAuthorize('cashier', 'merchant', 'MANAGER')).rejects.toThrow('سطح دسترسی');
    await expect(service.resolveMerchantAndAuthorize('stranger', 'merchant')).rejects.toThrow('عضو کادر');
  });
  it('returns complete weekly defaults without inventing location data', async () => {
    const result = await service.getStoreSettings('owner', 'merchant'); expect(result.primaryLocation).toBeNull(); expect(result.hours).toHaveLength(7); expect(result.hours[6]).toMatchObject({ dayOfWeek: 6, isOpen: false });
  });
  it('preserves existing hours and location values including zero coordinates', async () => {
    db.merchant.findUnique.mockResolvedValue({ ...merchant(), locations: [{ id: 'location', latitude: 0, longitude: 0, city: { nameFa: 'ارومیه' }, hours: [{ dayOfWeek: 0, isOpen: true, storeOpenTime: '09:00', storeCloseTime: '20:00', defaultPickupStart: '18:00', defaultPickupEnd: '19:00' }] }] });
    const result = await service.getStoreSettings('owner', 'merchant'); expect(result.primaryLocation).toMatchObject({ latitude: 0, longitude: 0, cityNameFa: 'ارومیه' }); expect(result.hours[0]).toMatchObject({ storeOpenTime: '09:00', defaultPickupStart: '18:00' });
  });
  it('rejects foreign cover photos and propagates storage authorization failure', async () => {
    await expect(service.updateStoreSettings('owner', { bannerImageUrl: '/api/listing-images/foreign/photo' }, 'merchant')).rejects.toThrow(); expect(storage.authorize).not.toHaveBeenCalled();
    storage.authorize.mockRejectedValue(new Error('not owned')); await expect(service.updateStoreSettings('owner', { bannerImageUrl: '/api/listing-images/merchant/photo' }, 'merchant')).rejects.toThrow('not owned'); expect(db.merchant.update).not.toHaveBeenCalled();
  });
  it('updates an owned cover, trims its name, and atomically writes location and hours', async () => {
    db.merchant.findUnique.mockResolvedValue({ ...merchant(), locations: [{ id: 'location', hours: [] }] });
    const hours = [{ dayOfWeek: 1, isOpen: true, storeOpenTime: '09:00', storeCloseTime: '20:00', defaultPickupStart: null, defaultPickupEnd: null }];
    expect(await service.updateStoreSettings('owner', { businessNameFa: '  فروشگاه  ', bannerImageUrl: '/api/listing-images/merchant/photo', addressFa: 'نشانی', phone: null, postalCode: null, latitude: 0, longitude: 0, hours }, 'merchant')).toMatchObject({ success: true });
    expect(storage.authorize).toHaveBeenCalledWith('merchant', '/api/listing-images/merchant/photo'); expect(db.merchant.update).toHaveBeenCalledWith({ where: { id: 'merchant' }, data: { businessNameFa: 'فروشگاه', bannerImageUrl: '/api/listing-images/merchant/photo' } });
    expect(db.merchantLocation.update).toHaveBeenCalledWith({ where: { id: 'location' }, data: { addressFa: 'نشانی', phone: null, postalCode: null, latitude: 0, longitude: 0 } }); expect(db.merchantHours.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { merchantLocationId: 'location', ...hours[0] } }));
  });
  it('does not create a phantom location when editing a store without one', async () => {
    await service.updateStoreSettings('owner', {}, 'merchant'); expect(db.merchant.update).not.toHaveBeenCalled(); expect(db.merchantLocation.update).not.toHaveBeenCalled(); expect(db.merchantHours.upsert).not.toHaveBeenCalled();
  });
  it('lists staff names without requiring a customer profile', async () => {
    const createdAt = new Date(); db.merchantStaff.findMany.mockResolvedValue([{ id: 'one', userId: 'one', user: { mobile: '09121111111', customer: { fullName: 'همکار' } }, role: 'MANAGER', canScanPickup: true, createdAt }, { id: 'two', userId: 'two', user: { mobile: '09122222222' }, role: 'CASHIER', canScanPickup: false, createdAt }]);
    expect(await service.getStaffList('owner', 'merchant')).toMatchObject([{ fullName: 'همکار', canScanPickup: true }, { fullName: null, canScanPickup: false }]);
  });
  it.each([null, { merchantId: 'foreign' }, { merchantId: 'merchant', userId: 'owner', role: 'CASHIER' }, { merchantId: 'merchant', userId: 'other', role: 'OWNER' }])('does not revoke missing, foreign or owner memberships %o', async record => {
    db.merchantStaff.findUnique.mockResolvedValue(record); await expect(service.removeStaffMember('owner', 'staff', 'merchant')).rejects.toThrow(); expect(db.merchantStaff.delete).not.toHaveBeenCalled();
  });
  it('revokes a staff membership within the selected store', async () => {
    db.merchantStaff.findUnique.mockResolvedValue({ merchantId: 'merchant', userId: 'staff-user', role: 'CASHIER' }); expect(await service.removeStaffMember('owner', 'staff', 'merchant')).toMatchObject({ success: true }); expect(db.merchantStaff.delete).toHaveBeenCalledWith({ where: { id: 'staff' } });
  });
});
