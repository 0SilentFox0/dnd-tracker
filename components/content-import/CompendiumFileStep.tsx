"use client";
import { useTranslations } from "next-intl";

import { FormAlert } from "@/components/common/states";
import { HudPanel } from "@/components/hud/page";
import { Input } from "@/components/ui/input";
import type { CompendiumImportController } from "@/lib/hooks/compendium-import";

export function CompendiumFileStep({ wizard }: { wizard: CompendiumImportController }) {
  const t = useTranslations("compendium.file");

  const { busy, error } = wizard.state;

  return <HudPanel className="space-y-3">
    <p className="text-sm">{t("intro")}</p>
    <p className="text-sm text-hud-muted">{t("csvHint")}</p>
    <label className="block text-sm">{t("label")}<Input className="mt-2" type="file" accept=".json,application/json" disabled={busy} onChange={e => { const file = e.target.files?.[0];

      if (file) void wizard.actions.selectFile(file); }} /></label>
    {busy && <p role="status" className="text-sm text-hud-muted">{t("busy")}</p>}
    {error && <FormAlert>{error}</FormAlert>}
  </HudPanel>;
}
