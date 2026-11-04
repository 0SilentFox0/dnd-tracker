// @vitest-environment happy-dom
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BACKGROUND_FADE_MS, MapBackground } from "../MapBackground";

import type { BattleMapConfig } from "@/types/battle";

const reduced = vi.hoisted(() => ({ value: false }));

vi.mock("@/lib/hooks/common", async (orig) => ({ ...(await orig<object>()), useReducedMotion: () => reduced.value, usePageHidden: () => false }));

vi.mock("@/lib/utils/canvas/ticker", () => ({ subscribe: vi.fn(() => vi.fn()) }));

afterEach(() => {
  cleanup();
  reduced.value = false;
});

const map: BattleMapConfig = { cols: 10, rows: 5, background: "/battle-maps/a.webp", opacity: 0.3 };

describe("MapBackground", () => {
  it("switches to the scrolling track only when map.motion is set", async () => {
    const still = render(<MapBackground map={map} cellPx={50} phone={false} rotated={false} />);

    expect(still.container.querySelector("[data-motion-track]")).toBeNull();
    still.unmount();

    const { container } = render(<MapBackground map={{ ...map, motion: { axis: "x", speed: 1 } }} cellPx={50} phone={false} rotated={false} />);

    const img = container.querySelector("img") as HTMLImageElement;

    Object.defineProperty(img, "naturalWidth", { value: 400 });
    Object.defineProperty(img, "naturalHeight", { value: 200 });
    fireEvent.load(img);

    await waitFor(() => expect(container.querySelector("[data-motion-track]")).not.toBeNull());
  });

  it("при зміні фону тримає старий шар, поки новий не завантажиться, і плавно міняє їх місцями", async () => {
    const props = { cellPx: 50, phone: false, rotated: false };

    const { container, rerender } = render(<MapBackground map={map} {...props} />);

    expect(container.querySelector("[data-background-layer=previous]")).toBeNull();

    rerender(<MapBackground map={{ ...map, background: "/battle-maps/b.webp" }} {...props} />);

    const layer = (name: string) => container.querySelector<HTMLElement>(`[data-background-layer=${name}]`);

    expect(layer("previous")?.style.opacity).toBe("1");
    expect(layer("current")?.style.opacity).toBe("0");

    fireEvent.load(layer("current")?.querySelector("img") as HTMLImageElement);

    await waitFor(() => expect(layer("previous")?.style.opacity).toBe("0"));
    expect(layer("current")?.style.opacity).toBe("1");

    await waitFor(() => expect(layer("previous")).toBeNull(), { timeout: BACKGROUND_FADE_MS + 1000 });
  });

  it("при зменшеному русі фон міняється миттєво, без старого шару", () => {
    reduced.value = true;

    const props = { cellPx: 50, phone: false, rotated: false };

    const { container, rerender } = render(<MapBackground map={map} {...props} />);

    rerender(<MapBackground map={{ ...map, background: "/battle-maps/b.webp" }} {...props} />);

    expect(container.querySelector("[data-background-layer=previous]")).toBeNull();
    expect((container.querySelector("[data-background-layer=current]") as HTMLElement).style.opacity).toBe("1");
  });
});
