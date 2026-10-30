"use client";

import { useTranslations } from "next-intl";

import type { AbilitySectionProps } from "../AbilityPanel";
import { useAbilityEditor } from "../editor-context";
import { EffectCard } from "../EffectCard";
import { FieldErrors } from "../FieldErrors";
import { NestedEffectsEditor } from "../NestedEffectsEditor";
import { SectionShell } from "./SectionShell";

import { allowedEffectKinds, newEffect } from "@/lib/utils/abilities/editor";

export function EffectsSection({ ability, path, onChange, state }: AbilitySectionProps) {
  const t = useTranslations("abilities.effects");

  const { errorsByPath } = useAbilityEditor();

  return (
    <SectionShell path={path} part="then" title={t("title")} {...state}>
      <FieldErrors errors={errorsByPath[`${path}.effects`] ?? []} />
      <NestedEffectsEditor
        effects={ability.effects}
        path={`${path}.effects`}
        className=""
        limits={{ min: 0 }}
        labels={{ add: t("add") }}
        create={() => newEffect(allowedEffectKinds(ability.trigger)[0], ability.trigger)}
        onChange={(effects) => onChange({ ...ability, effects })}
        renderCard={({ effect, path: p, actions }) => (
          <div className="space-y-1">
            <FieldErrors errors={errorsByPath[p] ?? []} />
            <EffectCard effect={effect} trigger={ability.trigger} path={p} actions={actions} />
          </div>
        )}
      />
    </SectionShell>
  );
}
