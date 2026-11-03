export const HIDE_ALL_HINTS_KEY = "hint:*";

export const WHATS_NEW_KEY = "whats-new";

export const CHECKLIST_HIDDEN = "hidden";

// окремо від hint:*, щоб «Сховати/показати всі підказки» не міняли прогрес чекліста
export const PLAYER_SHEET_SEEN_KEY = "seen:player-sheet";

export const DEMO_TOUR_IDS = ["dashboard", "scenario", "show", "world", "music", "libraries", "battle"] as const;

export type DemoTourId = (typeof DEMO_TOUR_IDS)[number];

export const demoTourFlagKey = (id: DemoTourId) => `demo-tour:${id}`;

const CHECKLIST_PREFIX = "checklist:";

export const hintKey = (id: string) => `hint:${id}`;

export const checklistKey = (campaignId: string) => `${CHECKLIST_PREFIX}${campaignId}`;

export const FLAG_KEY_RE = new RegExp(`^(?:hint:(?:\\*|[a-z0-9][a-z0-9.-]{0,63})|checklist:[a-z0-9]{1,40}|whats-new|seen:player-sheet|demo-tour:(?:${DEMO_TOUR_IDS.join("|")}))$`);

export const campaignIdFromChecklistKey = (key: string): string | null => (key.startsWith(CHECKLIST_PREFIX) ? key.slice(CHECKLIST_PREFIX.length) : null);
