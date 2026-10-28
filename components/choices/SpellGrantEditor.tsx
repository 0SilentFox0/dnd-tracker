"use client";

import { useTranslations } from "next-intl";

import { HUD_SELECT_CLASS } from "@/components/hud/form";
import { Input } from "@/components/ui/input";
import { ABILITY_KEYS, ABILITY_LABELS, type AbilityKey } from "@/lib/constants/abilities";
import { CHOICE_LIMITS } from "@/lib/constants/choices";
import { MAX_SPELL_LEVEL } from "@/lib/constants/spells";
import type { SpellGrantPolicy } from "@/types/choices";

export function SpellGrantEditor({ value, onChange }: { value?: SpellGrantPolicy; onChange: (next: SpellGrantPolicy | undefined) => void }) {
  const t = useTranslations("choices");

  const set = (patch: Partial<SpellGrantPolicy>) => value && onChange({ ...value, ...patch });

  return <fieldset className="space-y-2 rounded border border-hud-line p-2">
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked ? { uses: 1, rest: "long", via: "grant" } : undefined)} />{t("grant.freeCast")}</label>
    {value && <div className="grid gap-2 sm:grid-cols-2">
      <label className="text-xs">{t("grant.uses")}<Input aria-label={t("grant.usesAria")} type="number" min={1} max={CHOICE_LIMITS.grantUses} disabled={value.uses === "proficiency"} value={value.uses === "proficiency" ? "" : value.uses} onChange={(e) => set({ uses: Number(e.target.value) || 1 })} /></label>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={value.uses === "proficiency"} onChange={(e) => set({ uses: e.target.checked ? "proficiency" : 1 })} />{t("grant.proficiency")}</label>
      <label className="text-xs">{t("grant.rest")}<select aria-label={t("grant.restAria")} className={HUD_SELECT_CLASS} value={value.rest} onChange={(e) => set({ rest: e.target.value as "short" | "long" })}><option value="long">{t("grant.restLong")}</option><option value="short">{t("grant.restShort")}</option></select></label>
      <label className="text-xs">{t("grant.circle")}<Input aria-label={t("grant.circleAria")} type="number" min={0} max={MAX_SPELL_LEVEL} value={value.castLevel ?? ""} onChange={(e) => set({ castLevel: e.target.value === "" ? undefined : Number(e.target.value) })} /></label>
      <label className="text-xs">{t("grant.ability")}<select aria-label={t("grant.abilityAria")} className={HUD_SELECT_CLASS} value={value.dcAbility ?? ""} onChange={(e) => set({ dcAbility: (e.target.value || undefined) as AbilityKey | undefined })}><option value="">{t("grant.abilityDefault")}</option>{ABILITY_KEYS.map((key) => <option key={key} value={key}>{ABILITY_LABELS[key]}</option>)}</select></label>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={value.via === "slotOrGrant"} onChange={(e) => set({ via: e.target.checked ? "slotOrGrant" : "grant" })} />{t("grant.viaSlots")}</label>
      <label className="text-xs sm:col-span-2">{t("grant.sharedPool")}<Input aria-label={t("grant.sharedPoolAria")} value={value.sharedPool ?? ""} onChange={(e) => set({ sharedPool: e.target.value || undefined })} /></label>
    </div>}
  </fieldset>;
}
