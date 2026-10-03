import { beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ listingInventory: { findUnique: vi.fn() }, $executeRaw: vi.fn(), $transaction: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: db }));
import { InventoryService } from '@/domain/inventory/inventory.service';

describe('Inventory bounds and transaction propagation', () => {
  const service = new InventoryService();
  beforeEach(() => { vi.resetAllMocks(); db.$transaction.mockImplementation(fn => fn(db)); db.$executeRaw.mockResolvedValue(1); });
  it('handles absent records and clamps oversubscribed availability to zero', async () => {
    db.listingInventory.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    expect(await service.getInventory('missing')).toBeNull(); expect(await service.checkAvailability('missing', 1)).toBe(false);
    db.listingInventory.findUnique.mockResolvedValue({ totalQuantity: 2, reservedQuantity: 2, soldQuantity: 1 });
    expect(await service.getInventory('listing')).toMatchObject({ availableQuantity: 0, isSoldOut: true });
    db.listingInventory.findUnique.mockResolvedValue({ totalQuantity: 5, reservedQuantity: 1, soldQuantity: 1 });
    expect(await service.checkAvailability('listing', 3)).toBe(true); expect(await service.checkAvailability('listing', 4)).toBe(false);
  });
  it.each([0, -1, 0.5, NaN, Infinity])('rejects invalid quantities %s without database writes', async quantity => {
    expect((await service.atomicReserve('listing', quantity)).success).toBe(false);
    expect((await service.atomicRelease('listing', quantity)).success).toBe(false);
    expect((await service.atomicConfirmSold('listing', quantity)).success).toBe(false);
    expect(db.$executeRaw).not.toHaveBeenCalled();
  });
  it.each([0, 1])('interprets affected-row count %s for atomic updates', async count => {
    db.$executeRaw.mockResolvedValue(count);
    expect((await service.atomicReserve('listing', 1)).success).toBe(count > 0);
    expect((await service.atomicRelease('listing', 1)).success).toBe(count > 0);
    expect((await service.atomicConfirmSold('listing', 1)).success).toBe(count > 0);
  });
  it('uses an existing transaction for releases and does not nest one', async () => {
    const tx = { $executeRaw: vi.fn().mockResolvedValue(1) };
    expect(await service.atomicRelease('listing', 1, tx as never)).toEqual({ success: true });
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2); expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('propagates a failed write so the caller can roll back', async () => {
    const error = new Error('Database unavailable'); db.$executeRaw.mockRejectedValue(error);
    await expect(service.atomicConfirmSold('listing', 1)).rejects.toBe(error);
  });
  it.each([0, -1, 1.5, NaN])('does not advertise availability for invalid quantity %s', async quantity => {
    db.listingInventory.findUnique.mockResolvedValue({ totalQuantity: 5, reservedQuantity: 0, soldQuantity: 0 });
    expect(await service.checkAvailability('listing', quantity)).toBe(false);
  });
});
