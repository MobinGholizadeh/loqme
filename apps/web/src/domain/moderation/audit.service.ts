import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export interface LogActionParams {
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string;
  actorRole?: Role;
  details?: Record<string, any>;
  ipAddress?: string;
}

export interface ListAuditLogsFilters {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

export class AuditService {
  /**
   * Records an immutable audit log entry for safety, moderation, or financial actions.
   */
  async logAction(params: LogActionParams) {
    const { action, entityType, entityId, actorId, actorRole, details, ipAddress } = params;

    return prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        actorId,
        actorRole,
        detailsJson: details ?? {},
        ipAddress,
      },
    });
  }

  /**
   * Retrieves paginated audit logs with optional filters.
   */
  async listAuditLogs(filters: ListAuditLogsFilters = {}) {
    const { entityType, entityId, actorId, action, limit = 50, offset = 0 } = filters;

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          actor: {
            select: {
              id: true,
              mobile: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      limit,
      offset,
    };
  }
}

export const auditService = new AuditService();
