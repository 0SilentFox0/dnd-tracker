import { describe, expect, it, vi } from "vitest";

import { ContentError } from "@/lib/server/content/errors";
import { handleApiError } from "@/lib/utils/api/error-handler";

describe("handleApiError", () => {
  it("ContentError → its status, text and issues, without an error log", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const issues = [{ path: ["a"], message: "bad" }];

    const res = handleApiError(new ContentError("x", 409, issues), { action: "t" });

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "x", issues });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
