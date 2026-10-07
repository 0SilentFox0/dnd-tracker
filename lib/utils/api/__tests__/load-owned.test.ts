import { NextResponse } from "next/server";
import { describe, expect, it } from "vitest";

import { loadOwned } from "../load-owned";

import { API_ERRORS } from "@/lib/constants/api-errors";

describe("loadOwned", () => {
  it("немає запису — 404 з українським повідомленням", async () => {
    const res = await loadOwned(Promise.resolve(null), "c1");

    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(404);
    expect(await (res as NextResponse).json()).toEqual({ error: API_ERRORS.NOT_FOUND });
  });

  it("власне повідомлення для 404", async () => {
    const res = await loadOwned(Promise.resolve(null), "c1", API_ERRORS.RACE_NOT_FOUND);

    expect(await (res as NextResponse).json()).toEqual({ error: API_ERRORS.RACE_NOT_FOUND });
  });

  it("запис іншої кампанії — 403", async () => {
    const res = await loadOwned(Promise.resolve({ campaignId: "c2" }), "c1");

    expect((res as NextResponse).status).toBe(403);
  });

  it("запис цієї кампанії — повертає його", async () => {
    const row = { id: "x", campaignId: "c1" };

    expect(await loadOwned(Promise.resolve(row), "c1")).toBe(row);
  });
});
