export const upcastSteps = (spellLevel: number, castLevel: number): number =>
    Math.max(0, castLevel - spellLevel);
