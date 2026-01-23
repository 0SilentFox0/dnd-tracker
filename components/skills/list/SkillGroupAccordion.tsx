"use client";

import Link from "next/link";
import { Edit, MoreVertical, X } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { AbilityBonusIcons, SkillStatsIcons } from "@/components/skills/icons/AbilityBonusIcons";
import { RemoveAllSpellsDialog } from "@/components/spells/dialogs/RemoveAllSpellsDialog";
import { RenameGroupDialog } from "@/components/spells/dialogs/RenameGroupDialog";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRaces } from "@/lib/hooks/useRaces";
import { useSpellGroupActions } from "@/lib/hooks/useSpellGroupActions";
import { calculateTotalSkillsInGroup } from "@/lib/utils/skills";
import type { Race } from "@/types/races";
import type { Skill } from "@/types/skills";
import type { SpellGroup } from "@/types/spells";

interface SkillGroupAccordionProps {
  groupName: string;
  skills: Skill[];
  campaignId: string;
  spellGroups: SpellGroup[];
  initialRaces?: Race[];
}

export function SkillGroupAccordion({
  groupName,
  skills,
  campaignId,
  spellGroups,
  initialRaces = [],
}: SkillGroupAccordionProps) {
  const { data: races = [] } = useRaces(campaignId, initialRaces);

  const groupId = spellGroups.find((g) => g.name === groupName)?.id;

  const isUngrouped =
    groupName === "Без групи" || groupName === "Без основного навику";

  const totalSkills = calculateTotalSkillsInGroup(skills);

  const {
    renameDialogOpen,
    removeAllDialogOpen,
    newGroupName,
    setNewGroupName,
    setRenameDialogOpen,
    setRemoveAllDialogOpen,
    handleRenameGroup,
    handleRemoveAllSpells,
    openRenameDialog,
    closeRenameDialog,
    isRenaming,
    isRemoving,
  } = useSpellGroupActions({
    campaignId,
    groupName,
    groupId,
  });

  const getRaceLabel = (raceValue: string) => {
    const race = races.find((r) => r.id === raceValue || r.name === raceValue);

    return race ? race.name : raceValue;
  };

  return (
    <>
      <AccordionItem value={groupName} key={groupName}>
        <div className="relative">
          <AccordionTrigger className="px-4 sm:px-6">
            <div className="flex items-center gap-3 sm:gap-4 text-left w-full">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">{groupName}</CardTitle>
                <CardDescription className="mt-1">
                  {totalSkills} скілів
                </CardDescription>
              </div>
            </div>
          </AccordionTrigger>
          {!isUngrouped && groupId && (
            <div
              className="absolute right-12 sm:right-14 top-1/2 -translate-y-1/2 z-10"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 sm:h-12 sm:w-12"
                  >
                    <MoreVertical className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      openRenameDialog();
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Перейменувати групу
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setRemoveAllDialogOpen(true);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Видалити всі скіли з групи
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        <AccordionContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 px-4 sm:px-6 pb-4">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-3 mb-3">
                  {skill.icon && (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                      <OptimizedImage
                        src={skill.icon}
                        alt={skill.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        fallback={
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <span className="text-xl text-muted-foreground">
                              {skill.name[0]?.toUpperCase() || "?"}
                            </span>
                          </div>
                        }
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm sm:text-base flex-1 min-w-0 truncate">
                        {skill.name}
                      </h3>
                      {skill.isRacial && (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          Рассовий
                        </Badge>
                      )}
                    </div>
                    {skill.races &&
                      Array.isArray(skill.races) &&
                      skill.races.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {skill.races.map((race: string) => (
                            <Badge
                              key={race}
                              variant="secondary"
                              className="text-xs"
                            >
                              {getRaceLabel(race)}
                            </Badge>
                          ))}
                        </div>
                      )}
                  </div>
                </div>

                {skill.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3">
                    {skill.description}
                  </p>
                )}

                <div className="space-y-2 mb-3">
                  {Object.keys(skill.bonuses || {}).length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Бонуси:
                      </span>
                      <AbilityBonusIcons bonuses={skill.bonuses || {}} />
                    </div>
                  )}

                  {(skill.armor ||
                    skill.physicalResistance ||
                    skill.magicalResistance) && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Захист:
                      </span>
                      <SkillStatsIcons
                        armor={skill.armor}
                        physicalResistance={skill.physicalResistance}
                        magicalResistance={skill.magicalResistance}
                      />
                    </div>
                  )}

                  {(skill.damage || skill.speed) && (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {skill.damage && <div>Шкода: {skill.damage}</div>}
                      {skill.speed && <div>Швидкість: {skill.speed}</div>}
                    </div>
                  )}

                  {skill.spell && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-semibold">Покращення спела:</span>{" "}
                      {skill.spell.name}
                    </div>
                  )}
                </div>

                <Link href={`/campaigns/${campaignId}/dm/skills/${skill.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs sm:text-sm"
                  >
                    Редагувати
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>

      <RenameGroupDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        groupName={groupName}
        newGroupName={newGroupName}
        onNewGroupNameChange={setNewGroupName}
        onConfirm={handleRenameGroup}
        onCancel={closeRenameDialog}
        isRenaming={isRenaming}
      />

      <RemoveAllSpellsDialog
        open={removeAllDialogOpen}
        onOpenChange={setRemoveAllDialogOpen}
        groupName={groupName}
        onConfirm={handleRemoveAllSpells}
        isRemoving={isRemoving}
      />
    </>
  );
}
