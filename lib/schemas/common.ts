import { z } from "zod";

export const hexColorSchema = (message = "Колір — у форматі #RRGGBB") => z.string().regex(/^#[0-9a-f]{6}$/i, message);

export const urlField = (max?: number, message?: string) => {
  const url = z.string().url(message);

  return max === undefined ? url : url.max(max);
};
