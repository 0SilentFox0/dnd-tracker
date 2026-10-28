import { type Mock, vi } from "vitest";

import { createScopedDatabase } from "@/lib/server/content/write-context";

/** ORM boundary for route tests. Keep the real campaign guard, scoped transaction,
 * and after-commit callbacks; real SQL locking/rollback belongs to storage integration. */
export function contentDatabaseDouble<T extends object>(delegates: T) {
  const base = delegates as T & { $queryRaw: Mock; $transaction: Mock };

  base.$queryRaw = vi.fn(async (query: TemplateStringsArray, ...values: unknown[]) => {
    if (!query.join("?").includes("FROM campaigns WHERE id = ? FOR UPDATE") || typeof values[0] !== "string") {
      throw new Error("Unexpected SQL in content route fixture");
    }

    return [{ id: values[0] }];
  });
  base.$transaction ??= vi.fn();
  base.$transaction.mockImplementation(async (callback: (tx: typeof base) => unknown) => callback(base));

  return createScopedDatabase(base);
}
