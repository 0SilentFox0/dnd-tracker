import { expect, it, vi } from "vitest";

import { withCampaignContentWrite } from "@/lib/server/content/write";
import { afterContentCommit } from "@/lib/server/content/write-context";
vi.mock("@/lib/db", () => ({ prisma: { $transaction: async (fn: (db: object) => unknown) => fn({ $queryRaw: async () => [{ id: "c" }] }) } }));
it("awaits cleanup errors after commit instead of reporting successful cleanup", async () => {
  await expect(withCampaignContentWrite("c", async () => {
    afterContentCommit(async () => { await Promise.resolve(); throw new Error("cleanup failed"); });

    return "written";
  })).rejects.toThrow("cleanup failed");
});
