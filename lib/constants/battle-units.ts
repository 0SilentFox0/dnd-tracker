/** Скільки однакових юнітів можна додати за раз — у налаштуванні бою і в діалозі ДМ. */
export const UNIT_QUANTITY = { min: 1, max: 20 } as const;

export const clampUnitQuantity = (value: number) => Math.max(UNIT_QUANTITY.min, Math.min(UNIT_QUANTITY.max, Math.trunc(value) || UNIT_QUANTITY.min));
