"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { type TableRow, TableRowsEditor } from "./TableRowsEditor";

import { BoundedNumberInput } from "@/components/ui/bounded-number-input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { useCareers } from "@/lib/hooks/careers";
import { useFeats } from "@/lib/hooks/feats";
import { errorMessage } from "@/lib/utils/common/error-message";
import { useRaceProfiles, useSaveRaceProfile } from "@/systems/wfrp/hooks";
import { CHARACTERISTIC_KEYS } from "@/systems/wfrp/rules/characteristics/keys";
import type { SpeciesProfile } from "@/systems/wfrp/rules/creation";
import { parseProfile, SpeciesProfileSchema } from "@/systems/wfrp/rules/creation/schema";

const TABLE_ERRORS: Record<string, "tableAscending" | "tableEnd"> = { "creation.tableAscending": "tableAscending", "creation.tableEnd": "tableEnd" };

const toRows = <K extends string>(rows: ({ max: number } & Record<K, string>)[], key: K): TableRow[] => rows.map((r) => ({ max: r.max, id: r[key] }));

export function SpeciesProfileEditor({ campaignId, raceId }: { campaignId: string; raceId: string }) {
  const t = useTranslations("wfrpCreation.editor");

  const tg = useTranslations("gameTerms.characteristics");

  const profiles = useRaceProfiles(campaignId);

  const careers = useCareers(campaignId);

  const feats = useFeats(campaignId);

  const save = useSaveRaceProfile(campaignId);

  const [draft, setDraft] = useState<SpeciesProfile>();

  const [saved, setSaved] = useState(false);

  const stored = useMemo(() => parseProfile(profiles.data?.find((p) => p.raceId === raceId)?.profile), [profiles.data, raceId]);

  if (profiles.isPending) return <p role="status" className="text-sm text-hud-muted">{t("loading")}</p>;

  const profile = draft ?? stored;

  const edit = (patch: Partial<SpeciesProfile>) => {
    setSaved(false);
    setDraft({ ...profile, ...patch });
  };

  const parsed = SpeciesProfileSchema.safeParse(profile);

  const issues = parsed.success ? [] : parsed.error.issues;

  const tableError = (table: "careerTable" | "randomTalents") => {
    const issue = issues.find((i) => i.path[0] === table);

    return issue ? t(`errors.${TABLE_ERRORS[issue.message] ?? "invalid"}`) : undefined;
  };

  const careerOptions = (careers.data ?? []).map((c) => ({ value: c.id, label: c.name }));

  const featOptions = (feats.data ?? []).map((f) => ({ value: f.id, label: f.name }));

  const numberField = (label: string, key: "move" | "fate" | "extraWounds" | "randomTalentCount", min: number, max: number) => (
    <FormField label={label}>
      <BoundedNumberInput aria-label={label} className="min-h-11" value={profile[key]} min={min} max={max} onCommit={(v) => edit({ [key]: v })} />
    </FormField>
  );

  const submit = () => save.mutate({ raceId, profile: parsed.data as SpeciesProfile }, { onSuccess: () => setSaved(true) });

  return (
    <section aria-label={t("title")} className="space-y-4 rounded-lg border border-hud-line p-3">
      <div>
        <h2 className="hud-sc text-[13px] tracking-[.06em] text-hud-gold">{t("title")}</h2>
        <p className="text-sm text-hud-muted">{t("hint")}</p>
      </div>
      <section aria-label={t("mods")} className="space-y-2">
        <h3 className="text-sm font-semibold">{t("mods")}</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {CHARACTERISTIC_KEYS.map((key) => (
            <FormField key={key} label={tg(`${key}.short`)}>
              <BoundedNumberInput aria-label={tg(`${key}.label`)} className="min-h-11 text-center" value={profile.mods[key] ?? 0} min={-20} max={20} onCommit={(v) => edit({ mods: { ...profile.mods, [key]: v } })} />
            </FormField>
          ))}
        </div>
      </section>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {numberField(t("move"), "move", 1, 12)}
        {numberField(t("fate"), "fate", 0, 9)}
        {numberField(t("extraWounds"), "extraWounds", 0, 3)}
        {numberField(t("randomTalentCount"), "randomTalentCount", 0, 5)}
      </div>
      <section aria-label={t("talents")} className="space-y-2">
        <h3 className="text-sm font-semibold">{t("talents")}</h3>
        <ul className="flex flex-wrap gap-2">
          {profile.talents.map((id) => (
            <li key={id} className="flex items-center gap-1 rounded-lg border border-hud-line pl-3 text-sm">
              {feats.data?.find((f) => f.id === id)?.name ?? id}
              <Button type="button" size="icon" variant="ghost" className="size-11" aria-label={`${t("removeTalent")}: ${feats.data?.find((f) => f.id === id)?.name ?? id}`} onClick={() => edit({ talents: profile.talents.filter((f) => f !== id) })}>
                ×
              </Button>
            </li>
          ))}
        </ul>
        <SelectField aria-label={t("talentsPlaceholder")} value="" onValueChange={(id) => id && !profile.talents.includes(id) && edit({ talents: [...profile.talents, id] })} options={featOptions.filter((o) => !profile.talents.includes(o.value))} placeholder={t("talentsPlaceholder")} triggerClassName="min-h-11 w-full" />
      </section>
      <TableRowsEditor title={t("careerTable")} idLabel={t("career")} rows={toRows(profile.careerTable, "careerId")} options={careerOptions} error={tableError("careerTable")} onChange={(rows) => edit({ careerTable: rows.map((r) => ({ max: r.max, careerId: r.id })) })} />
      <TableRowsEditor title={t("randomTalents")} idLabel={t("feat")} rows={toRows(profile.randomTalents, "featId")} options={featOptions} error={tableError("randomTalents")} onChange={(rows) => edit({ randomTalents: rows.map((r) => ({ max: r.max, featId: r.id })) })} />
      {issues.length > 0 && !tableError("careerTable") && !tableError("randomTalents") && (
        <p role="alert" className="text-sm text-destructive">
          {t("errors.invalid")}
        </p>
      )}
      {save.error && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(save.error, t("saveFailed"))}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="button" className="min-h-11" onClick={submit} disabled={!parsed.success || save.isPending}>
          {save.isPending ? t("saving") : t("save")}
        </Button>
        {saved && <span role="status" className="text-sm text-hud-muted">{t("saved")}</span>}
      </div>
    </section>
  );
}
