export const SYNC_TABLE_SCOPES = ["spellGroups", "races", "units", "spells", "mainSkills", "skills", "skillTrees", "artifactSets", "artifacts", "tracks"] as const;

export const SYNC_SCOPES = [...SYNC_TABLE_SCOPES, "rules", "settings"] as const;

export const SYNC_STATUSES = ["new", "updated", "conflict", "deletedInSource", "deletedLocally"] as const;

export const SYNC_SCOPE_LABELS = {
  rules: "Правила",
  settings: "Налаштування",
  spellGroups: "Школи магії",
  races: "Раси",
  units: "Юніти",
  spells: "Заклинання",
  mainSkills: "Основні скіли",
  skills: "Скіли",
  skillTrees: "Дерева прокачки",
  artifactSets: "Сети артефактів",
  artifacts: "Артефакти",
  tracks: "Музика",
} as const satisfies Record<(typeof SYNC_SCOPES)[number], string>;

export const SYNC_STATUS_LABELS = {
  new: "Нове",
  updated: "Оновлено",
  conflict: "Конфлікт",
  deletedInSource: "Видалено в джерелі",
  deletedLocally: "Видалено у вас",
} as const satisfies Record<(typeof SYNC_STATUSES)[number], string>;

export const SYNC_DEFAULT_ON: ReadonlySet<string> = new Set(["new", "updated"]);

export const syncStatusLabel = (status: (typeof SYNC_STATUSES)[number], fromTemplate: boolean) => (fromTemplate && status === "deletedInSource" ? "Видалено в шаблоні" : SYNC_STATUS_LABELS[status]);

export const syncTitle = (isTemplate: boolean) => (isTemplate ? "Оновлення з джерела" : "Оновлення з шаблону");
