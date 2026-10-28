import { z } from "zod";

import "@/lib/i18n/zod-errors";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants/auth";

const email = z.string().trim().toLowerCase().pipe(z.email("validation.email"));

const newPassword = z.string().min(PASSWORD_MIN_LENGTH, "validation.minLength").max(72, "validation.maxLength");

const confirmed = <T extends { password: string; confirm: string }>(v: T) => v.password === v.confirm;

const MISMATCH = { message: "validation.passwordMismatch", path: ["confirm"] };

export const emailSchema = z.object({ email });

export const signInSchema = z.object({ email, password: z.string().min(1, "validation.required") });

export const signUpSchema = z
  .object({ displayName: z.string().trim().min(2, "validation.minLength").max(50, "validation.maxLength"), email, password: newPassword, confirm: z.string() })
  .refine(confirmed, MISMATCH);

export const newPasswordSchema = z.object({ password: newPassword, confirm: z.string() }).refine(confirmed, MISMATCH);

export type SignInValues = z.infer<typeof signInSchema>;

export type SignUpValues = z.infer<typeof signUpSchema>;

export type NewPasswordValues = z.infer<typeof newPasswordSchema>;
