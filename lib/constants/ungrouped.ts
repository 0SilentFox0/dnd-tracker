export const UNGROUPED_KEY = "\u0000ungrouped";

export const isUngroupedKey = (key: string): boolean => key === UNGROUPED_KEY;

export const groupDisplayName = (key: string, ungroupedLabel: string): string => (isUngroupedKey(key) ? ungroupedLabel : key);
