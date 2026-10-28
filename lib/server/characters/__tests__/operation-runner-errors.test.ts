import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: {} }));

import { API_ERRORS } from "@/lib/constants/api-errors";
import { errorStatusMessage } from "@/lib/server/characters/operation-runner";
import { ContentError } from "@/lib/server/content/errors";
import { errorResponse } from "@/lib/utils/api/api-response";

describe("errorStatusMessage", () => {
  it("rethrows the untranslated key with its params and issues (level-up cap)", async () => {
    const response = errorResponse(API_ERRORS.MAX_LEVEL_EXCEEDED, 422, [{ message: "x" }], { max: 5 });

    const error = await errorStatusMessage(response).catch((e) => e);

    expect(error).toBeInstanceOf(ContentError);
    expect(error).toMatchObject({ message: API_ERRORS.MAX_LEVEL_EXCEEDED, status: 422, params: { max: 5 }, issues: [{ message: "x" }] });
  });

  it("falls back to the parsed body for foreign responses", async () => {
    const error = await errorStatusMessage(Response.json({ error: "boom" }, { status: 400 }) as never).catch((e) => e);

    expect(error).toMatchObject({ message: "boom", status: 400 });
  });
});
