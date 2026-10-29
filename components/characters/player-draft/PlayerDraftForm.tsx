"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { AbilityScoresPicker } from "./AbilityScoresPicker";
import { RollingField } from "./RollingField";

import { ChoicesEditor } from "@/components/choices/ChoicesEditor";
import { EntityIcon } from "@/components/common/EntityIcon";
import { HudForm, HudFormPage, HudSection } from "@/components/hud/form";
import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { ALIGNMENTS } from "@/lib/constants/alignment";
import { type RollKey, useArchetypeOptions, useChoiceRefs, usePlayerDraftForm } from "@/lib/hooks/characters";
import { useRaces } from "@/lib/hooks/races";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { DraftInput } from "@/types/characters";

interface PlayerDraftFormProps {
  campaignId: string;
  characterId?: string;
  initial?: "generate" | DraftInput;
}

export function PlayerDraftForm({ campaignId, characterId, initial }: PlayerDraftFormProps) {
  const t = useTranslations("characters.draft");

  const tc = useTranslations("common");

  const tAny = useTranslator();

  const { options: archetypes } = useArchetypeOptions();

  const { data: races = [] } = useRaces(campaignId);

  const { form, choices, generate, ai, submit, scoreStatus, reveal } = usePlayerDraftForm({ campaignId, characterId, initial });

  const { values, set } = form;

  const refs = useChoiceRefs(campaignId, values.race);

  const spinning = (key: RollKey) => reveal.rolling && !reveal.settled.has(key) && key in reveal.display;

  const settled = (key: RollKey) => reveal.settled.has(key);

  const shown = (key: RollKey) => reveal.display[key];

  const archetypeLabel = (v: string | number | undefined) => String(v ?? "");

  const busy = reveal.rolling;

  const { skip } = reveal;

  useEffect(() => {
    if (!busy) return;

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && skip();

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [busy, skip]);

  const goals = values.goals ?? [];

  const disabledReason = busy ? t("waitAnimation") : !scoreStatus.valid ? t("fixScores") : null;

  return (
    <HudFormPage title={characterId ? t("titleEdit") : t("titleNew")} aside={t("aside")}>
      <OnboardingHint id="player.draft" className="mb-3" />
      <HudForm
        id="player-draft"
        error={submit.error ?? disabledReason}
        onSubmit={(e) => {
          e.preventDefault();
          submit.run(refs.ready ? refs : undefined);
        }}
        actions={
          <>
            <Button type="submit" form="player-draft" disabled={!scoreStatus.valid || (!!form.classes && !values.classId) || submit.isPending || busy}>
              {submit.isPending ? t("submitting") : t("submit")}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={`/campaigns/${campaignId}/character`}>{tc("actions.cancel")}</Link>
            </Button>
          </>
        }
      >
        <div className="relative">
          {busy && <div aria-hidden className="absolute inset-0 z-20 cursor-pointer" onClick={reveal.skip} />}

          <fieldset disabled={busy} className="min-w-0 border-0 p-0">
            <div className="mb-4 flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" disabled={busy}>
                    {t("regenerate")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onSelect={generate.all}>{t("regenAll")}</DropdownMenuItem>
                  <DropdownMenuItem onSelect={generate.name}>{t("regenName")}</DropdownMenuItem>
                  <DropdownMenuItem onSelect={generate.scores}>{t("regenScores")}</DropdownMenuItem>
                  <DropdownMenuItem onSelect={generate.backstory}>{t("regenBackstory")}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {ai.available && (
                <Button type="button" variant="outline" disabled={busy || ai.isPending || !values.name || !values.race} onClick={ai.run}>
                  {ai.isPending ? t("aiBackstoryPending") : t("aiBackstory")}
                </Button>
              )}
            </div>

            <HudSection title={t("sections.basic")}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <RollingField id="draft-name" label={t("name")} spinning={spinning("name")} settled={settled("name")} display={shown("name")} className="sm:col-span-2">
                  <Input id="draft-name" value={values.name} onChange={(e) => set("name", e.target.value)} required maxLength={100} placeholder={t("namePlaceholder")} />
                </RollingField>

                <RollingField id="draft-race" label={t("race")} spinning={spinning("race")} settled={settled("race")} display={shown("race")}>
                  <SelectField id="draft-race" value={values.race} onValueChange={(v) => set("race", v)} placeholder={t("racePlaceholder")} options={races.map((r) => ({ value: r.name, label: r.name }))} required triggerClassName="w-full" />
                  {races.length === 0 && <p className="mt-1 text-xs text-hud-muted">{t("noRaces")}</p>}
                </RollingField>

                {form.classes ? (
                  <RollingField id="draft-class" label={t("class")} spinning={spinning("class")} settled={settled("class")} display={shown("class")}>
                    <SelectField id="draft-class" value={values.classId ?? ""} onValueChange={form.classes.set} placeholder={t("classPlaceholder")} options={form.classes.list.map((c) => ({ value: c.id, label: c.name }))} required triggerClassName="w-full" />
                  </RollingField>
                ) : (
                  <>
                    <RollingField id="draft-archetype" label={t("archetype")} spinning={spinning("archetype")} settled={settled("archetype")} display={archetypeLabel(shown("archetype"))}>
                      <SelectField id="draft-archetype" value={values.archetype} onValueChange={(v) => set("archetype", v as DraftInput["archetype"])} options={archetypes} triggerClassName="w-full" />
                    </RollingField>

                    <RollingField id="draft-class" label={t("class")} spinning={spinning("class")} settled={settled("class")} display={shown("class")}>
                      <Input id="draft-class" value={values.class} onChange={(e) => set("class", e.target.value)} required maxLength={100} placeholder={t("classExample")} />
                    </RollingField>
                  </>
                )}

                <RollingField id="draft-alignment" label={t("alignment")} spinning={spinning("alignment")} settled={settled("alignment")} display={shown("alignment")}>
                  <SelectField id="draft-alignment" value={values.alignment ?? ""} onValueChange={(v) => set("alignment", v)} placeholder={t("alignmentPlaceholder")} options={ALIGNMENTS.map((a) => ({ value: a, label: a }))} allowNone triggerClassName="w-full" />
                </RollingField>

                <div className="sm:col-span-2">
                  {spinning("avatar") ? (
                    <div aria-hidden data-rolling className="hud-roll-field">
                      <EntityIcon src={String(shown("avatar"))} name={values.name} size={64} className="size-16 rounded-lg border text-xl" />
                    </div>
                  ) : (
                    <ImageUpload label={t("avatar")} value={values.avatar ?? ""} onChange={(v) => set("avatar", v)} fallbackText={values.name} maxSide={1200} />
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" disabled={busy || !generate.canPortrait} onClick={generate.portrait}>
                      {t("otherPortrait")}
                    </Button>
                    {ai.avatar.available && (
                      <Button type="button" size="sm" variant="outline" disabled={busy || ai.avatar.isPending || !values.name || !values.race} onClick={ai.avatar.run}>
                        {ai.avatar.isPending ? t("aiAvatarPending") : t("aiAvatar")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </HudSection>

            <HudSection title={t("sections.scores")}>
              <AbilityScoresPicker form={form} scoreStatus={scoreStatus} reveal={reveal} />
            </HudSection>

            {(refs.race || choices.enabled) && refs.ready && (
              <HudSection title={t("sections.choices")}>
                <ChoicesEditor
                  state={choices}
                  refs={refs}
                  hero={{
                    level: 1,
                    scores: { strength: values.strength, dexterity: values.dexterity, constitution: values.constitution, intelligence: values.intelligence, wisdom: values.wisdom, charisma: values.charisma },
                    skills: {},
                    classMode: choices.enabled && !!values.classId,
                  }}
                />
              </HudSection>
            )}

            <HudSection title={t("sections.story")}>
              <div data-settled={settled("background")} className="hud-roll-fade flex flex-col gap-3" style={spinning("background") ? { opacity: 0 } : undefined}>
                <Textarea aria-label={t("biography")} rows={6} maxLength={4000} value={values.background ?? ""} onChange={(e) => set("background", e.target.value)} placeholder={t("biographyPlaceholder")} />

                {goals.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {goals.map((g, i) => (
                      <li key={`${i}-${g.text}`} className="flex items-start gap-2 rounded-lg border border-hud-rule px-3 py-2 text-sm">
                        <span className="min-w-0 flex-1">
                          <span className="text-hud-muted">{tAny(`characterProfile.goals.${g.kind}`)}: </span>
                          {g.text}
                        </span>
                        <Button type="button" size="sm" variant="ghost" aria-label={t("removeGoal")} onClick={() => set("goals", goals.filter((_, j) => j !== i))}>
                          ×
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </HudSection>
          </fieldset>
        </div>
      </HudForm>
    </HudFormPage>
  );
}
