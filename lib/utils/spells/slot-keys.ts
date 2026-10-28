export const PACT_KEY = "pact";

export type StoredSpellSlots = Record<string, { max: number; current: number; level?: number }>;

export const slotLevel = (slots: Record<string, { level?: number }>, key: string): number => (key === PACT_KEY ? (slots[PACT_KEY]?.level ?? 0) : Number(key) || 0);

export const slotRestoreOrder = (slots: Record<string, unknown>): string[] =>
  Object.keys(slots).sort((a, b) => (a === PACT_KEY ? Infinity : Number(a)) - (b === PACT_KEY ? Infinity : Number(b)));

export const pactSlot = (slots: StoredSpellSlots | undefined) => slots?.[PACT_KEY];
