"use client";

import { useTranslations } from "next-intl";

import type { ResourceFieldsProps } from "@/components/systems/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResourceFields({ values, onChange }: ResourceFieldsProps) {
  const t = useTranslations("rest.resources");

  return (
    <div>
      <Label htmlFor="res-sin">{t("sin")}</Label>
      <Input id="res-sin" type="number" min={0} max={10} value={values.sin ?? ""} onChange={(e) => onChange("sin", e.target.value)} />
    </div>
  );
}
