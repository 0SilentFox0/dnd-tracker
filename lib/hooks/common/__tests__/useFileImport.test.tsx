// @vitest-environment happy-dom
import type { ChangeEvent } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useFileImport } from "../useFileImport";

const pick = (name: string) => ({ target: { files: [new File(["x"], name)] } }) as unknown as ChangeEvent<HTMLInputElement>;

describe("useFileImport", () => {
  it("unsupported extension -> common.import.unsupportedType", () => {
    const { result } = renderHook(() => useFileImport({ onImport: vi.fn() }));

    act(() => result.current.actions.handleFileChange(pick("a.txt")));

    expect(result.current.status.error).toBe("common.import.unsupportedType");
  });

  it("import without a file -> common.import.pickFile", async () => {
    const { result } = renderHook(() => useFileImport({ onImport: vi.fn(), parseJSON: vi.fn() }));

    await act(() => result.current.actions.handleImport());

    expect(result.current.status.error).toBe("common.import.pickFile");
  });

  it("csv without a csv parser -> common.import.csvUnsupported", async () => {
    const { result } = renderHook(() => useFileImport({ onImport: vi.fn(), parseJSON: vi.fn() }));

    act(() => result.current.actions.handleFileChange(pick("a.csv")));
    await act(() => result.current.actions.handleImport());

    expect(result.current.status.error).toBe("common.import.csvUnsupported");
  });
});
