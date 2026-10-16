// @vitest-environment happy-dom
import { useContext, useEffect } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ConfirmContext, type ConfirmFn } from "@/lib/hooks/common/confirm-context";

describe("ConfirmProvider", () => {
  it("скасування через signal закриває діалог і повертає false", async () => {
    const got: { confirm?: ConfirmFn | null } = {};

    function Grab({ onReady }: { onReady: (c: ConfirmFn | null) => void }) {
      const confirm = useContext(ConfirmContext);

      useEffect(() => onReady(confirm), [confirm, onReady]);

      return null;
    }

    render(<ConfirmProvider><Grab onReady={(c) => { got.confirm = c; }} /></ConfirmProvider>);

    const controller = new AbortController();

    let answer: Promise<boolean> = Promise.resolve(true);

    act(() => {
      answer = got.confirm?.({ title: "Завершити хід?", signal: controller.signal }) ?? answer;
    });

    expect(await screen.findByText("Завершити хід?")).toBeTruthy();

    act(() => controller.abort());

    await expect(answer).resolves.toBe(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
