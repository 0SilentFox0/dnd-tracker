"use client";

import { useMemo } from "react";

import { PassiveEffectsList } from "@/components/artifacts/PassiveEffectsList";
import { ArtifactDeltaBadge } from "@/components/characters/stats/ArtifactDeltaBadge";
import type { CompletedArtifactSetPreview } from "@/lib/utils/artifacts/get-completed-artifact-sets-preview";
import { collectSetBonusNumericLines } from "@/lib/utils/artifacts/set-bonus-display-lines";

export function CharacterCompletedArtifactSetsSummary({
  completedSets,
}: {
  completedSets: CompletedArtifactSetPreview[];
}) {
  if (completedSets.length === 0) return null;

  return (
    <div className="mt-4 space-y-3 text-left">
      <h3 className="text-sm font-semibold text-foreground">
        Повні сети артефактів
      </h3>
      <ul className="space-y-3">
        {completedSets.map((item) => (
          <SetBonusBlock key={item.setId} item={item} />
        ))}
      </ul>
    </div>
  );
}

function SetBonusBlock({ item }: { item: CompletedArtifactSetPreview }) {
  const lines = useMemo(
    () => collectSetBonusNumericLines(item.parsed),
    [item.parsed],
  );

  return (
    <li className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
      <div className="font-medium text-foreground">{item.displayName}</div>
      {item.isBattleScoped && (
        <p className="mt-1 text-xs text-muted-foreground">
          У бою цей бонус застосовується не лише до вас (аудиторія сету: команда
          або вороги).
        </p>
      )}
      {item.parsed.description?.trim() ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {item.parsed.description.trim()}
        </p>
      ) : null}
      {lines.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-foreground">
          {lines.map((line, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-muted-foreground">{line.label}</span>
              <ArtifactDeltaBadge
                value={line.value}
                isPercentage={line.isPercentage}
                className="ml-1.5"
              />
            </li>
          ))}
        </ul>
      ) : null}
      {item.parsed.passiveEffects.length > 0 ? (
        <div className="mt-2 border-t border-border pt-2">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Пасиви сету
          </p>
          <PassiveEffectsList
            effects={item.parsed.passiveEffects}
            itemClassName="bg-muted/30"
          />
        </div>
      ) : null}
      {item.parsed.immuneSpellIds && item.parsed.immuneSpellIds.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Імунітет до заклинань:{" "}
          {item.parsed.immuneSpellIds.slice(0, 6).join(", ")}
          {item.parsed.immuneSpellIds.length > 6
            ? `… (+${item.parsed.immuneSpellIds.length - 6})`
            : ""}
        </p>
      ) : null}
    </li>
  );
}
