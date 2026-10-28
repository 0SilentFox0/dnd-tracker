// @vitest-environment happy-dom
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PuzzleStage } from "../PuzzleStage";

import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { generatePuzzle } from "@/lib/utils/puzzle/generate";
import type { PuzzleSpec, PuzzleState } from "@/types/show";

const send = vi.fn();

vi.mock("@/lib/hooks/show/usePuzzleControl", () => ({ usePuzzleControl: () => ({ send }) }));

const spec: PuzzleSpec = { cut: "straight", count: 4, seed: 1, imageWidth: 400, imageHeight: 400 };

const pieces = generatePuzzle(spec);

const [a, b, c, d] = pieces.map((p) => p.id);

const piece = (over = {}) => ({ x: 0, y: 0, rot: 90, place: "tray" as const, correct: false, ...over });

const state = (over: Record<string, object> = {}, solved = false): PuzzleState => ({
  solved,
  pieces: { [a]: piece(over[a]), [b]: piece(over[b]), [c]: piece(over[c]), [d]: piece(over[d]) },
});

const mine = { userId: "me", name: "Я", until: Date.now() + 30_000 };

const mount = (puzzle: PuzzleState, isDM = false) => renderWithConfirm(<PuzzleStage campaignId="c1" isDM={isDM} userId="me" spec={spec} imageUrl="https://x/a.webp" puzzle={puzzle} />);

const stubBoard = () =>
  vi.spyOn(screen.getByTestId("puzzle-board"), "getBoundingClientRect").mockReturnValue({ left: 100, top: 100, right: 500, bottom: 500, width: 400, height: 400, x: 100, y: 100, toJSON: () => ({}) });

const flush = () => act(async () => {});

beforeEach(() => send.mockReset().mockResolvedValue(true));
afterEach(cleanup);

describe("PuzzleStage", () => {
  it("сайдбар показує тільки tray, дошка — board", () => {
    mount(state({ [b]: { place: "board", x: 50, y: 50 } }));

    expect(screen.getByTestId(`tray-piece-${a}`)).toBeTruthy();
    expect(screen.queryByTestId(`tray-piece-${b}`)).toBeNull();
    expect(screen.getByTestId(`board-piece-${b}`)).toBeTruthy();
    expect(screen.queryByTestId(`board-piece-${a}`)).toBeNull();
  });

  it("чужий шматочок приглушений з іменем", () => {
    mount(state({ [a]: { holder: { userId: "other", name: "Орк", until: Date.now() + 30_000 } } }));

    expect(screen.getByTestId(`tray-piece-${a}`).className).toContain("opacity-40");
    expect(screen.getByText("Орк")).toBeTruthy();
  });

  it("correct має підсвітку", () => {
    mount(state({ [a]: { place: "board", correct: true } }));

    expect(screen.getByTestId(`board-piece-${a}`).className).toContain("drop-shadow");
  });

  it("solved: цільна карта без шматочків", () => {
    mount(state({ [a]: { place: "board", correct: true } }, true));

    expect(screen.queryByTestId(`board-piece-${a}`)).toBeNull();
    expect(screen.getByTestId("puzzle-board").querySelector("img")).toBeTruthy();
  });

  it("відмова grab повертає шматочок у сайдбар", async () => {
    send.mockResolvedValue(false);
    mount(state());

    fireEvent.pointerDown(screen.getByTestId(`tray-piece-${a}`), { clientX: 10, clientY: 10 });
    await flush();

    expect(screen.queryByTestId("puzzle-hand")).toBeNull();
    expect(screen.getByTestId(`tray-piece-${a}`)).toBeTruthy();
  });

  it("drop над дошкою з поворотом кнопкою і клавішею", async () => {
    mount(state({ [a]: { holder: mine } }));
    stubBoard();

    fireEvent.pointerDown(screen.getByTestId(`tray-piece-${a}`), { clientX: 10, clientY: 10 });
    await flush();
    fireEvent.click(screen.getByLabelText("Повернути за годинниковою"));
    fireEvent.keyDown(window, { code: "KeyE" });
    fireEvent.keyDown(window, { code: "KeyQ" });
    fireEvent.pointerUp(window, { clientX: 200, clientY: 300 });
    await flush();

    expect(send).toHaveBeenCalledWith({ action: "puzzleDrop", pieceId: a, x: 100, y: 200, rot: 135 });
  });

  it("відпускання поза дошкою — return", async () => {
    mount(state({ [a]: { holder: mine } }));
    stubBoard();

    fireEvent.pointerDown(screen.getByTestId(`tray-piece-${a}`), { clientX: 10, clientY: 10 });
    await flush();
    fireEvent.pointerUp(window, { clientX: 5, clientY: 5 });
    await flush();

    expect(send).toHaveBeenCalledWith({ action: "puzzleReturn", pieceId: a });
  });

  it("кнопки ДМ лише в режимі ДМ", async () => {
    const { unmount } = mount(state());

    expect(screen.queryByText("Відпустити всі")).toBeNull();
    unmount();
    mount(state(), true);
    fireEvent.click(screen.getByText("Відпустити всі"));

    expect(send).toHaveBeenCalledWith({ action: "puzzleRelease" });
  });

  it("скинути питає підтвердження", async () => {
    mount(state(), true);

    fireEvent.click(screen.getByText("Скинути"));

    fireEvent.click(await within(await screen.findByRole("dialog")).findByRole("button", { name: "Скинути" }));
    await waitFor(() => expect(send).toHaveBeenCalledWith({ action: "puzzleReset" }));
  });

  it("ігнорує move/up/cancel іншого pointerId", async () => {
    mount(state({ [a]: { holder: mine } }));
    stubBoard();

    fireEvent.pointerDown(screen.getByTestId(`tray-piece-${a}`), { clientX: 10, clientY: 10, pointerId: 1 });
    await flush();
    send.mockClear();
    fireEvent.pointerCancel(window, { pointerId: 2 });
    fireEvent.pointerUp(window, { clientX: 200, clientY: 300, pointerId: 2 });
    await flush();

    expect(send).not.toHaveBeenCalled();
    expect(screen.getByTestId("puzzle-hand")).toBeTruthy();

    fireEvent.pointerUp(window, { clientX: 200, clientY: 300, pointerId: 1 });
    await flush();

    expect(send).toHaveBeenCalledWith({ action: "puzzleDrop", pieceId: a, x: 100, y: 200, rot: 90 });
  });

  it("pointercancel власного pointerId повертає шматочок", async () => {
    mount(state({ [a]: { holder: mine } }));
    stubBoard();

    fireEvent.pointerDown(screen.getByTestId(`tray-piece-${a}`), { clientX: 10, clientY: 10, pointerId: 1 });
    await flush();
    fireEvent.pointerCancel(window, { clientX: 200, clientY: 300, pointerId: 1 });
    await flush();

    expect(send).toHaveBeenCalledWith({ action: "puzzleReturn", pieceId: a });
  });

  it("короткий тап по шматочку на дошці обертає його на +45 і лишає на місці", async () => {
    mount(state({ [b]: { place: "board", x: 50, y: 60, rot: 0, holder: mine } }));
    stubBoard();

    fireEvent.pointerDown(screen.getByTestId(`board-piece-${b}`), { clientX: 150, clientY: 160, pointerId: 1 });
    await flush();
    fireEvent.pointerUp(window, { clientX: 152, clientY: 161, pointerId: 1 });
    await flush();

    expect(send).toHaveBeenCalledWith({ action: "puzzleDrop", pieceId: b, x: 50, y: 60, rot: 45 });
  });

  it("рух понад 5px на дошці — звичайне перетягування", async () => {
    mount(state({ [b]: { place: "board", x: 50, y: 60, rot: 0, holder: mine } }));
    stubBoard();

    fireEvent.pointerDown(screen.getByTestId(`board-piece-${b}`), { clientX: 150, clientY: 160, pointerId: 1 });
    await flush();
    fireEvent.pointerUp(window, { clientX: 200, clientY: 300, pointerId: 1 });
    await flush();

    expect(send).toHaveBeenCalledWith({ action: "puzzleDrop", pieceId: b, x: 100, y: 200, rot: 0 });
  });

  it("колесо миші обертає шматочок у руці", async () => {
    mount(state({ [a]: { holder: mine } }));
    stubBoard();

    fireEvent.pointerDown(screen.getByTestId(`tray-piece-${a}`), { clientX: 10, clientY: 10 });
    await flush();
    fireEvent.wheel(window, { deltaY: 100 });
    fireEvent.pointerUp(window, { clientX: 200, clientY: 300 });
    await flush();

    expect(send).toHaveBeenCalledWith({ action: "puzzleDrop", pieceId: a, x: 100, y: 200, rot: 135 });
  });

  describe("дотик із сайдбара", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const touchDown = () => fireEvent.pointerDown(screen.getByTestId(`tray-piece-${a}`), { clientX: 10, clientY: 10, pointerId: 1, pointerType: "touch" });

    it("довгий тап (200мс) бере шматочок, одразу — ні", async () => {
      mount(state({ [a]: { holder: mine } }));
      touchDown();

      expect(screen.queryByTestId("puzzle-hand")).toBeNull();
      expect(send).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(250);
      });

      expect(screen.getByTestId("puzzle-hand")).toBeTruthy();
      expect(send).toHaveBeenCalledWith({ action: "puzzleGrab", pieceId: a });
    });

    it("рух переважно вертикальний бере шматочок одразу", async () => {
      mount(state({ [a]: { holder: mine } }));
      touchDown();
      fireEvent.pointerMove(window, { clientX: 12, clientY: 40, pointerId: 1 });
      await act(async () => {});

      expect(screen.getByTestId("puzzle-hand")).toBeTruthy();
    });

    it("горизонтальний рух — це прокрутка стрічки, шматочок не береться", async () => {
      mount(state({ [a]: { holder: mine } }));
      touchDown();
      fireEvent.pointerMove(window, { clientX: 60, clientY: 12, pointerId: 1 });
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.queryByTestId("puzzle-hand")).toBeNull();
      expect(send).not.toHaveBeenCalled();
    });

    it("pointercancel (браузер прокручує) скасовує очікування", async () => {
      mount(state({ [a]: { holder: mine } }));
      touchDown();
      fireEvent.pointerCancel(window, { pointerId: 1 });
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(send).not.toHaveBeenCalled();
    });
  });

  it("keepAlive шле раз на 10с і зупиняється після unmount", async () => {
    vi.useFakeTimers();

    try {
      const { unmount } = mount(state({ [a]: { holder: mine } }));

      fireEvent.pointerDown(screen.getByTestId(`tray-piece-${a}`), { clientX: 10, clientY: 10 });
      await act(async () => {});
      send.mockClear();
      await act(async () => {
        vi.advanceTimersByTime(10_000);
      });

      expect(send).toHaveBeenCalledWith({ action: "puzzleKeepAlive", pieceId: a });

      unmount();
      send.mockClear();
      await act(async () => {
        vi.advanceTimersByTime(60_000);
      });

      expect(send).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
