export interface IdName {
  id: string;
  name: string;
}

/** Очікувана відмова без винятку: message — текст для користувача (часто з API_ERRORS) */
export type Result<T> = { ok: true; value: T } | { ok: false; message: string };
