import type { Row } from "@/lib/server/templates/legacy-migration/types";
import { remapIds } from "@/lib/server/templates/remap-ids";

export interface NotificationKey { userId: string; type: string; refId: string }

const keyOf = (n: NotificationKey) => `${n.userId}\u0000${n.type}\u0000${n.refId}`;

/** Notifications whose remapped (userId, type, refId) would break the global unique key; the first claimant wins, rows that keep their refId claim first. */
export function collidingNotifications(args: { rows: Row[]; idMap: ReadonlyMap<string, string>; existing: readonly NotificationKey[] }): Row[] {
  const claimed = new Set(args.existing.map(keyOf));

  const next = (r: Row) => ({ userId: String(r.userId), type: String(r.type), refId: remapIds(String(r.refId), args.idMap) });

  for (const r of args.rows) if (next(r).refId === r.refId) claimed.add(keyOf(next(r)));

  const dropped: Row[] = [];

  for (const r of args.rows) {
    const n = next(r);

    if (n.refId === r.refId) continue;

    if (claimed.has(keyOf(n))) dropped.push(r);
    else claimed.add(keyOf(n));
  }

  return dropped;
}

export async function findDroppedNotifications(db: object, args: { rows: Row[]; idMap: ReadonlyMap<string, string> }): Promise<Row[]> {
  if (args.rows.length === 0) return [];

  const refIds = [...new Set(args.rows.map((r) => remapIds(String(r.refId), args.idMap)))];

  const found = await (db as { playerNotification: { findMany(a: unknown): Promise<Row[]> } }).playerNotification.findMany({ where: { refId: { in: refIds } }, select: { id: true, userId: true, type: true, refId: true } });

  const own = new Set(args.rows.map((r) => r.id));

  return collidingNotifications({ rows: args.rows, idMap: args.idMap, existing: found.filter((r) => !own.has(r.id)) as unknown as NotificationKey[] });
}
