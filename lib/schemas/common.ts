import { z } from "zod";

export const hexColorSchema = (message = "validation.hexColor") => z.string().regex(/^#[0-9a-f]{6}$/i, message);
