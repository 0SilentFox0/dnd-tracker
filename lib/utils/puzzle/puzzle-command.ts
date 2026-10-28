import { generatePuzzle, mulberry32, pieceSize } from "./generate";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { PUZZLE_HOLD_MS, PUZZLE_SNAP } from "@/lib/constants/show";
import type { Result } from "@/types/common";
import type { PuzzleCommand, PuzzlePieceState, PuzzleSpec, PuzzleState, ShowState } from "@/types/show";

interface Ctx {
  now: number;
  user: { id: string; name: string; isDM: boolean };
}

const ROT_STEP = 45;

export function initPuzzle(spec: PuzzleSpec): PuzzleState {
  const rng = mulberry32(spec.seed ^ 0x9e3779b9);

  const pieces = generatePuzzle(spec);

  const order = pieces.map((p) => ({ p, k: rng() })).sort((a, b) => a.k - b.k);

  const state: Record<string, PuzzlePieceState> = {};

  for (const { p } of order) state[p.id] = { x: p.home.x, y: p.home.y, rot: Math.floor(rng() * 8) * ROT_STEP, place: "tray", correct: false };

  return { pieces: state, solved: false };
}

const normRot = (rot: number) => (((Math.round(rot / ROT_STEP) * ROT_STEP) % 360) + 360) % 360;

const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);

const fail = (message: string): Result<ShowState> => ({ ok: false, message });

function withoutExpired(puzzle: PuzzleState, now: number): PuzzleState {
  if (!Object.values(puzzle.pieces).some((p) => p.holder && p.holder.until <= now)) return puzzle;

  const pieces = Object.fromEntries(
    Object.entries(puzzle.pieces).map(([id, p]) => {
      if (!p.holder || p.holder.until > now) return [id, p];

      const { holder: _holder, ...rest } = p;

      return [id, rest];
    }),
  );

  return { ...puzzle, pieces };
}

function patchPiece(puzzle: PuzzleState, id: string, patch: Partial<PuzzlePieceState>, drop: (keyof PuzzlePieceState)[] = []): PuzzleState {
  const piece = { ...puzzle.pieces[id], ...patch };

  for (const key of drop) delete piece[key];

  const pieces = { ...puzzle.pieces, [id]: piece };

  return { pieces, solved: Object.values(pieces).every((p) => p.correct) };
}

const commit = (prev: ShowState, puzzle: PuzzleState): Result<ShowState> => ({ ok: true, value: { ...prev, puzzle, seq: prev.seq + 1 } });

export function applyPuzzleCommand(prev: ShowState | null, cmd: PuzzleCommand, ctx: Ctx): Result<ShowState> {
  const spec = prev?.slide?.kind === "puzzle" ? prev.slide.puzzle : undefined;

  if (!prev || !prev.puzzle || !spec) return fail(API_ERRORS.PUZZLE_NOT_ACTIVE);

  const { user, now } = ctx;

  if (cmd.action === "puzzleReset" || cmd.action === "puzzleRelease") {
    if (!user.isDM) return fail(API_ERRORS.FORBIDDEN);

    if (cmd.action === "puzzleReset") return commit(prev, initPuzzle(spec));

    const current = withoutExpired(prev.puzzle, now);

    if (cmd.pieceId && !current.pieces[cmd.pieceId]) return fail(API_ERRORS.PUZZLE_PIECE_NOT_FOUND);

    const ids = cmd.pieceId ? [cmd.pieceId] : Object.keys(current.pieces);

    return commit(
      prev,
      ids.reduce((acc, id) => patchPiece(acc, id, {}, ["holder"]), current),
    );
  }

  const puzzle = withoutExpired(prev.puzzle, now);

  const piece = puzzle.pieces[cmd.pieceId];

  if (!piece) return fail(API_ERRORS.PUZZLE_PIECE_NOT_FOUND);

  const mine = piece.holder?.userId === user.id;

  if (cmd.action === "puzzleGrab") {
    if (piece.holder && !mine) return fail(API_ERRORS.PUZZLE_PIECE_TAKEN);

    return commit(prev, patchPiece(puzzle, cmd.pieceId, { correct: false, holder: { userId: user.id, name: user.name, until: now + PUZZLE_HOLD_MS } }));
  }

  if (!mine) return fail(API_ERRORS.PUZZLE_NOT_HOLDER);

  switch (cmd.action) {
    case "puzzleKeepAlive":
      return commit(prev, patchPiece(puzzle, cmd.pieceId, { holder: { userId: user.id, name: user.name, until: now + PUZZLE_HOLD_MS } }));
    case "puzzleReturn":
      return commit(prev, patchPiece(puzzle, cmd.pieceId, { place: "tray", correct: false }, ["holder"]));
    case "puzzleDrop": {
      const pieces = generatePuzzle(spec);

      const home = pieces.find((p) => p.id === cmd.pieceId)?.home;

      if (!home) return fail(API_ERRORS.PUZZLE_PIECE_NOT_FOUND);

      const rot = normRot(cmd.rot);

      const x = clamp(cmd.x, spec.imageWidth);

      const y = clamp(cmd.y, spec.imageHeight);

      const correct = rot === 0 && Math.hypot(x - home.x, y - home.y) <= PUZZLE_SNAP * pieceSize(pieces);

      return commit(prev, patchPiece(puzzle, cmd.pieceId, correct ? { x: home.x, y: home.y, rot, place: "board", correct } : { x, y, rot, place: "board", correct }, ["holder"]));
    }
  }
}
