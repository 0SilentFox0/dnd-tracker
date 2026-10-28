export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

export const parseCommaList = (text: string): string[] => text.split(",").map((s) => s.trim()).filter(Boolean);
