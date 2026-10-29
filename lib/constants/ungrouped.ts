/* eslint-disable no-restricted-syntax -- TODO(i18n-part6 task 11): uk labels stay until their consumers in tasks 2-9 read keys */
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
