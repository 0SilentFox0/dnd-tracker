"use client";

import { type ComponentProps, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/labeled-input";

interface PasswordInputProps extends Omit<ComponentProps<typeof Input>, "type"> {
  label: string;
  error?: string;
  description?: string;
}

export function PasswordInput({ label, error, description, id, ...props }: PasswordInputProps) {
  const t = useTranslations("auth");

  const [visible, setVisible] = useState(false);

  const inputId = id ?? `password-${props.name}`;

  return (
    <FormField label={label} htmlFor={inputId} error={error} description={description}>
      <div className="relative">
        <Input id={inputId} type={visible ? "text" : "password"} aria-invalid={!!error || undefined} className="pr-10" {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("password.hide") : t("password.show")}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center text-hud-muted hover:text-hud-gold"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </FormField>
  );
}
