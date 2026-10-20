"use client";

import { SetupEntityCard } from "./SetupEntityCard";

import { HudSection } from "@/components/hud/form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ParticipantSourceType } from "@/lib/constants/battle";
import type { ParticipantActions, ParticipantSelection } from "@/lib/hooks/battles";
import { round1 } from "@/lib/utils/common/format";
import type { EntityStats, SetupCharacter } from "@/types/battle-setup";

interface CharactersListCardProps {
  playerCharacters: SetupCharacter[];
  npcCharacters: SetupCharacter[];
  entityStats: Record<string, EntityStats> | null;
  selection: ParticipantSelection;
  actions: Pick<ParticipantActions, "toggle">;
}

function DprBreakdownTip({ breakdown }: { breakdown: NonNullable<EntityStats["dprBreakdown"]> }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="cursor-help text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === "Enter" && e.stopPropagation()}
            role="button"
            tabIndex={0}
          >
            Як рахується DPR
          </span>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[320px] whitespace-pre-wrap px-3 py-2 text-left">
          <div className="mb-1 font-medium">Розрахунок DPR</div>
          <ul className="space-y-0.5 text-xs">
            {breakdown.logLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <div className="mt-1.5 border-t border-background/50 pt-1.5 font-medium">
            Фізика: {round1(breakdown.physicalDpr)} · Магія: {breakdown.spellDpr} · Навички: {breakdown.nonMagicDpr}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function CharactersListCard({ playerCharacters, npcCharacters, entityStats, selection, actions }: CharactersListCardProps) {
  const groups = [
    { title: "Гравці", characters: playerCharacters },
    { title: "NPC Герої", characters: npcCharacters },
  ].filter((g) => g.characters.length > 0);

  return (
    <HudSection title="Персонажі" className="max-h-[600px] space-y-4 overflow-y-auto">
      <p className="text-xs text-muted-foreground">Гравці та NPC герої</p>
      {groups.map(({ title, characters }) => (
        <div key={title}>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            {title} ({characters.length})
          </h3>
          <div className="space-y-3">
            {characters.map((character) => {
              const stats = entityStats?.[character.id];

              const isSelected = selection.isSelected(character.id);

              return (
                <SetupEntityCard
                  key={character.id}
                  entity={character}
                  fallbackIcon="👤"
                  stats={stats}
                  statsExtra={stats?.dprBreakdown && <DprBreakdownTip breakdown={stats.dprBreakdown} />}
                  state={{ isSelected }}
                  onToggle={() => actions.toggle(character.id, ParticipantSourceType.CHARACTER, !isSelected)}
                />
              );
            })}
          </div>
        </div>
      ))}
      {groups.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Немає доступних персонажів</p>}
    </HudSection>
  );
}
