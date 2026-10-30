"use client";

import { useTranslations } from "next-intl";

import { ChoicePicker } from "./ChoicePicker";
import { issueFor, pickerBase, pickerContextFor } from "./picker-context";
import { SubclassCard } from "./SubclassCard";

import { Button } from "@/components/ui/button";
import type { AbilityKey } from "@/lib/constants/abilities";
import { type ChoiceRefsView, useChoiceWizard } from "@/lib/hooks/characters";
import { picksAtStep, withStepPicks, withStepSubclass, type WizardStep } from "@/lib/utils/characters/choices/wizard";
import type { Character } from "@/types/characters";
import type { ChoicesState } from "@/types/choices";

interface ChoiceWizardProps {
  campaignId: string;
  characterId: string;
  initial: ChoicesState;
  hero: { level: number; scores: Record<AbilityKey, number>; skills: unknown; classMode: boolean };
  refs: ChoiceRefsView;
  startAt?: string;
  onSaved?: (updated: Character) => void;
  onClose: () => void;
}

const featSourceOf = ({ choice, source }: WizardStep): "background" | "race" | "asi" | "other" => {
  if (choice?.kind !== "feat") return "other";

  if (source.owner === "background" || source.owner === "backgroundFeat") return "background";

  if (source.owner === "race") return "race";

  return source.owner === "class" ? "asi" : "other";
};

export function ChoiceWizard({ campaignId, characterId, initial, hero, refs, startAt, onSaved, onClose }: ChoiceWizardProps) {
  const t = useTranslations("choices");

  const tc = useTranslations("common");

  const wizard = useChoiceWizard({ campaignId, characterId, initial, hero, refs, startAt, onSaved, onFinish: onClose });

  const { step, steps, index, state, isPending, error, issues } = wizard;

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

  const cls = step.classId ? refs.classesById[step.classId] : undefined;

  return (
    <div className="space-y-4">
      <p className="hud-sc text-xs text-hud-muted">{t("wizard.step", { n: index + 1, total: steps.length })}</p>
      <dl className="space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="text-hud-muted">{t("wizard.sourceLabel")}</dt>
          <dd>{t(`wizard.source.${sourceKey}`, { name: step.source.name, level: step.source.level ?? 0 })}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-hud-muted">{t("wizard.givesLabel")}</dt>
          <dd>{t(`wizard.gives.${step.choice?.kind ?? "subclass"}`)}</dd>
        </div>
      </dl>
      {step.choice?.kind === "feat" && <p className="text-xs text-hud-muted">{t(`wizard.featSource.${featSourceOf(step)}`, { class: step.source.name, level: step.source.level ?? 0 })}</p>}
      {step.kind === "subclass" && cls ? (
        <SubclassCard cls={cls} value={data.classes.find((e) => e.classId === step.classId)?.subclassId ?? undefined} onChange={(id) => set(withStepSubclass(data, step, id))} />
      ) : (
        step.choice && (
          <ChoicePicker
            key={step.key}
            choice={step.choice}
            value={picksAtStep(data, step)}
            onChange={(list) => set(withStepPicks(data, step, list))}
            ctx={pickerContextFor(pickerBase(data, refs, hero, wizard.saved), step, data, refs, hero.level)}
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
        <Button type="button" onClick={() => void wizard.next()} disabled={isPending}>
          {isPending ? tc("actions.saving") : last ? t("wizard.finish") : t("wizard.next")}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          {t("wizard.close")}
        </Button>
      </div>
    </div>
  );
}
