// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShowDeckStrip } from "../stage/ShowDeckStrip";

import type { ShowControl } from "@/lib/hooks/show";

const deck = { id: "d1", title: "Д", scenarioPageId: null, updatedAt: "", slides: [{ id: "slide-0001", imageUrl: "https://a/1.webp" }, { id: "slide-0002", imageUrl: "https://a/2.webp", audience: ["h1", "h2"] }] };

vi.mock("@/components/common/OptimizedImage", () => ({ OptimizedImage: () => null }));
vi.mock("@/lib/hooks/show", () => ({ useDecks: () => ({ data: [{ id: "d1", title: "Д", slideCount: 2 }] }), useDeck: () => ({ data: deck }) }));

afterEach(cleanup);

describe("ShowDeckStrip: аудиторія", () => {
  it("🔒 і без кнопки заглушки лише на обмеженому слайді", () => {
    render(<ShowDeckStrip campaignId="c1" show={null} control={{ send: vi.fn() } as unknown as ShowControl} sceneId={undefined} />);

    expect(screen.getAllByLabelText(/show.deckStrip.audience/)).toHaveLength(1);
    expect(screen.getAllByLabelText("show.deckStrip.makeCover")).toHaveLength(1);
  });
});
