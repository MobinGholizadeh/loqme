import { beforeEach, describe, expect, it, vi } from 'vitest';
const { db, payment } = vi.hoisted(() => ({
  db: { order: { findUnique: vi.fn() }, review: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), aggregate: vi.fn(), findMany: vi.fn(), count: vi.fn() }, merchant: { update: vi.fn() }, merchantStaff: { findUnique: vi.fn() },
    complaint: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), findMany: vi.fn() }, listing: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() }, listingSafety: { upsert: vi.fn(), updateMany: vi.fn() },
    auditLog: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() }, $transaction: vi.fn(), $queryRaw: vi.fn(),
  }, payment: { refundPayment: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ prisma: db })); vi.mock('@/domain/payment/payment.service', () => ({ paymentService: payment }));
import { ModerationService } from '@/domain/moderation/moderation.service';
import { AuditService } from '@/domain/moderation/audit.service';
describe('Moderation and audit boundaries', () => {
  const service = new ModerationService(); const audit = new AuditService();
  const order = () => ({ id: 'order', customerId: 'customer', merchantId: 'merchant', status: 'COMPLETED', review: null, merchant: {} });
  const complaint = () => ({ id: 'complaint', status: 'PENDING', order: { payments: [{ id: 'payment', amountToman: 100n }] } });
  beforeEach(() => {
    vi.resetAllMocks(); db.$transaction.mockImplementation(fn => fn(db)); db.order.findUnique.mockResolvedValue(order());
    db.review.create.mockResolvedValue({ id: 'review' }); db.review.aggregate.mockResolvedValue({ _avg: { overallRating: null }, _count: { id: 0 } });
    db.complaint.create.mockResolvedValue({ id: 'complaint' }); db.complaint.findUnique.mockResolvedValue(complaint()); db.complaint.count.mockResolvedValue(0);
    db.listing.findUnique.mockResolvedValue({ id: 'listing', safety: { safetyStatus: 'APPROVED' } }); db.listingSafety.upsert.mockResolvedValue({ id: 'safety' });
  });
  it.each([null, { ...order(), customerId: 'other' }, { ...order(), status: 'READY_FOR_PICKUP' }, { ...order(), review: { id: 'previous' } }])('rejects review creation outside a unique completed purchase (%o)', async record => {
    db.order.findUnique.mockResolvedValue(record); await expect(service.submitReview('customer', 'order', { orderId: 'order', overallRating: 5 })).rejects.toThrow(); expect(db.review.create).not.toHaveBeenCalled();
  });
  it('rejects invalid scores and normalizes optional review fields without fabricating scores', async () => {
    await expect(service.submitReview('customer', 'order', { orderId: 'order', overallRating: 7 })).rejects.toThrow();
    await service.submitReview('customer', 'order', { orderId: 'order', overallRating: 4, commentFa: '  ' });
    expect(db.review.create).toHaveBeenCalledWith({ data: expect.objectContaining({ commentFa: null, qualityRating: null, collectionRating: null, varietyRating: null, quantityRating: null }) });
    expect(db.merchant.update).toHaveBeenCalledWith({ where: { id: 'merchant' }, data: { ratingAverage: 0, ratingCount: 0 } });
  });
  it('rejects missing reviews and replies from another merchant', async () => {
    db.review.findUnique.mockResolvedValueOnce(null).mockResolvedValue({ id: 'review', merchantId: 'merchant', merchant: { ownerUserId: 'owner' } });
    await expect(service.replyToReview('other', 'review', 'reply')).rejects.toThrow(); await expect(service.replyToReview('other', 'review', 'reply')).rejects.toThrow(); expect(db.review.update).not.toHaveBeenCalled();
  });
  it.each(['owner', 'staff'])('trims and audits an authorized %s reply', async actor => {
    db.review.findUnique.mockResolvedValue({ id: 'review', merchantId: 'merchant', merchant: { ownerUserId: 'owner' } });
    db.merchantStaff.findUnique.mockResolvedValue(actor === 'staff' ? { id: 'staff' } : null);
    await service.replyToReview(actor, 'review', '  پاسخ  ');
    expect(db.review.update).toHaveBeenCalledWith({ where: { id: 'review' }, data: { merchantReplyFa: 'پاسخ', merchantReplyAt: expect.any(Date) } });
    expect(db.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ actorId: actor, actorRole: actor === 'owner' ? 'MERCHANT_OWNER' : 'MERCHANT_STAFF', action: 'REVIEW_REPLIED' }) });
  });
  it.each([null, { ...order(), customerId: 'other' }])('rejects complaints without purchase ownership (%o)', async record => {
    db.order.findUnique.mockResolvedValue(record); await expect(service.submitComplaint('customer', 'order', { orderId: 'order', category: 'OTHER', descriptionFa: 'مورد آزمایش' })).rejects.toThrow(); expect(db.complaint.create).not.toHaveBeenCalled();
  });
  it.each([['OTHER', 0, false], ['EXPIRED_FOOD', 1, false], ['SPOILED_FOOD', 2, true]] as const)('applies safety escalation for %s at %s reports', async (category, count, restricted) => {
    db.complaint.count.mockResolvedValue(count);
    await service.submitComplaint('customer', 'order', { orderId: 'order', category, descriptionFa: '  شرح آزمایش  ', ...(count ? { evidencePhotos: ['/uploads/photo'] } : {}) });
    expect(db.complaint.create).toHaveBeenCalledWith({ data: expect.objectContaining({ category, descriptionFa: 'شرح آزمایش', evidencePhotos: count ? ['/uploads/photo'] : [] }) });
    expect(db.listingSafety.updateMany).toHaveBeenCalledTimes(restricted ? 1 : 0); expect(db.listing.updateMany).toHaveBeenCalledTimes(restricted ? 1 : 0);
  });
  it.each([undefined, { status: 'PENDING', category: 'EXPIRED_FOOD', merchantId: 'merchant', limit: 5, offset: 2 }] as const)('paginates complaint queries using the supplied filters (%o)', async filters => {
    db.complaint.findMany.mockResolvedValue([{ id: 'complaint' }]); db.complaint.count.mockResolvedValue(1);
    const result = await service.listComplaints(filters); expect(result).toMatchObject({ total: 1, limit: filters?.limit ?? 50, offset: filters?.offset ?? 0 });
    expect(db.complaint.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: filters ? { status: 'PENDING', category: 'EXPIRED_FOOD', merchantId: 'merchant' } : {} }));
  });
  it.each([null, { ...complaint(), status: 'RESOLVED_REJECTED' }])('rejects resolution of missing or closed complaints (%o)', async record => {
    db.complaint.findUnique.mockResolvedValue(record); await expect(service.resolveComplaint('admin', 'complaint', { action: 'REJECT' })).rejects.toThrow(); expect(db.complaint.update).not.toHaveBeenCalled();
  });
  it.each(['REJECT', 'WARNING'] as const)('records a %s decision and its actor', async action => {
    db.complaint.findUnique.mockResolvedValue({ ...complaint(), status: 'INVESTIGATING' }); await service.resolveComplaint('admin', 'complaint', { action, notesFa: 'بررسی شد' });
    expect(db.complaint.update).toHaveBeenCalledWith({ where: { id: 'complaint' }, data: expect.objectContaining({ status: action === 'REJECT' ? 'RESOLVED_REJECTED' : 'RESOLVED_WARNING', resolvedByUserId: 'admin', adminNotesFa: 'بررسی شد' }) }); expect(payment.refundPayment).not.toHaveBeenCalled();
  });
  it('cannot refund without a successful payment or an accepted provider result', async () => {
    db.complaint.findUnique.mockResolvedValueOnce({ ...complaint(), order: { payments: [] } }); await expect(service.resolveComplaint('admin', 'complaint', { action: 'REFUND' })).rejects.toThrow(); expect(payment.refundPayment).not.toHaveBeenCalled();
    payment.refundPayment.mockResolvedValueOnce({ success: false, errorMessage: 'declined' }).mockResolvedValueOnce({ success: false });
    await expect(service.resolveComplaint('admin', 'complaint', { action: 'REFUND' })).rejects.toThrow('declined'); await expect(service.resolveComplaint('admin', 'complaint', { action: 'REFUND' })).rejects.toThrow(); expect(db.complaint.update).not.toHaveBeenCalled();
  });
  it.each([undefined, 100])('links the successful refund with amount %s to the complaint', async refundAmountToman => {
    payment.refundPayment.mockResolvedValue({ success: true, refund: { id: 'refund' } });
    await service.resolveComplaint('admin', 'complaint', { action: 'REFUND', refundAmountToman });
    expect(payment.refundPayment).toHaveBeenCalledWith(expect.objectContaining({ amountToman: 100, paymentId: 'payment', processedByUserId: 'admin' })); expect(db.complaint.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ refundId: 'refund', status: 'RESOLVED_REFUNDED' }) }));
  });
  it.each(['APPROVED', 'RESTRICTED'] as const)('updates listing safety to %s and pauses unsafe offers', async status => {
    db.listing.findUnique.mockResolvedValue({ id: 'listing', safety: null }); await service.updateListingSafetyStatus('admin', 'listing', status, 'reason');
    expect(db.listingSafety.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { safetyStatus: status } })); expect(db.listing.update).toHaveBeenCalledTimes(status === 'APPROVED' ? 0 : 1);
  });
  it('rejects safety overrides for unknown listings', async () => {
    db.listing.findUnique.mockResolvedValue(null); await expect(service.updateListingSafetyStatus('admin', 'listing', 'RESTRICTED')).rejects.toThrow(); expect(db.listingSafety.upsert).not.toHaveBeenCalled();
  });
  it.each([undefined, { entityType: 'Order', entityId: 'order', actorId: 'admin', action: 'REFUND', limit: 3, offset: 2 }])('filters and paginates immutable audit records (%o)', async filters => {
    db.auditLog.findMany.mockResolvedValue([{ id: 'event' }]); db.auditLog.count.mockResolvedValue(1);
    expect(await audit.listAuditLogs(filters)).toEqual({ items: [{ id: 'event' }], total: 1, limit: filters?.limit ?? 50, offset: filters?.offset ?? 0 });
    expect(db.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: filters ? { entityType: 'Order', entityId: 'order', actorId: 'admin', action: 'REFUND' } : {} }));
  });
  it('stores an empty detail object when an audit event has no optional details', async () => {
    await audit.logAction({ action: 'ACTION', entityType: 'Order', entityId: 'order' }); expect(db.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ detailsJson: {} }) });
  });
});
