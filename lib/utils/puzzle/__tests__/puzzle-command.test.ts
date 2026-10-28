import { describe, expect, it } from "vitest";

import { generatePuzzle, pieceSize } from "../generate";
import { applyPuzzleCommand, initPuzzle } from "../puzzle-command";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { PUZZLE_HOLD_MS, PUZZLE_MAX_PIECES, PUZZLE_SNAP } from "@/lib/constants/show";
import type { PuzzleCommand, PuzzleSpec, ShowState } from "@/types/show";

const spec: PuzzleSpec = { cut: "classic", count: 6, seed: 3, imageWidth: 1200, imageHeight: 800 };

const pieces = generatePuzzle(spec);

const id0 = pieces[0].id;

const id1 = pieces[1].id;

const base = (): ShowState => ({
  deckId: "d1",
  deckTitle: "Набір",
  slide: { id: "slide-0001", imageUrl: "https://a/1.webp", kind: "puzzle", puzzle: spec },
  nextImageUrl: null,
  audio: null,
  puzzle: initPuzzle(spec),
  seq: 5,
});

const alice = { id: "u1", name: "Аліса", isDM: false };

const bob = { id: "u2", name: "Боб", isDM: false };

const dm = { id: "u3", name: "ДМ", isDM: true };

const run = (prev: ShowState | null, cmd: PuzzleCommand, user = alice, now = 1_000) => applyPuzzleCommand(prev, cmd, { now, user });

const ok = (r: ReturnType<typeof run>) => {
  if (!r.ok) throw new Error(r.message);

  return r.value;
};

const home0 = pieces[0].home;

describe("payload size", () => {
  it("ShowState with the maximum pieces and several holds stays under 6 KB", () => {
    const big: PuzzleSpec = { cut: "straight", count: PUZZLE_MAX_PIECES, seed: 5, imageWidth: 4000, imageHeight: 3000 };

    const all = generatePuzzle(big);

    let show: ShowState = { ...base(), slide: { id: "slide-0001", imageUrl: "https://a/1.webp", kind: "puzzle", puzzle: big }, puzzle: initPuzzle(big) };

    all.forEach((p, i) => {
      const user = { id: `${i % 5}0000000-0000-4000-8000-000000000000`, name: "Гравець Імена", isDM: false };

      show = ok(run(show, { action: "puzzleGrab", pieceId: p.id }, user));

      if (i < all.length - 4) show = ok(run(show, { action: "puzzleDrop", pieceId: p.id, x: 3999.123, y: 2999.456, rot: 315 }, user));
    });

    expect(JSON.stringify(show).length).toBeLessThan(6 * 1024);
  });
});

describe("initPuzzle", () => {
  it("is deterministic, everything in the tray, angles multiples of 45", () => {
    const a = initPuzzle(spec);

    expect(a).toEqual(initPuzzle(spec));
    expect(Object.keys(a.pieces)).toHaveLength(pieces.length);

    for (const p of Object.values(a.pieces)) {
      expect(p.place).toBe("tray");
      expect(p.correct).toBe(false);
      expect(p.rot % 45).toBe(0);
    }
  });
});

describe("applyPuzzleCommand", () => {
  it("rejects when there is no puzzle on screen", () => {
    expect(run(null, { action: "puzzleGrab", pieceId: id0 })).toEqual({ ok: false, message: API_ERRORS.PUZZLE_NOT_ACTIVE });
    expect(run({ ...base(), puzzle: undefined }, { action: "puzzleGrab", pieceId: id0 }).ok).toBe(false);
    expect(run({ ...base(), slide: { id: "slide-0001", imageUrl: "https://a/1.webp" } }, { action: "puzzleGrab", pieceId: id0 }).ok).toBe(false);
  });

  it("rejects an unknown piece", () => {
    expect(run(base(), { action: "puzzleGrab", pieceId: "nope" })).toEqual({ ok: false, message: API_ERRORS.PUZZLE_PIECE_NOT_FOUND });
  });

  it("grab sets the holder, bumps seq and blocks others until it expires", () => {
    const held = ok(run(base(), { action: "puzzleGrab", pieceId: id0 }));

    expect(held.seq).toBe(6);
    expect(held.puzzle?.pieces[id0].holder).toEqual({ userId: "u1", name: "Аліса", until: 1_000 + PUZZLE_HOLD_MS });
    expect(run(held, { action: "puzzleGrab", pieceId: id0 }, bob, 2_000)).toEqual({ ok: false, message: API_ERRORS.PUZZLE_PIECE_TAKEN });
    expect(run(held, { action: "puzzleGrab", pieceId: id0 }, alice, 2_000).ok).toBe(true);
    expect(ok(run(held, { action: "puzzleGrab", pieceId: id0 }, bob, 1_000 + PUZZLE_HOLD_MS)).puzzle?.pieces[id0].holder?.userId).toBe("u2");
  });

  it("keepAlive extends the hold; only the holder may", () => {
    const held = ok(run(base(), { action: "puzzleGrab", pieceId: id0 }));

    const kept = ok(run(held, { action: "puzzleKeepAlive", pieceId: id0 }, alice, 11_000));

    expect(kept.puzzle?.pieces[id0].holder?.until).toBe(11_000 + PUZZLE_HOLD_MS);
    expect(run(held, { action: "puzzleKeepAlive", pieceId: id0 }, bob).ok).toBe(false);
    expect(run(base(), { action: "puzzleKeepAlive", pieceId: id0 }).ok).toBe(false);
  });

  it("drop away from home keeps the piece on the board, clamps and normalizes rotation", () => {
    const held = ok(run(base(), { action: "puzzleGrab", pieceId: id0 }));

    const dropped = ok(run(held, { action: "puzzleDrop", pieceId: id0, x: -50, y: 99999, rot: 765 }));

    expect(dropped.puzzle?.pieces[id0]).toEqual({ x: 0, y: 800, rot: 45, place: "board", correct: false });
  });

  it("drop within the snap radius with rot 0 snaps home and is correct", () => {
    const held = ok(run(base(), { action: "puzzleGrab", pieceId: id0 }));

    const near = PUZZLE_SNAP * pieceSize(pieces) * 0.9;

    const dropped = ok(run(held, { action: "puzzleDrop", pieceId: id0, x: home0.x + near, y: home0.y, rot: 0 }));

    expect(dropped.puzzle?.pieces[id0]).toEqual({ x: Math.round(home0.x), y: Math.round(home0.y), rot: 0, place: "board", correct: true });
    expect(dropped.puzzle?.pieces[id0].holder).toBeUndefined();
  });

  it("wrong rotation or too far is not correct", () => {
    const held = ok(run(base(), { action: "puzzleGrab", pieceId: id0 }));

    expect(ok(run(held, { action: "puzzleDrop", pieceId: id0, x: home0.x, y: home0.y, rot: 45 })).puzzle?.pieces[id0].correct).toBe(false);
    expect(ok(run(held, { action: "puzzleDrop", pieceId: id0, x: home0.x + pieceSize(pieces), y: home0.y, rot: 0 })).puzzle?.pieces[id0].correct).toBe(false);
  });

  it("solved once every piece is correct; grabbing a correct piece un-corrects it", () => {
    let show = base();

    for (const p of pieces) {
      show = ok(run(show, { action: "puzzleGrab", pieceId: p.id }));
      show = ok(run(show, { action: "puzzleDrop", pieceId: p.id, x: p.home.x, y: p.home.y, rot: 0 }));
    }

    expect(show.puzzle?.solved).toBe(true);

    const regrab = ok(run(show, { action: "puzzleGrab", pieceId: id0 }, bob));

    expect(regrab.puzzle?.pieces[id0].correct).toBe(false);
    expect(regrab.puzzle?.solved).toBe(false);
  });

  it("drop/return by a non-holder is rejected; return keeps rotation", () => {
    const held = ok(run(base(), { action: "puzzleGrab", pieceId: id0 }));

    expect(run(held, { action: "puzzleDrop", pieceId: id0, x: 1, y: 1, rot: 0 }, bob)).toEqual({ ok: false, message: API_ERRORS.PUZZLE_NOT_HOLDER });
    expect(run(held, { action: "puzzleReturn", pieceId: id0 }, bob).ok).toBe(false);

    const dropped = ok(run(held, { action: "puzzleDrop", pieceId: id0, x: 10, y: 10, rot: 90 }));

    const regrab = ok(run(dropped, { action: "puzzleGrab", pieceId: id0 }));

    const back = ok(run(regrab, { action: "puzzleReturn", pieceId: id0 }));

    expect(back.puzzle?.pieces[id0]).toMatchObject({ place: "tray", rot: 90 });
    expect(back.puzzle?.pieces[id0].holder).toBeUndefined();
  });

  it("an expired holder is cleared by any command", () => {
    const held = ok(run(base(), { action: "puzzleGrab", pieceId: id0 }));

    const later = ok(run(held, { action: "puzzleGrab", pieceId: id1 }, bob, 1_000 + PUZZLE_HOLD_MS + 1));

    expect(later.puzzle?.pieces[id0].holder).toBeUndefined();
    expect(later.puzzle?.pieces[id1].holder?.userId).toBe("u2");
  });

  it("release and reset are DM-only", () => {
    const held = ok(run(base(), { action: "puzzleGrab", pieceId: id0 }));

    expect(run(held, { action: "puzzleRelease" }).ok).toBe(false);
    expect(run(held, { action: "puzzleReset" })).toEqual({ ok: false, message: API_ERRORS.FORBIDDEN });
    expect(run(held, { action: "puzzleRelease", pieceId: id0 }, dm).ok).toBe(true);
  });

  it("DM release clears one or all holds", () => {
    let show = ok(run(base(), { action: "puzzleGrab", pieceId: id0 }));

    show = ok(run(show, { action: "puzzleGrab", pieceId: id1 }, bob));

    const one = ok(run(show, { action: "puzzleRelease", pieceId: id0 }, dm));

    expect(one.puzzle?.pieces[id0].holder).toBeUndefined();
    expect(one.puzzle?.pieces[id1].holder).toBeDefined();
    expect(Object.values(ok(run(show, { action: "puzzleRelease" }, dm)).puzzle!.pieces).every((p) => !p.holder)).toBe(true);
  });

  it("reset restores the initial state", () => {
    const held = ok(run(base(), { action: "puzzleGrab", pieceId: id0 }));

    const reset = ok(run(held, { action: "puzzleReset" }, dm));

    expect(reset.puzzle).toEqual(initPuzzle(spec));
    expect(reset.seq).toBe(held.seq + 1);
  });

  it("rounds coordinates to integers", () => {
    const held = ok(run(base(), { action: "puzzleGrab", pieceId: id0 }));

    const dropped = ok(run(held, { action: "puzzleDrop", pieceId: id0, x: 10.6, y: 20.4, rot: 0 }));

    expect(dropped.puzzle?.pieces[id0]).toMatchObject({ x: 11, y: 20 });

    for (const p of Object.values(initPuzzle(spec).pieces)) {
      expect(Number.isInteger(p.x)).toBe(true);
      expect(Number.isInteger(p.y)).toBe(true);
    }
  });

  it("a player holds one piece: grabbing another returns the previous to the tray", () => {
    let show = ok(run(base(), { action: "puzzleGrab", pieceId: id0 }));

    show = ok(run(show, { action: "puzzleDrop", pieceId: id0, x: 10, y: 10, rot: 90 }));
    show = ok(run(show, { action: "puzzleGrab", pieceId: id0 }));
    show = ok(run(show, { action: "puzzleGrab", pieceId: id1 }));

    expect(show.puzzle?.pieces[id0]).toMatchObject({ place: "tray", correct: false });
    expect(show.puzzle?.pieces[id0].holder).toBeUndefined();
    expect(show.puzzle?.pieces[id1].holder?.userId).toBe("u1");
    expect(ok(run(show, { action: "puzzleGrab", pieceId: id0 }, bob)).puzzle?.pieces[id0].holder?.userId).toBe("u2");
  });

  it("prototype keys are not pieces", () => {
    for (const pieceId of ["constructor", "__proto__", "toString"]) {
      expect(run(base(), { action: "puzzleGrab", pieceId })).toEqual({ ok: false, message: API_ERRORS.PUZZLE_PIECE_NOT_FOUND });
    }

    expect(run(base(), { action: "puzzleRelease", pieceId: "constructor" }, dm)).toEqual({ ok: false, message: API_ERRORS.PUZZLE_PIECE_NOT_FOUND });
  });

  it("player commands are rejected while the puzzle is hidden; DM release/reset still work", () => {
    for (const hidden of [{ curtain: true }, { world: { mapId: "m" } }, { battle: { id: "b" } }]) {
      const show = { ...base(), ...hidden } as ShowState;

      expect(run(show, { action: "puzzleGrab", pieceId: id0 })).toEqual({ ok: false, message: API_ERRORS.PUZZLE_NOT_ACTIVE });
      expect(run(show, { action: "puzzleRelease" }, dm).ok).toBe(true);
      expect(run(show, { action: "puzzleReset" }, dm).ok).toBe(true);
    }
  });
});
