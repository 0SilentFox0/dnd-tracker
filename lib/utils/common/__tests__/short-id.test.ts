import { afterEach, describe, expect, it, vi } from "vitest";

import { shortId } from "../short-id";

describe("shortId", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("працює без crypto.randomUUID", () => {
    vi.stubGlobal("crypto", {});

    const id = shortId();

    expect(id).toHaveLength(12);
    expect(shortId()).not.toBe(id);
  });
});
