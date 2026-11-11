import { z } from "zod";

export const SystemDataSchema = z.record(z.string(), z.unknown());

export const hexColorSchema = (message = "validation.hexColor") => z.string().regex(/^#[0-9a-f]{6}$/i, message);

export const urlField = (max?: number, message?: string) => {
  const url = z.string().url(message);

  return max === undefined ? url : url.max(max);
};
