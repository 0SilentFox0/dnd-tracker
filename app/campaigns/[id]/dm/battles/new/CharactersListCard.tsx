"use client";

import Image from "next/image";

import type { Character, EntityStats } from "./types";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CharactersListCardProps {
  playerCharacters: Character[];
  npcCharacters: Character[];
  entityStats: Record<string, EntityStats> | null;
  isParticipantSelected: (id: string) => boolean;
  onParticipantToggle: (
    id: string,
    type: "character",
    checked: boolean,
  ) => void;
}

function CharacterRow({
  character,
  stats,
  isSelected,
  onToggle,
}: {
  character: Character;
  stats: EntityStats | undefined;
  isSelected: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const breakdown = stats?.dprBreakdown;

  return (
    <button
      type="button"
      onClick={() => onToggle(!isSelected)}
      className={`w-full text-left flex items-center gap-4 p-1 rounded-xl border-2 transition-all hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        isSelected
          ? "border-primary bg-primary/10 shadow-sm"
          : "border-border hover:border-primary/50"
      }`}
    >
      <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
        {character.avatar ? (
          <Image
            src={character.avatar}
            alt={character.name}
            width={56}
            height={56}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xl text-muted-foreground">👤</span>
        )}
      </div>
      <div className="flex flex-col min-w-0 flex-1 gap-0.5">
        <span className="text-base font-semibold truncate">
          {character.name}
        </span>
        {stats && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              DPR {stats.dpr} · HP {stats.hp} · KPI {stats.kpi}
            </span>
            {breakdown && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground cursor-help"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) =>
                        e.key === "Enter" && e.stopPropagation()
                      }
                      role="button"
                      tabIndex={0}
                    >
                      Як рахується DPR
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="max-w-[320px] whitespace-pre-wrap py-2 px-3 text-left"
                  >
                    <div className="font-medium mb-1">Розрахунок DPR</div>
                    <ul className="space-y-0.5 text-xs">
                      {breakdown.logLines.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                    <div className="mt-1.5 pt-1.5 border-t border-background/50 font-medium">
                      Фізика: {Math.round(breakdown.physicalDpr * 10) / 10} ·
                      Магія: {breakdown.spellDpr} · Навички:{" "}
                      {breakdown.nonMagicDpr}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </div>
      {isSelected && (
        <div
          className="shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
          aria-hidden
        >
          <svg
            className="w-3.5 h-3.5 text-primary-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </button>
  );
}

export function CharactersListCard({
  playerCharacters,
  npcCharacters,
  entityStats,
  isParticipantSelected,
  onParticipantToggle,
}: CharactersListCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>👥 Персонажі</CardTitle>
        <CardDescription>Гравці та NPC герої</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
        {playerCharacters.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2 text-sm text-muted-foreground">
              Гравці ({playerCharacters.length})
            </h3>
            <div className="space-y-3">
              {playerCharacters.map((character) => (
                <CharacterRow
                  key={character.id}
                  character={character}
                  stats={entityStats?.[character.id]}
                  isSelected={isParticipantSelected(character.id)}
                  onToggle={(checked) =>
                    onParticipantToggle(character.id, "character", checked)
                  }
                />
              ))}
            </div>
          </div>
        )}
        {npcCharacters.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2 text-sm text-muted-foreground">
              NPC Герої ({npcCharacters.length})
            </h3>
            <div className="space-y-3">
              {npcCharacters.map((character) => (
                <CharacterRow
                  key={character.id}
                  character={character}
                  stats={entityStats?.[character.id]}
                  isSelected={isParticipantSelected(character.id)}
                  onToggle={(checked) =>
                    onParticipantToggle(character.id, "character", checked)
                  }
                />
              ))}
            </div>
          </div>
        )}
        {playerCharacters.length === 0 && npcCharacters.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Немає доступних персонажів
          </p>
        )}
      </CardContent>
    </Card>
  );
}
