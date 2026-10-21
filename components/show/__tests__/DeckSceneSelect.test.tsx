// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeckSceneSelect } from "@/components/show/editor/DeckSceneSelect";

const set = vi.fn();

vi.mock("@/lib/hooks/show", () => ({ useDeckScene: () => ({ set, pending: false }) }));
vi.mock("@/lib/hooks/scenario", () => ({
  useScenarioPages: () => ({ data: [{ id: "p1", kind: "scene", title: "Монастир" }, { id: "h1", kind: "hero", title: "Годрик" }] }),
}));

afterEach(cleanup);

describe("DeckSceneSelect", () => {
  it("лише сцени; вибір і скидання", () => {
    render(<DeckSceneSelect campaignId="c" deck={{ id: "d1", title: "Ліс", scenarioPageId: null, slides: [], updatedAt: "" }} />);

    const select = screen.getByLabelText("Сцена") as HTMLSelectElement;

    expect([...select.options].map((o) => o.textContent)).toEqual(["Без сцени", "Монастир"]);

    fireEvent.change(select, { target: { value: "p1" } });
    expect(set).toHaveBeenCalledWith("p1");

    fireEvent.change(select, { target: { value: "" } });
    expect(set).toHaveBeenLastCalledWith(null);
  });
});
