"use client";

import { useTranslations } from "next-intl";

import { FormError, useFormErrors } from "@/components/auth/AuthParts";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants/auth";
import { newPasswordSchema, type NewPasswordValues } from "@/lib/schemas/auth";

interface NewPasswordFormProps {
  pending: boolean;
  error: string | null;
  submitLabel: string;
  onSubmit: (values: NewPasswordValues) => void;
}

export function NewPasswordForm({ pending, error, submitLabel, onSubmit }: NewPasswordFormProps) {
  const t = useTranslations("auth");

  const tRoot = useTranslations();

  const { errors, read } = useFormErrors();

  return (
    <form
      noValidate
      onSubmit={(e) => {
        const values = read(newPasswordSchema, e);

        if (values) onSubmit(values);
      }}
      className="space-y-3"
    >
      <PasswordInput
        label={t("newPassword.label")}
        name="password"
        autoComplete="new-password"
        error={errors.password}
        description={tRoot("validation.minLength", { minimum: PASSWORD_MIN_LENGTH })}
      />
      <PasswordInput label={t("common.confirmPassword")} name="confirm" autoComplete="new-password" error={errors.confirm} />
      <FormError message={error} />
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? tRoot("common.actions.saving") : submitLabel}
      </Button>
    </form>
  );
}
