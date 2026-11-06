import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";

import { NumberField } from "../NumberField";
import { RulesSection } from "../RulesSection";

import { BoundedNumberInput } from "@/components/ui/bounded-number-input";
import { Button } from "@/components/ui/button";
import type { RulesFormState } from "@/lib/hooks/campaigns";
import type { AdvancementTrack } from "@/lib/utils/rules/advancement";

type TrackKey = "characteristic" | "skill";

function TrackFields({ trackKey, track, onChange }: { trackKey: TrackKey; track: AdvancementTrack; onChange: (next: AdvancementTrack) => void }) {
  const t = useTranslations("wfrpCareers.rules");

  const setBracket = (i: number, patch: Partial<AdvancementTrack["brackets"][number]>) => onChange({ ...track, brackets: track.brackets.map((b, j) => (j === i ? { ...b, ...patch } : b)) });

  const last = track.brackets[track.brackets.length - 1];

  return (
    <div className="space-y-2">
      <h3 className="text-sm text-hud-ink">{t(trackKey)}</h3>
      <NumberField label={t("max")} value={track.max} range={[1, 1000]} onCommit={(max) => onChange({ ...track, max })} />
      <ul className="space-y-1">
        {track.brackets.map((b, i) => (
          <li key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
            <BoundedNumberInput className="min-h-11" aria-label={`${t(trackKey)}: ${t("upTo")} ${i + 1}`} min={1} max={1000} value={b.upTo} onCommit={(upTo) => setBracket(i, { upTo })} />
            <BoundedNumberInput className="min-h-11" aria-label={`${t(trackKey)}: ${t("cost")} ${i + 1}`} min={0} max={100000} value={b.cost} onCommit={(cost) => setBracket(i, { cost })} />
            <Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11" disabled={track.brackets.length < 2} aria-label={t("removeBracket", { n: i + 1 })} onClick={() => onChange({ ...track, brackets: track.brackets.filter((_, j) => j !== i) })}>
              <X className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => onChange({ ...track, brackets: [...track.brackets, { upTo: last.upTo + 5, cost: last.cost }] })}>
        <Plus className="mr-1 size-4" />
        {t("addBracket")}
      </Button>
    </div>
  );
}

export function AdvancementSection({ form }: { form: RulesFormState }) {
  const t = useTranslations("wfrpCareers.rules");

  const rules = form.data.advancement;

  const set = (next: Partial<typeof rules>) => form.set("advancement", { ...rules, ...next });

  return (
    <RulesSection mechanic="advancement">
      <TrackFields trackKey="characteristic" track={rules.characteristic} onChange={(characteristic) => set({ characteristic })} />
      <TrackFields trackKey="skill" track={rules.skill} onChange={(skill) => set({ skill })} />
      <NumberField label={t("talentMultiplier")} value={rules.talentCostMultiplier} range={[0, 100]} decimal onCommit={(talentCostMultiplier) => set({ talentCostMultiplier })} />
      <h3 className="text-sm text-hud-ink">{t("career")}</h3>
      {([0, 1, 2] as const).map((i) => (
        <NumberField key={i} label={t("ticks", { n: i + 1 })} value={rules.career.ticksRequired[i]} range={[1, 200]} onCommit={(v) => set({ career: { ...rules.career, ticksRequired: rules.career.ticksRequired.map((x, j) => (j === i ? v : x)) as [number, number, number] } })} />
      ))}
      <NumberField label={t("multiplier")} value={rules.career.outOfCareerMultiplier} range={[1, 100]} decimal onCommit={(outOfCareerMultiplier) => set({ career: { ...rules.career, outOfCareerMultiplier } })} />
    </RulesSection>
  );
}
