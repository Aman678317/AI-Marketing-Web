import { withDb } from '@/lib/prisma';

export async function audit(action: string, entity: string, entityId: string, userId?: string, meta?: any) {
  await withDb(
    (db) =>
      db.auditLog.create({
        data: { action, entity, entityId, userId, meta }
      }),
    null
  );
}
