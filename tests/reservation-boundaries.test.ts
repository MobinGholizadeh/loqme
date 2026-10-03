import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { db, inventory } = vi.hoisted(() => ({
  db: { listing: { findUnique: vi.fn() }, reservation: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() }, $transaction: vi.fn() },
  inventory: { atomicReserve: vi.fn(), atomicRelease: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ prisma: db }));
vi.mock('@/domain/inventory/inventory.service', () => ({ inventoryService: inventory }));
import { ReservationService } from '@/domain/reservation/reservation.service';

describe('Reservation failure and expiry boundaries', () => {
  const now = new Date('2026-10-02T10:00:00Z');
  const service = new ReservationService();
  const hold = () => ({ id: 'hold', customerId: 'customer', listingId: 'listing', quantity: 2, status: 'PENDING', expiresAt: new Date(now.getTime() + 600000) });
  beforeEach(() => {
    vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    db.$transaction.mockImplementation(fn => fn(db));
    db.listing.findUnique.mockResolvedValue({ status: 'PUBLISHED', safety: { safetyStatus: 'APPROVED' }, pickupEnd: new Date(now.getTime() + 3600000) });
    db.reservation.findMany.mockResolvedValue([]); db.reservation.findFirst.mockResolvedValue(null);
    db.reservation.findUnique.mockImplementation(async () => hold());
    db.reservation.updateMany.mockResolvedValue({ count: 1 });
    db.reservation.create.mockImplementation(async ({ data }) => ({ id: 'new', ...data }));
    inventory.atomicReserve.mockResolvedValue({ success: true }); inventory.atomicRelease.mockResolvedValue({ success: true });
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
  it.each([0, -1, 6, 1.5, NaN, Infinity])('rejects quantity %s before touching inventory', async quantity => {
    expect((await service.createReservation({ customerId: 'customer', listingId: 'listing', quantity })).success).toBe(false);
    expect(inventory.atomicReserve).not.toHaveBeenCalled(); expect(db.reservation.findMany).not.toHaveBeenCalled();
  });
  it.each([null, { status: 'PAUSED' }, { status: 'PUBLISHED', safety: null }, { status: 'PUBLISHED', safety: { safetyStatus: 'APPROVED' }, pickupEnd: now }])('rejects ineligible listing %j', async listing => {
    db.listing.findUnique.mockResolvedValue(listing);
    expect((await service.createReservation({ customerId: 'customer', listingId: 'listing' })).success).toBe(false);
    expect(inventory.atomicReserve).not.toHaveBeenCalled();
  });
  it('returns an existing live hold without reserving again', async () => {
    db.reservation.findFirst.mockResolvedValue(hold());
    expect(await service.createReservation({ customerId: 'customer', listingId: 'listing' })).toMatchObject({ success: true, reservation: { id: 'hold', remainingSeconds: 600, quantity: 2 } });
    expect(inventory.atomicReserve).not.toHaveBeenCalled();
  });
  it.each(['stock unavailable', undefined])('preserves a failed reserve message or fallback: %s', async message => {
    inventory.atomicReserve.mockResolvedValue({ success: false, message });
    const result = await service.createReservation({ customerId: 'customer', listingId: 'listing' });
    expect(result.success).toBe(false); expect(result.message).toBeTruthy(); expect(db.reservation.create).not.toHaveBeenCalled();
  });
  it('creates a default one-unit hold with exactly ten minutes of expiry', async () => {
    expect(await service.createReservation({ customerId: 'customer', listingId: 'listing' })).toMatchObject({ success: true, reservation: { quantity: 1, remainingSeconds: 600, expiresAt: new Date(now.getTime() + 600000) } });
    expect(inventory.atomicReserve).toHaveBeenCalledWith('listing', 1);
  });
  it('releases the reserved inventory when persisting the hold fails', async () => {
    db.reservation.create.mockRejectedValue(new Error('database write failed'));
    expect((await service.createReservation({ customerId: 'customer', listingId: 'listing', quantity: 2 })).success).toBe(false);
    expect(inventory.atomicRelease).toHaveBeenCalledWith('listing', 2);
  });
  it('returns null for missing holds and computes live/finished countdowns', async () => {
    db.reservation.findUnique.mockResolvedValueOnce(null);
    expect(await service.getReservation('missing')).toBeNull();
    expect(await service.getReservation('hold')).toMatchObject({ remainingSeconds: 600, isExpired: false });
    db.reservation.findUnique.mockResolvedValueOnce({ ...hold(), status: 'CONFIRMED' });
    expect(await service.getReservation('hold')).toMatchObject({ remainingSeconds: 0, isExpired: false });
  });
  it('expires a pending hold at the exact boundary and releases it transactionally', async () => {
    db.reservation.findUnique.mockImplementation(async () => ({ ...hold(), expiresAt: now }));
    expect(await service.getReservation('hold')).toMatchObject({ status: 'EXPIRED', remainingSeconds: 0, isExpired: true });
    expect(db.reservation.updateMany).toHaveBeenCalledWith({ where: { id: 'hold', status: 'PENDING', expiresAt: { lte: now } }, data: { status: 'EXPIRED' } });
    expect(inventory.atomicRelease).toHaveBeenCalledWith('listing', 2, db);
  });
  it('counts only claimed expirations, tolerating deleted and already-claimed holds', async () => {
    db.reservation.findMany.mockResolvedValue([{ id: 'gone' }, { id: 'claimed' }, { id: 'pending' }]);
    db.reservation.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(hold()).mockResolvedValueOnce(hold());
    db.reservation.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    expect(await service.sweepExpiredReservations()).toBe(1);
    expect(inventory.atomicRelease).toHaveBeenCalledOnce();
  });
  it('rolls back release when the inventory does not match the hold', async () => {
    inventory.atomicRelease.mockResolvedValue({ success: false });
    await expect(service.cancelReservation('hold', 'customer')).rejects.toThrow('موجودی');
  });
  it.each([null, { ...{ customerId: 'other', status: 'PENDING' } }, { customerId: 'customer', status: 'CONFIRMED' }])('rejects unauthorized or finished cancellation %j', async value => {
    db.reservation.findUnique.mockResolvedValue(value);
    expect((await service.cancelReservation('hold', 'customer')).success).toBe(false);
    expect(db.reservation.updateMany).not.toHaveBeenCalled();
  });
  it('rejects a cancellation that loses its claim race', async () => {
    db.reservation.updateMany.mockResolvedValue({ count: 0 });
    expect((await service.cancelReservation('hold', 'customer')).success).toBe(false);
    expect(inventory.atomicRelease).not.toHaveBeenCalled();
  });
  it('cancels only the owned pending hold', async () => {
    expect((await service.cancelReservation('hold', 'customer')).success).toBe(true);
    expect(db.reservation.updateMany).toHaveBeenCalledWith({ where: { id: 'hold', status: 'PENDING' }, data: { status: 'RELEASED' } });
  });
});
