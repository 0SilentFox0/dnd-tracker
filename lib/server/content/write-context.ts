import { AsyncLocalStorage } from "node:async_hooks";

export type ContentEffect = () => void | Promise<void>;

export interface ContentWriteContext { campaignId: string; db: object; afterCommit: ContentEffect[]; onTrackFileRemoved?: (url: string) => void }

const context = new AsyncLocalStorage<ContentWriteContext>();

export const currentContentWrite = () => context.getStore();

export function runContentWriteContext<T>(campaignId: string, db: object, callback: () => Promise<T>, afterCommit: ContentEffect[] = []): Promise<T> {
  return context.run({ campaignId, db, afterCommit }, callback);
}

/** Existing domain guards must share the transaction too, including helpers importing prisma. */
export function createScopedDatabase<T extends object>(base: T): T {
  return new Proxy(base, {
    get(target, property) {
      const current = context.getStore();

      const db = current?.db ?? target;

      if (current && property === "$transaction") return (callback: unknown) => typeof callback === "function" ? callback(db) : Promise.all(callback as Promise<unknown>[]);

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
