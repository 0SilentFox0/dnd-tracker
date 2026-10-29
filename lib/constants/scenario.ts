// types/scenario.ts derives its unions from these arrays, so this file must not import from it (import/no-cycle)
export const PAGE_KINDS = ["scene", "hero", "note"] as const;
export const PAGE_STATUSES = ["draft", "ready", "personal"] as const;
export const CALLOUT_KINDS = ["choice", "shadow", "check", "event", "artifact", "token", "hero", "goal", "confide"] as const;
export const LEGEND_KINDS = ["read", "choice", "token", "artifact", "shadow", "check", "notes"] as const;
export const MENTION_TYPES = ["unit", "artifact", "character", "spell", "battle", "marker", "acquaintance"] as const;
export const NODE_TYPES = [
  "doc", "paragraph", "text", "heading", "hardBreak", "bulletList", "orderedList", "listItem",
  "readAloud", "say", "callout", "token", "mention", "table", "tableRow", "tableCell", "tableHeader",
] as const;
export const MARK_TYPES = ["bold", "italic", "secret"] as const;

export const SCENARIO_MAX_CONTENT_BYTES = 512 * 1024;
export const SCENARIO_VERSION_INTERVAL_MS = 10 * 60 * 1000;
export const SCENARIO_MAX_VERSIONS = 50;
export const SCENARIO_MAX_LEGEND = 12;
export const SCENARIO_AUTOSAVE_MS = 1500;
export const SCENARIO_SEARCH_LIMIT = 20;
export const SCENARIO_MENTION_LIMIT = 5;
export const SECTION_ICON_KEYS = ["scene", "battle", "secret", "choice", "journey", "dialogue", "rest", "prep"] as const;
