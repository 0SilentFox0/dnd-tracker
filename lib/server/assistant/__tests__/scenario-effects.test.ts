import { expect, it, vi } from "vitest";

import { withCampaignContentWrite } from "@/lib/server/content/write";
import { afterContentCommit } from "@/lib/server/content/write-context";
vi.mock("@/lib/db", () => ({ prisma: { $transaction: async (fn: (db: object) => unknown) => fn({ $queryRaw: async () => [{ id: "c" }] }) } }));
it("awaits after-commit effects and logs their failures without failing the committed write", async () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

  const second = vi.fn();

  await expect(withCampaignContentWrite("c", async () => {
    afterContentCommit(async () => { await Promise.resolve(); throw new Error("cleanup failed"); });
    afterContentCommit(second);

    return "written";
  })).resolves.toBe("written");

  expect(second).toHaveBeenCalledOnce();
  expect(error).toHaveBeenCalled();
  error.mockRestore();
});
