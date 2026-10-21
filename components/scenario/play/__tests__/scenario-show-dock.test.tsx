// @vitest-environment happy-dom
import { renderToString } from "react-dom/server";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScenarioShowDock } from "../ScenarioShowDock";

import type { ScenarioPlay } from "@/lib/hooks/scenario";
import type { ScenarioContent } from "@/types/scenario";
import type { ShowState } from "@/types/show";

vi.mock("@/components/audio/AudioDock", () => ({ AudioDock: () => <div>audio-dock</div> }));
vi.mock("@/components/audio/AudioPlayerProvider", () => ({ AudioPlayerProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/show/stage/ShowDeckStrip", () => ({ ShowDeckStrip: () => <div>control-panel</div> }));
vi.mock("@/components/show/stage/ShowTransport", () => ({ ShowTransport: () => <div>transport</div> }));
vi.mock("@/lib/hooks/common", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/hooks/common")>()), useNotify: () => vi.fn() }));
vi.mock("@/lib/hooks/show", () => ({ useShowAudioHost: () => ({}), useShowKeys: () => {} }));

const p = { type: "doc" as const, content: [] };

const empty: ScenarioContent = { legend: [], sections: [{ id: "s", title: "S", played: false, rows: [{ id: "r", story: p, notes: p }] }] };

const bound: ScenarioContent = { legend: [], sections: [{ id: "s", title: "S", played: false, rows: [{ id: "r", story: p, notes: p, battleId: "b1" }] }] };

const play = (show: ShowState | null): ScenarioPlay => ({ lookup: { decks: new Map(), battles: null, show }, showSlide: vi.fn(), activeRow: null, nextRow: null, showNextRow: vi.fn(() => null), runBattle: vi.fn(), pending: false, control: { send: vi.fn(), pending: false } }) as unknown as ScenarioPlay;

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("ScenarioShowDock", () => {
  it("без прив'язок і без показу не рендериться", () => {
    const { container } = render(<ScenarioShowDock campaignId="c" pageId="pg" content={empty} play={play(null)} />);

    expect(container.firstChild).toBeNull();
  });

  it("рендериться при прив'язці або запущеному показі", () => {
    const { unmount } = render(<ScenarioShowDock campaignId="c" pageId="pg" content={bound} play={play(null)} />);

    expect(screen.getByText("Показ не запущено")).toBeTruthy();
    unmount();

    render(<ScenarioShowDock campaignId="c" pageId="pg" content={empty} play={play({ deckId: "d", deckTitle: "Д", slide: { id: "s1", imageUrl: "https://x/a.webp", title: "Собор" }, nextImageUrl: null, audio: null, seq: 1 })} />);
    expect(screen.getByText("Собор")).toBeTruthy();
  });

  it("за замовчуванням згорнуто; перемикач розгортає і згортає панель", () => {
    render(<ScenarioShowDock campaignId="c" pageId="pg" content={bound} play={play(null)} />);

    expect(screen.queryByText("control-panel")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Розгорнути панель показу" }));
    expect(screen.getByText("control-panel")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Згорнути панель показу" }));
    expect(screen.queryByText("control-panel")).toBeNull();
  });

  it("стан із localStorage не читається при серверному рендері (без hydration mismatch)", () => {
    localStorage.setItem("scenario-show-dock", "on");

    expect(renderToString(<ScenarioShowDock campaignId="c" pageId="pg" content={bound} play={play(null)} />)).not.toContain("control-panel");
  });

  it("збережене розгортання відновлюється на клієнті й переживає перемикання", () => {
    localStorage.setItem("scenario-show-dock", "on");
    render(<ScenarioShowDock campaignId="c" pageId="pg" content={bound} play={play(null)} />);

    expect(screen.getByText("control-panel")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Згорнути панель показу" }));
    expect(localStorage.getItem("scenario-show-dock")).toBe("off");
  });

  it("виклик бою без показу: у заголовку назва бою", () => {
    render(<ScenarioShowDock campaignId="c" pageId="pg" content={empty} play={play({ deckId: null, deckTitle: null, slide: null, nextImageUrl: null, audio: null, seq: 2, battle: { id: "b1", name: "Засідка" } } as unknown as ShowState)} />);
    expect(screen.getByText("⚔ До бою: Засідка")).toBeTruthy();
  });

  it("плеєр і перемикач видно завжди, навіть згорнутими", () => {
    render(<ScenarioShowDock campaignId="c" pageId="pg" content={bound} play={play(null)} />);

    expect(screen.getByText("audio-dock")).toBeTruthy();
    expect(screen.getByText("transport")).toBeTruthy();
  });

  it("заглушка: показує картинку заглушки й підпис", () => {
    const shown = { deckId: "d", deckTitle: "Д", slide: { id: "s1", imageUrl: "https://x/a.webp", title: "Собор" }, nextImageUrl: null, audio: null, seq: 1, curtain: true as const };

    render(<ScenarioShowDock campaignId="c" pageId="pg" content={empty} play={play(shown)} />);
    expect(screen.getByText("Заглушка")).toBeTruthy();
    expect(screen.queryByText("Собор")).toBeNull();
  });
});
