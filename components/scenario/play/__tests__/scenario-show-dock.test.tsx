// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScenarioShowDock } from "../ScenarioShowDock";

import type { ScenarioPlay } from "@/lib/hooks/scenario";
import type { ScenarioContent } from "@/types/scenario";
import type { ShowState } from "@/types/show";

vi.mock("@/components/audio/AudioDock", () => ({ AudioDock: () => <div>audio-dock</div> }));
vi.mock("@/components/audio/AudioPlayerProvider", () => ({ AudioPlayerProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/show/stage/ShowControlPanel", () => ({ ShowControlPanel: () => <div>control-panel</div> }));
vi.mock("@/lib/hooks/common", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/hooks/common")>()), useNotify: () => vi.fn() }));
vi.mock("@/lib/hooks/show", () => ({ useShowAudioHost: () => ({}) }));

const p = { type: "doc" as const, content: [] };

const empty: ScenarioContent = { legend: [], sections: [{ id: "s", title: "S", played: false, rows: [{ id: "r", story: p, notes: p }] }] };

const bound: ScenarioContent = { legend: [], sections: [{ id: "s", title: "S", played: false, rows: [{ id: "r", story: p, notes: p, battleId: "b1" }] }] };

const play = (show: ShowState | null): ScenarioPlay => ({ lookup: { decks: new Map(), battles: null, show }, showSlide: vi.fn(), runBattle: vi.fn(), pending: false, control: { send: vi.fn(), pending: false } }) as unknown as ScenarioPlay;

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("ScenarioShowDock", () => {
  it("без прив'язок і без показу не рендериться", () => {
    const { container } = render(<ScenarioShowDock campaignId="c" content={empty} play={play(null)} />);

    expect(container.firstChild).toBeNull();
  });

  it("рендериться при прив'язці або запущеному показі", () => {
    const { unmount } = render(<ScenarioShowDock campaignId="c" content={bound} play={play(null)} />);

    expect(screen.getByText("Показ не запущено")).toBeTruthy();
    unmount();

    render(<ScenarioShowDock campaignId="c" content={empty} play={play({ deckId: "d", deckTitle: "Д", slide: { id: "s1", imageUrl: "https://x/a.webp", title: "Собор" }, nextImageUrl: null, audio: null, seq: 1 })} />);
    expect(screen.getByText("Собор")).toBeTruthy();
  });

  it("за замовчуванням згорнуто; перемикач розгортає і згортає панель", () => {
    render(<ScenarioShowDock campaignId="c" content={bound} play={play(null)} />);

    expect(screen.queryByText("control-panel")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Розгорнути панель показу" }));
    expect(screen.getByText("control-panel")).toBeTruthy();
    expect(screen.getByText("audio-dock")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Згорнути панель показу" }));
    expect(screen.queryByText("control-panel")).toBeNull();
  });
});
