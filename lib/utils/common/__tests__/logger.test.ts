/**
 * Тести для logger + serializeError.
 *
 * Перевіряємо контракт: shape payload (key/value bag), безпечну
 * серіалізацію відомих error класів і fallback на String() для
 * не-Error значень.
 */

import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { logger, serializeError } from "../logger";

describe("serializeError", () => {
  it("serializes ZodError to {kind, issues}", () => {
    const schema = z.object({ name: z.string() });

    const result = schema.safeParse({ name: 42 });

    expect(result.success).toBe(false);

    if (result.success) return;

    const serialized = serializeError(result.error);

    expect(serialized).toMatchObject({ kind: "ZodError" });
    expect((serialized as { issues: unknown[] }).issues.length).toBeGreaterThan(0);
  });

  it("serializes Prisma known errors with code + meta", () => {
    const err = new Prisma.PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "test",
      meta: { table: "Skill" },
    });

    expect(serializeError(err)).toMatchObject({
      kind: "PrismaClientKnownRequestError",
      code: "P2025",
      meta: { table: "Skill" },
    });
  });

  it("serializes generic Error with name + message + stack", () => {
    const err = new TypeError("oops");

    const serialized = serializeError(err);

    expect(serialized).toMatchObject({
      kind: "TypeError",
      message: "oops",
    });
    expect(typeof (serialized as { stack: string }).stack).toBe("string");
  });

  it("falls back to String() for non-Error values", () => {
    expect(serializeError("just a string")).toBe("just a string");
    expect(serializeError(42)).toBe("42");
    expect(serializeError(null)).toBe("null");
    expect(serializeError(undefined)).toBe("undefined");
  });
});

describe("logger", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;

  let warnSpy: ReturnType<typeof vi.spyOn>;

  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("info passes context as second arg without error key", () => {
    logger.info("hello", { campaignId: "c1" });

    expect(infoSpy).toHaveBeenCalledWith("hello", { campaignId: "c1" });
  });

  it("warn merges error into context payload", () => {
    logger.warn("flaky thing", { x: 1 }, new Error("boom"));

    expect(warnSpy).toHaveBeenCalledTimes(1);

    const [msg, payload] = warnSpy.mock.calls[0];

    expect(msg).toBe("flaky thing");
    expect(payload).toMatchObject({
      x: 1,
      error: { kind: "Error", message: "boom" },
    });
  });

  it("error works without explicit error arg (just context)", () => {
    logger.error("validation rejected", { reason: "missing field" });

    expect(errorSpy).toHaveBeenCalledWith("validation rejected", {
      reason: "missing field",
    });

    const [, payload] = errorSpy.mock.calls[0];

    // нема error key коли error не передано
    expect(Object.keys(payload as Record<string, unknown>)).toEqual(["reason"]);
  });

  it("default context is empty object when omitted", () => {
    logger.info("no ctx");

    expect(infoSpy).toHaveBeenCalledWith("no ctx", {});
  });
});
