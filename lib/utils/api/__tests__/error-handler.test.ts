/**
 * Тести handleApiError: status codes для ZodError, Prisma errors, generic errors,
 * і structured лог з контекстом.
 */

import { Prisma } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { handleApiError } from "../error-handler";

describe("handleApiError", () => {
  const consoleErrorSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  it("ZodError → 400 з issues", async () => {
    const schema = z.object({ name: z.string() });

    let caught: unknown;

    try {
      schema.parse({ name: 123 });
    } catch (e) {
      caught = e;
    }

    const res = handleApiError(caught, { action: "create" });

    expect(res.status).toBe(400);

    const body = await res.json();

    expect(Array.isArray(body.error)).toBe(true);
  });

  it("Prisma P2025 → 404", async () => {
    const error = new Prisma.PrismaClientKnownRequestError("not found", {
      code: "P2025",
      clientVersion: "test",
    });

    const res = handleApiError(error, { action: "fetch" });

    expect(res.status).toBe(404);

    const body = await res.json();

    expect(body.error).toBe("Not found");
  });

  it("Prisma P2003 → 400 (FK violation)", async () => {
    const error = new Prisma.PrismaClientKnownRequestError("fk", {
      code: "P2003",
      clientVersion: "test",
    });

    const res = handleApiError(error, { action: "create" });

    expect(res.status).toBe(400);

    const body = await res.json();

    expect(body.error).toBe("Foreign key constraint failed");
  });

  it("Прочий Prisma код → 500", async () => {
    const error = new Prisma.PrismaClientKnownRequestError("unknown", {
      code: "P2099",
      clientVersion: "test",
    });

    const res = handleApiError(error, { action: "x" });

    expect(res.status).toBe(500);
  });

  it("Generic Error → 500 без витоку деталей", async () => {
    const error = new Error("internal database secret leak");

    const res = handleApiError(error, { action: "x" });

    expect(res.status).toBe(500);

    const body = await res.json();

    expect(body.error).toBe("Internal server error");
    expect(JSON.stringify(body)).not.toContain("internal database secret leak");
  });

  it("Logs structured payload з контекстом", () => {
    const error = new Error("boom");

    handleApiError(error, {
      action: "create campaign",
      campaignId: "c1",
      userId: "u1",
    });

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

    const [tag, payload] = consoleErrorSpy.mock.calls[0];

    expect(tag).toBe("[api] create campaign failed");
    expect(payload).toMatchObject({
      action: "create campaign",
      campaignId: "c1",
      userId: "u1",
    });
    expect(payload.error).toMatchObject({
      kind: "Error",
      message: "boom",
    });
  });

  it("Не-Error значення (string/number) серіалізує як рядок", () => {
    const res = handleApiError("oops", { action: "x" });

    expect(res.status).toBe(500);

    const [, payload] = consoleErrorSpy.mock.calls[0];

    expect(payload.error).toBe("oops");
  });
});
