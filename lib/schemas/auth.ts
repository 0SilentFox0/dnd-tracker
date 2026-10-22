import { z } from "zod";

import { PASSWORD_MIN_LENGTH } from "@/lib/constants/auth";

const email = z.string().trim().toLowerCase().pipe(z.email("Некоректна адреса пошти"));

const newPassword = z.string().min(PASSWORD_MIN_LENGTH, `Щонайменше ${PASSWORD_MIN_LENGTH} символів`).max(72, "Не більше 72 символів");

const confirmed = <T extends { password: string; confirm: string }>(v: T) => v.password === v.confirm;

const MISMATCH = { message: "Паролі не збігаються", path: ["confirm"] };

export const emailSchema = z.object({ email });

export const signInSchema = z.object({ email, password: z.string().min(1, "Введіть пароль") });

export const signUpSchema = z
  .object({ displayName: z.string().trim().min(2, "Щонайменше 2 символи").max(50, "Не більше 50 символів"), email, password: newPassword, confirm: z.string() })
  .refine(confirmed, MISMATCH);

export const newPasswordSchema = z.object({ password: newPassword, confirm: z.string() }).refine(confirmed, MISMATCH);

export type SignInValues = z.infer<typeof signInSchema>;

export type SignUpValues = z.infer<typeof signUpSchema>;

export type NewPasswordValues = z.infer<typeof newPasswordSchema>;
