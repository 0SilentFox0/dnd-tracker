export const HIDE_ALL_HINTS_KEY = "hint:*";

export const WHATS_NEW_KEY = "whats-new";

export const CHECKLIST_HIDDEN = "hidden";

const CHECKLIST_PREFIX = "checklist:";

export const hintKey = (id: string) => `hint:${id}`;

export const checklistKey = (campaignId: string) => `${CHECKLIST_PREFIX}${campaignId}`;

export const FLAG_KEY_RE = /^(?:hint:(?:\*|[a-z0-9][a-z0-9.-]{0,63})|checklist:[a-z0-9]{1,40}|whats-new)$/;

export const campaignIdFromChecklistKey = (key: string): string | null => (key.startsWith(CHECKLIST_PREFIX) ? key.slice(CHECKLIST_PREFIX.length) : null);
