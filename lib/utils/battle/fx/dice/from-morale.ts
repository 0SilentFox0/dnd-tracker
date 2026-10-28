import type { DiceThrowSpec } from "./from-action";

export interface MoraleThrow {
  key: string;
  spec: DiceThrowSpec;
}

export function moraleThrowOf(input: { round: number; turnIndex: number; pending: { participantId: string; d10Roll: number } | null; visible: boolean }): MoraleThrow | null {
  const { round, turnIndex, pending, visible } = input;

  if (!pending || !visible) return null;

  const key = `${round}:${turnIndex}:${pending.participantId}:${pending.d10Roll}`;

  let seed = 7;

  for (let i = 0; i < key.length; i++) seed = (Math.imul(seed, 31) + key.charCodeAt(i)) | 0;

  return { key, spec: { seed: Math.abs(seed), groups: [[{ sides: 10, value: pending.d10Roll }]] } };
}
