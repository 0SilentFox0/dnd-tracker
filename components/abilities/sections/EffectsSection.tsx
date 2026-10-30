"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import type { AbilitySectionProps } from "../AbilityPanel";
import { useAbilityEditor } from "../editor-context";
import { EffectCard } from "../EffectCard";
import { FieldErrors } from "../FieldErrors";
import { NestedEffectsEditor } from "../NestedEffectsEditor";
import { sectionId,SectionShell } from "./SectionShell";

import { allowedEffectKinds, newEffect } from "@/lib/utils/abilities/editor";

export function EffectsSection({ ability, path, onChange, state }: AbilitySectionProps) {
  const t = useTranslations("abilities.effects");

  const { errorsByPath } = useAbilityEditor();

  const frame = useRef<number>(undefined);

  useEffect(() => () => cancelAnimationFrame(frame.current ?? 0), []);

  const revealLast = () => {
    cancelAnimationFrame(frame.current ?? 0);
    frame.current = requestAnimationFrame(() => {
      const cards = document.querySelectorAll<HTMLElement>(`#${CSS.escape(sectionId(path, "then"))}-body [data-effect-card]`);

      cards[cards.length - 1]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const change = (effects: typeof ability.effects) => {
    onChange({ ...ability, effects });

    if (effects.length > ability.effects.length) {
      if (!state.open) state.onToggle();

      revealLast();
    }
  };

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
        onChange={change}
        renderCard={({ effect, path: p, actions }) => (
          <div data-effect-card className="space-y-1">
            <FieldErrors errors={errorsByPath[p] ?? []} />
            <EffectCard effect={effect} trigger={ability.trigger} path={p} actions={actions} />
          </div>
        )}
      />
    </SectionShell>
  );
}
