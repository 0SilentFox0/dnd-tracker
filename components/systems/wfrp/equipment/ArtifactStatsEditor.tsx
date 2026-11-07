"use client";

import { useTranslations } from "next-intl";

import type { ArtifactStatsEditorProps } from "../../types";
import { ArmourFields } from "./ArmourFields";
import { NumberField } from "./NumberField";
import { QualityListEditor } from "./QualityListEditor";
import { WeaponFields } from "./WeaponFields";

import { Button } from "@/components/ui/button";
import { useArtifactStatsDraft } from "@/lib/hooks/systems/wfrp";

export function ArtifactStatsEditor(props: ArtifactStatsEditorProps) {
  const t = useTranslations("wfrpEquipmentEditor.editor");

  const { draft, valid, update, clear, hasValue } = useArtifactStatsDraft(props);

  return (
    <div className="space-y-4">
      <p className="text-sm text-hud-muted">{t("hint")}</p>
      {draft.type === "armour" && <ArmourFields value={draft} onChange={update} />}
      {draft.type === "weapon" && <WeaponFields value={draft} onChange={update} />}
      {draft.type === "gear" && <QualityListEditor id="wfrp-gear-q" label={t("qualities")} kind="quality" value={draft.qualities} onChange={(qualities) => update({ ...draft, qualities })} />}
      <div className="grid grid-cols-2 gap-3">
        <NumberField id="wfrp-stats-weight" label={t("weight")} value={draft.weight} max={1000} onChange={(n) => update({ ...draft, weight: n ?? 0 })} />
        <NumberField id="wfrp-stats-price" label={t("price")} value={draft.price} max={1_000_000} onChange={(n) => update({ ...draft, price: n ?? 0 })} />
      </div>
      {!valid && (
        <p role="alert" className="text-sm text-destructive">
          {t("invalid")}
        </p>
      )}
      {(hasValue || !valid) && (
        <Button type="button" variant="outline" className="min-h-11" onClick={clear}>
          {t("clear")}
        </Button>
      )}
    </div>
  );
}
