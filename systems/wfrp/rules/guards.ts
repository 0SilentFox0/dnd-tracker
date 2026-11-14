export const isInt = (v: unknown, min: number, max: number): v is number =>
    typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

export const isStr = (v: unknown, min: number, max: number): v is string =>
    typeof v === 'string' && v.length >= min && v.length <= max;
