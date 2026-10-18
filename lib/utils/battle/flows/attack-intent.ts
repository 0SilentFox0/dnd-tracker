export interface AttackIntent {
  targetId: string;
  attackId?: string;
  actorId: string;
  round: number;
  turnIndex: number;
}

interface TurnPoint {
  round: number;
  turnIndex: number;
}

export function isIntentStale(intent: AttackIntent, turn: TurnPoint): boolean {
  return intent.round !== turn.round || intent.turnIndex !== turn.turnIndex;
}

export function canConsumeIntent(
  intent: AttackIntent,
  turn: TurnPoint & { heroId: string; phase: string; actionUsed: boolean; skipped: boolean },
): boolean {
  return !isIntentStale(intent, turn) && intent.actorId === turn.heroId && turn.phase === "acting" && !turn.actionUsed && !turn.skipped;
}
