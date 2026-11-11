"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { HudSection } from "@/components/hud/form";
import type { AdvancementEditorProps } from "@/components/systems/types";
import { BoundedNumberInput } from "@/components/ui/bounded-number-input";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { useCareers } from "@/lib/hooks/careers";
import { useFeats } from "@/lib/hooks/feats";

const TIERS = ["1", "2", "3", "4"];

export function AdvancementEditor({ bindings: { characteristics: { data, set } }, campaignId }: AdvancementEditorProps) {
  const t = useTranslations("wfrpCareers.profile");

  const careers = useCareers(campaignId);

  const feats = useFeats(campaignId);

  const career = data.career;

  const talents = Object.entries(data.talents);

  const featOf = (id: string) => feats.data?.find((f) => f.id === id);

  const setTalent = (id: string, rank: number) => set("talents", { ...data.talents, [id]: rank });

  return (
    <div className="space-y-4">
      <HudSection title={t("career")}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
          <SelectField aria-label={t("career")} value={career?.careerId ?? ""} onValueChange={(careerId) => set("career", { careerId, tier: 1, ticks: [] })} options={(careers.data ?? []).map((c) => ({ value: c.id, label: c.name }))} placeholder={t("noCareer")} triggerClassName="min-h-11 w-full" />
          {career && <SelectField aria-label={t("tier")} value={String(career.tier)} onValueChange={(v) => set("career", { ...career, tier: Number(v) as 1 | 2 | 3 | 4, ticks: [] })} options={TIERS.map((v) => ({ value: v, label: t("tierValue", { n: v }) }))} triggerClassName="min-h-11 w-full" />}
          {career && (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => set("career", undefined)}>
              {t("clear")}
            </Button>
          )}
        </div>
      </HudSection>
      <HudSection title={t("talents")}>
        <ul className="space-y-1">
          {talents.map(([id, rank]) => {
            const name = featOf(id)?.name ?? id;

            return (
              <li key={id} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{name}</span>
                <BoundedNumberInput aria-label={`${name}: ${t("rank")}`} className="min-h-11 w-20" min={1} max={20} value={rank} onCommit={(v) => setTalent(id, v)} />
                <Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label={t("remove", { name })} onClick={() => set("talents", Object.fromEntries(talents.filter(([k]) => k !== id)))}>
                  <X className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
        <SelectField aria-label={t("addTalent")} value="" onValueChange={(id) => setTalent(id, 1)} options={(feats.data ?? []).filter((f) => !(f.id in data.talents)).map((f) => ({ value: f.id, label: f.name }))} placeholder={t("addTalent")} triggerClassName="mt-2 min-h-11 w-full" />
      </HudSection>
      <p className="text-xs text-hud-muted">{t("ledgerNote", { count: data.ledger.length })}</p>
    </div>
  );
}
