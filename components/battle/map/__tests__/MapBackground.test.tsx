// @vitest-environment happy-dom
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MapBackground } from "../MapBackground";

import type { BattleMapConfig } from "@/types/battle";

vi.mock("@/lib/utils/canvas/ticker", () => ({ subscribe: vi.fn(() => vi.fn()) }));

afterEach(cleanup);

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
});
