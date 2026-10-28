import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { applySourceChanges } from "@/lib/server/templates/sync/apply";
import { loadSyncContext } from "@/lib/server/templates/sync/context";
import { buildDiff } from "@/lib/server/templates/sync/diff";
import { applySource, getSourceDiff } from "@/lib/server/templates/sync/service";
import type { Actor } from "@/lib/utils/api/actor";

const tx = vi.hoisted(() => ({ $queryRaw: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: { $transaction: vi.fn() } }));
vi.mock("@/lib/cache/tags", () => ({ ReferenceKind: { SPELLS: "spells" }, invalidateReference: vi.fn() }));
vi.mock("@/lib/server/templates/sync/context", () => ({ loadSyncContext: vi.fn() }));
vi.mock("@/lib/server/templates/sync/diff", () => ({ buildDiff: vi.fn() }));
vi.mock("@/lib/server/templates/sync/apply", () => ({ applySourceChanges: vi.fn() }));

const actor: Actor = { campaignId: "t", userId: "u", isDM: true, via: "session", scopes: null };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(buildDiff).mockResolvedValue({ items: [] } as never);
  vi.mocked(loadSyncContext).mockResolvedValue({} as never);
  vi.mocked(prisma.$transaction).mockImplementation((async (fn: (t: typeof tx) => unknown) => fn(tx)) as never);
});

describe("source sync service", () => {
  it("diff читає контекст з перевіркою доступу користувача", async () => {
    expect(await getSourceDiff(actor, "spells")).toEqual({ items: [] });
    expect(loadSyncContext).toHaveBeenCalledWith(prisma, "t", actor);
    expect(buildDiff).toHaveBeenCalledWith(prisma, {}, "spells");
  });

  it("помилка доступу з контексту йде нагору без diff", async () => {
    vi.mocked(loadSyncContext).mockRejectedValue(Object.assign(new Error("no"), { status: 403 }));

    await expect(getSourceDiff(actor)).rejects.toMatchObject({ status: 403 });
    expect(buildDiff).not.toHaveBeenCalled();
  });

  it("apply блокує рядок кампанії до читання контексту, в одній транзакції", async () => {
    const order: string[] = [];

    tx.$queryRaw.mockImplementation(async () => order.push("lock"));
    vi.mocked(applySourceChanges).mockImplementation((async () => order.push("apply")) as never);

    await applySource(actor, { apply: [], ignore: [] });

    expect(order).toEqual(["lock", "apply"]);
    expect(vi.mocked(applySourceChanges).mock.calls[0]).toEqual([tx, "t", { apply: [], ignore: [] }, actor]);
  });
});
