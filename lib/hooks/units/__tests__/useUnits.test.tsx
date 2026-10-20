// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/units", () => ({
  createUnit: vi.fn(async () => ({})),
  updateUnit: vi.fn(async () => ({})),
  deleteUnit: vi.fn(async () => ({ success: true })),
}));

import { useCreateUnit, useDeleteUnit, useUpdateUnit } from "@/lib/hooks/units/useUnits";

const run = (mutation: { mutateAsync: (vars: never) => Promise<unknown> }) => mutation.mutateAsync as (vars: unknown) => Promise<unknown>;

function setup() {
  const qc = new QueryClient();

  const invalidate = vi.spyOn(qc, "invalidateQueries");

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

  return { invalidate, wrapper };
}

describe("мутації юнітів інвалідують баланс бою", () => {
  it.each([
    ["створення", () => run(useCreateUnit("c")), {}],
    ["оновлення", () => run(useUpdateUnit("c")), { unitId: "u1", data: {} }],
    ["видалення", () => run(useDeleteUnit("c")), "u1"],
  ] as const)("%s", async (_name, hook, vars) => {
    const { invalidate, wrapper } = setup();

    const { result } = renderHook(hook, { wrapper });

    await act(() => result.current(vars));

    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["units", "c"] }));
    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["battle-balance", "c"] }));
  });
});
