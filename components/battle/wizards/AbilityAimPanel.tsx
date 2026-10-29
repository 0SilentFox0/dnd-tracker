import { useTranslations } from "next-intl";

import { MapAimPanel } from "./MapAimPanel";

/** Поки вміння наводиться на карту, вибір закритий. */
export function AbilityAimPanel({ name, onCancel }: { name: string; onCancel: () => void }) {
  const t = useTranslations("battleWizards");

  const tc = useTranslations("common.actions");

  return (
    <MapAimPanel
      ariaLabel={t("abilityAim.ariaLabel")}
      title={name}
      hint={t("abilityAim.hint")}
      footer={<button type="button" onClick={onCancel} className="hud-sc h-10 w-full border border-white/20 px-3 text-sm">{tc("cancel")}</button>}
    />
  );
}
