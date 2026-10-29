import { z } from "zod";

export const hexColorSchema = (message = "Колір — у форматі #RRGGBB") => z.string().regex(/^#[0-9a-f]{6}$/i, message);
