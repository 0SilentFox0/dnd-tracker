"use client";

import { useTranslations } from "next-intl";

import type { ResourceFieldsProps } from "@/components/systems/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_EXHAUSTION } from "@/lib/utils/battle/conditions";

export function ResourceFields({ values, onChange }: ResourceFieldsProps) {
  const t = useTranslations("rest.resources");

  return (
    <>
      <div>
        <Label htmlFor="res-temp">{t("tempHp")}</Label>
        <Input id="res-temp" type="number" min={0} value={values.tempHp ?? ""} onChange={(e) => onChange("tempHp", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="res-exh">{t("exhaustion")}</Label>
        <Input id="res-exh" type="number" min={0} max={MAX_EXHAUSTION} value={values.exhaustion ?? ""} onChange={(e) => onChange("exhaustion", e.target.value)} />
      </div>
    </>
  );
}
