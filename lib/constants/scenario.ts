// types/scenario.ts derives its unions from these arrays, so this file must not import from it (import/no-cycle)
export const PAGE_KINDS = ["scene", "hero", "note"] as const;
export const PAGE_STATUSES = ["draft", "ready", "personal"] as const;
export const CALLOUT_KINDS = ["choice", "shadow", "check", "event", "artifact", "token", "hero", "goal", "confide"] as const;
export const LEGEND_KINDS = ["read", "choice", "token", "artifact", "shadow", "check", "notes"] as const;
export const MENTION_TYPES = ["unit", "artifact", "character", "spell", "battle"] as const;
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
export const UNARCHED_LABEL = "Без арки";

export const PAGE_KIND_LABELS: Record<(typeof PAGE_KINDS)[number], string> = { scene: "Сцена", hero: "Герой", note: "Нотатка" };
export const PAGE_STATUS_LABELS: Record<(typeof PAGE_STATUSES)[number], string> = { draft: "У роботі", ready: "Готова", personal: "Особиста" };
export const CALLOUT_LABELS: Record<(typeof CALLOUT_KINDS)[number], string> = {
  choice: "Вибір гравців", shadow: "Тіньова лінія", check: "Перевірка", event: "Подія", artifact: "Артефакт",
  token: "Жетон", hero: "На що звертати увагу", goal: "Ціль", confide: "Таємне",
};
export const LEGEND_LABELS: Record<(typeof LEGEND_KINDS)[number], string> = {
  read: "Читати вголос і події", choice: "Вибір гравців", token: "Жетон", artifact: "Міні-квест і артефакт",
  shadow: "Тіньова лінія", check: "Перевірка уважності", notes: "Нотатки майстра",
};
export const MENTION_LABELS: Record<(typeof MENTION_TYPES)[number], string> = { unit: "Юніт", artifact: "Артефакт", character: "Персонаж", spell: "Заклинання", battle: "Бій" };

export const DEFAULT_SCENE_LEGEND: { kind: (typeof LEGEND_KINDS)[number]; label: string }[] = LEGEND_KINDS.map((kind) => ({ kind, label: LEGEND_LABELS[kind] }));
export const SECTION_ICON_KEYS = ["scene", "battle", "secret", "choice", "journey", "dialogue", "rest", "prep"] as const;
export const SECTION_ICON_LABELS: Record<(typeof SECTION_ICON_KEYS)[number], string> = {
  scene: "Сцена", battle: "Бій", secret: "Таємниця", choice: "Вибір", journey: "Подорож", dialogue: "Діалог", rest: "Відпочинок", prep: "Підготовка",
};
