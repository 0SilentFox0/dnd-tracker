"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { BackgroundPicker } from "./BackgroundPicker";
import { ChoicePicker } from "./ChoicePicker";
import { issueFor, pickerBase, pickerContextFor } from "./picker-context";
import { SubclassCard } from "./SubclassCard";

import { Button } from "@/components/ui/button";
import { type ChoiceRefsView, useChoiceWizard } from "@/lib/hooks/characters";
import { backgroundConflict, picksAtStep, withStepBackground, withStepPicks, withStepSubclass, type WizardStep } from "@/lib/utils/characters/choices/wizard";
import type { Character } from "@/types/characters";
import type { ChoiceHero, ChoicesState } from "@/types/choices";

interface ChoiceWizardProps {
  campaignId: string;
  characterId: string;
  initial: ChoicesState;
  hero: ChoiceHero;
  refs: ChoiceRefsView;
  startAt?: string;
  onSaved?: (updated: Character) => void;
  onClose: () => void;
}

const FEAT_SOURCE = { background: "background", backgroundFeat: "background", race: "race", feat: "other" } as const;

const featSourceOf = ({ choice, source }: WizardStep) => {
  if (source.owner !== "class") return FEAT_SOURCE[source.owner];

  if (choice?.featTypes?.includes("fightingStyle")) return "fightingStyle";

  return choice?.featTypes?.includes("epicBoon") ? "epicBoon" : "asi";
};

export function ChoiceWizard({ campaignId, characterId, initial, hero, refs, startAt, onSaved, onClose }: ChoiceWizardProps) {
  const t = useTranslations("choices");

  const tc = useTranslations("common");

  const wizard = useChoiceWizard({ campaignId, characterId, initial, hero, refs, startAt, onSaved, onFinish: onClose });

  const { step, steps, index, state, isPending, error, issues } = wizard;

  const { level, scores, skills, classMode } = hero;

  const base = useMemo(() => pickerBase(state.data, refs, { level, scores, skills, classMode }, wizard.saved), [state.data, refs, level, scores, skills, classMode, wizard.saved]);

  if (!step) {
    return (
      <div className="space-y-4">
        <p className="hud-sc text-lg">{t("wizard.allChosen")}</p>
        <p className="text-sm text-hud-muted">{t("wizard.allChosenHint")}</p>
        <Button type="button" onClick={onClose}>
          {t("wizard.close")}
        </Button>
      </div>
    );
  }

  const { data, set } = state;

  const last = index === steps.length - 1;

  const sourceKey = step.source.owner === "class" && step.source.level !== undefined ? "classLevel" : step.source.owner;

  const conflict = step.kind === "background" ? backgroundConflict(data, refs) : null;

  const blocked = step.kind === "background" && (!data.backgroundId || !!conflict);

  const cls = step.classId ? refs.classesById[step.classId] : undefined;

  return (
    <div className="space-y-4">
      <p className="hud-sc text-xs text-hud-muted">{t("wizard.step", { n: index + 1, total: steps.length })}</p>
      <dl className="space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="text-hud-muted">{t("wizard.sourceLabel")}</dt>
          <dd>{sourceKey === "background" && !step.source.name ? t("wizard.source.backgroundNone") : t(`wizard.source.${sourceKey}`, { name: step.source.name, level: step.source.level ?? 0 })}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-hud-muted">{t("wizard.givesLabel")}</dt>
          <dd>{t(`wizard.gives.${step.kind === "background" ? "background" : (step.choice?.kind ?? "subclass")}`)}</dd>
        </div>
      </dl>
      {step.choice?.kind === "feat" && <p className="text-xs text-hud-muted">{t(`wizard.featSource.${featSourceOf(step)}`, { name: step.source.name, class: step.source.name, level: step.source.level ?? 0 })}</p>}
      {step.kind === "background" ? (
        <div className="space-y-2">
          <BackgroundPicker backgrounds={Object.values(refs.backgroundsById ?? {})} feats={refs.featsById} value={data.backgroundId ?? null} onChange={(id) => set(withStepBackground(wizard.saved, data, id))} />
          {!data.backgroundId && <p className="text-sm text-hud-muted">{t("wizard.background.pickFirst")}</p>}
          {conflict?.kind === "freeOrigin" && (
            <p role="alert" className="text-sm text-hud-danger">
              {t("editor.originFirst")}
              <button type="button" className="ml-2 underline" onClick={() => set({ ...data, feats: data.feats.filter((f) => f.source !== "origin") })}>
                {t("editor.replaceOrigin")}
              </button>
            </p>
          )}
          {conflict?.kind === "duplicate" && (
            <p role="alert" className="text-sm text-hud-danger">
              {t("wizard.background.featDuplicate", { name: conflict.name })}
            </p>
          )}
          {wizard.saved.backgroundId && data.backgroundId !== wizard.saved.backgroundId && (
            <p role="alert" className="text-sm text-hud-danger">
              {t("wizard.background.resetWarning")}
            </p>
          )}
        </div>
      ) : step.kind === "subclass" && cls ? (
        <SubclassCard cls={cls} value={data.classes.find((e) => e.classId === step.classId)?.subclassId ?? undefined} locked={!!wizard.saved.classes.find((e) => e.classId === step.classId)?.subclassId} onChange={(id) => set(withStepSubclass(data, step, id))} />
      ) : (
        step.choice && (
          <ChoicePicker
            key={step.key}
            choice={step.choice}
            value={picksAtStep(data, step)}
            onChange={(list) => set(withStepPicks(data, step, list))}
            ctx={pickerContextFor(base, step, data, refs, hero.level)}
            error={issueFor(issues, `${step.path}.${step.choice.id}`)}
          />
        )
      )}
      {error && (
        <p role="alert" className="text-sm text-hud-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={wizard.back} disabled={index === 0 || isPending}>
          {t("wizard.back")}
        </Button>
        <Button type="button" onClick={() => void wizard.next()} disabled={isPending || blocked}>
          {isPending ? tc("actions.saving") : last ? t("wizard.finish") : t("wizard.next")}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          {t("wizard.close")}
        </Button>
      </div>
    </div>
  );
}
