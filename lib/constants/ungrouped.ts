export const UNGROUPED_KEY = "\u0000ungrouped";

export const UNGROUPED_LABELS = {
  spellGroup: "Без групи",
  mainSkill: "Без основного навику",
  race: "Без раси",
  artifactSet: "Без сету",
  branch: "Без гілки",
} as const;

export const isUngroupedKey = (key: string): boolean => key === UNGROUPED_KEY;

export const groupDisplayName = (key: string, ungroupedLabel: string): string => (isUngroupedKey(key) ? ungroupedLabel : key);
