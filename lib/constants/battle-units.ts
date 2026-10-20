/** Скільки однакових юнітів можна додати за раз у налаштуванні бою. */
export const UNIT_QUANTITY = { min: 1, max: 20 } as const;

/** Діалог ДМ «Додати учасника» — сервер add-participant приймає не більше 10. */
export const DM_ADD_UNIT_QUANTITY = { min: 1, max: 10 } as const;

type QuantityRange = { readonly min: number; readonly max: number };

export const clampUnitQuantity = (value: number, range: QuantityRange = UNIT_QUANTITY) =>
  Math.max(range.min, Math.min(range.max, Math.trunc(value) || range.min));
