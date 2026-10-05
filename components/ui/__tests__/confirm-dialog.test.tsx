// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { mockMatchMedia } from "./match-media";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { type ConfirmFn, useConfirm } from "@/lib/hooks/common";

let confirm: ConfirmFn;

function Grab() {
  confirm = useConfirm();

  return null;
}

const mount = () => render(<ConfirmProvider><Grab /></ConfirmProvider>);

describe("useConfirm", () => {
  beforeEach(() => mockMatchMedia(false));
  afterEach(cleanup);

  it("«Видалити» → true, «Скасувати» → false", async () => {
    mount();

    let p!: Promise<boolean>;

    act(() => {
      p = confirm({ title: "Видалити артефакт?", confirmLabel: "Видалити", destructive: true });
    });
    fireEvent.click(await screen.findByRole("button", { name: "Видалити" }));
    await expect(p).resolves.toBe(true);

    act(() => {
      p = confirm({ title: "Ще раз?" });
    });
    fireEvent.click(await screen.findByRole("button", { name: "Скасувати" }));
    await expect(p).resolves.toBe(false);
  });

  it("Escape → false", async () => {
    mount();

    let p!: Promise<boolean>;

    act(() => {
      p = confirm({ title: "Вийти?" });
    });
    fireEvent.keyDown(await screen.findByRole("dialog"), { key: "Escape" });
    await expect(p).resolves.toBe(false);
  });

  it("другий виклик скасовує перший", async () => {
    mount();

    let first!: Promise<boolean>;

    act(() => {
      first = confirm({ title: "Перше" });
    });
    act(() => {
      void confirm({ title: "Друге" });
    });

    await expect(first).resolves.toBe(false);
    expect(await screen.findByText("Друге")).toBeInTheDocument();
  });

  it("onConfirm з помилкою лишає діалог відкритим із текстом; повтор з успіхом → true", async () => {
    mount();

    let attempt = 0;

    let p!: Promise<boolean>;

    act(() => {
      p = confirm({ title: "Видалити?", confirmLabel: "Видалити", onConfirm: async () => {
        attempt++;

        if (attempt === 1) throw new Error("Сервер недоступний");
      } });
    });
    fireEvent.click(await screen.findByRole("button", { name: "Видалити" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Сервер недоступний");
    fireEvent.click(screen.getByRole("button", { name: "Видалити" }));
    await expect(p).resolves.toBe(true);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("розмонтування провайдера з відкритим підтвердженням → false", async () => {
    const { unmount } = mount();

    let p!: Promise<boolean>;

    act(() => {
      p = confirm({ title: "Видалити?" });
    });
    unmount();
    await expect(p).resolves.toBe(false);
  });

  it("поза провайдером — зрозуміла помилка", () => {
    expect(() => render(<Grab />)).toThrow(/ConfirmProvider/);
  });
});
