// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSingleFlight } from "@/lib/hooks/common/useSingleFlight";

describe("useSingleFlight", () => {
  it("drops a second call while the first runs", async () => {
    const { result } = renderHook(() => useSingleFlight());

    let release: () => void = () => {};

    const first = result.current(() => new Promise<void>((r) => (release = r)));

    expect(result.current(async () => undefined)).toBeNull();
    release();
    await first;
    expect(result.current(async () => "next")).not.toBeNull();
  });

  it("a task that throws synchronously rejects and does not stay busy", async () => {
    const { result } = renderHook(() => useSingleFlight());

    await expect(
      result.current<void>(() => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    await expect(result.current(async () => "ok")).resolves.toBe("ok");
  });
});
