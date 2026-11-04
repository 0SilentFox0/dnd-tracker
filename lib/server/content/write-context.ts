import type { Prisma } from "@prisma/client";
import { AsyncLocalStorage } from "node:async_hooks";

import { bumpContentVersion } from "@/lib/server/campaigns/version";

export type ContentEffect = () => void | Promise<void>;

export interface ContentWriteContext { campaignId: string; db: object; afterCommit: ContentEffect[]; onTrackFileRemoved?: (url: string) => void; dirty?: boolean }

const context = new AsyncLocalStorage<ContentWriteContext>();

interface OpenTransaction { tx: object; open: boolean }

const transaction = new AsyncLocalStorage<OpenTransaction>();

/** The innermost interactive transaction opened through the scoped database, until it settles. */
export const currentTransaction = (): object | undefined => {
  const store = transaction.getStore();

  return store?.open ? store.tx : undefined;
};

export const currentContentWrite = () => context.getStore();

export function runContentWriteContext<T>(campaignId: string, db: object, callback: () => Promise<T>, afterCommit: ContentEffect[] = []): Promise<T> {
  const store: ContentWriteContext = { campaignId, db, afterCommit };

  return context.run(store, async () => {
    const value = await callback();

    if (store.dirty) await bumpContentVersion(db as Prisma.TransactionClient, campaignId);

    return value;
  });
}

export function markContentDirty() {
  const current = context.getStore();

  if (current) current.dirty = true;
}

/** Existing domain guards must share the transaction too, including helpers importing prisma. */
export function createScopedDatabase<T extends object>(base: T): T {
  return new Proxy(base, {
    get(target, property) {
      const current = context.getStore();

      const db = current?.db ?? target;

      if (current && property === "$transaction") return (callback: unknown) => typeof callback === "function" ? callback(db) : Promise.all(callback as Promise<unknown>[]);

      if (property === "$transaction") {
        return (callback: unknown, ...rest: unknown[]) => {
          const open = (target as unknown as { $transaction: (...args: unknown[]) => Promise<unknown> }).$transaction;

          if (typeof callback !== "function") return open.call(target, callback, ...rest);

          return open.call(target, async (tx: object) => {
            const store: OpenTransaction = { tx, open: true };

            try {
              return await transaction.run(store, () => callback(tx));
            } finally {
              store.open = false;
            }
          }, ...rest);
        };
      }

      const value = Reflect.get(db, property);

      return typeof value === "function" ? value.bind(db) : value;
    },
  });
}

export async function runContentEffects(effects: ContentEffect[]) {
  const results = await Promise.allSettled(effects.map(async effect => effect()));

  for (const r of results) if (r.status === "rejected") console.error("[content] after-commit effect failed", r.reason);
}

export function afterContentCommit(effect: ContentEffect) {
  const current = context.getStore();

  if (current) current.afterCommit.push(effect);
  else void runContentEffects([effect]);
}
