"use client";

import { type FormEvent, useState } from "react";

import { FormError } from "@/components/auth/AuthParts";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants/auth";
import { newPasswordSchema, type NewPasswordValues } from "@/lib/schemas/auth";
import { parseForm } from "@/lib/utils/auth";

interface NewPasswordFormProps {
  pending: boolean;
  error: string | null;
  submitLabel: string;
  onSubmit: (values: NewPasswordValues) => void;
}

export function NewPasswordForm({ pending, error, submitLabel, onSubmit }: NewPasswordFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const result = parseForm(newPasswordSchema, e.currentTarget);

    setErrors(result.errors ?? {});

    if (result.data) onSubmit(result.data);
  };

  return (
    <form noValidate onSubmit={submit} className="space-y-3">
      <PasswordInput label="Новий пароль" name="password" autoComplete="new-password" error={errors.password} description={`Щонайменше ${PASSWORD_MIN_LENGTH} символів`} />
      <PasswordInput label="Повторіть пароль" name="confirm" autoComplete="new-password" error={errors.confirm} />
      <FormError message={error} />
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Збереження..." : submitLabel}
      </Button>
    </form>
  );
}
