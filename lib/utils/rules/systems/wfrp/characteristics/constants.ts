export const CHARACTERISTIC_KEYS = ["ws", "bs", "s", "t", "i", "ag", "dex", "int", "wp", "fel"] as const;

export type CharacteristicKey = (typeof CHARACTERISTIC_KEYS)[number];

export const SKILL_KEY_RE = /^[a-z][a-z0-9-]{0,39}$/;

export const SPEC_RE = /^[a-z0-9-]{1,40}$/;

export const SKILL_ADVANCE_KEY_RE = /^[a-z][a-z0-9-]{0,39}(:[a-z0-9-]{1,40})?$/;
