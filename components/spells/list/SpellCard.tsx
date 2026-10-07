"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Move, Pencil, Sparkles, X, Zap } from "lucide-react";

import { SpellPrintCard } from "./SpellPrintCard";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { HudCard, HudPill } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDamageElementLabel } from "@/lib/constants/damage";
import { getDamageModifierLabel, getHealModifierLabel, getSpellDamageTypeLabel, getSpellTargetLabel, spellLevelName } from "@/lib/constants/spells";
import { getSpellDamageTypeIcon, getSpellGroupIcon, getSpellTypeIcon } from "@/lib/utils/spells/spell-icons";
import type { Spell, SpellGroup } from "@/types/spells";

interface SpellCardProps {
  spell: Spell;
  campaignId: string;
  spellGroups: SpellGroup[];
  onRemoveFromGroup: (spellId: string) => void;
  onMoveToGroup: (spellId: string, groupId: string | null) => void;
  /** Режим версії для друку: ховає інтерактивні елементи, розкриває обрізаний опис */
  printMode?: boolean;
}

const ICON_BTN = "size-7 shrink-0 text-hud-muted hover:text-hud-ink";

export function SpellCard({ spell, campaignId, spellGroups, onRemoveFromGroup, onMoveToGroup, printMode = false }: SpellCardProps) {
  const [copied, setCopied] = useState(false);

  if (printMode) return <SpellPrintCard spell={spell} />;

  const groupName = spell.spellGroup?.name || "Без групи";

  const GroupIcon = getSpellGroupIcon(groupName);

  const TypeIcon = getSpellTypeIcon(spell.type);

  const DamageTypeIcon = getSpellDamageTypeIcon(spell.damageType);

  const description = Array.isArray(spell.effects) && spell.effects.length > 0 ? spell.effects.join(" · ") : spell.description;

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(spell.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fallbackIcon = <Sparkles className="size-5 text-hud-muted" />;

  return (
    <HudCard className="flex h-full flex-col gap-2">
      <div className="flex items-start gap-3">
        <div className="metal-bronze relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[radial-gradient(#2c2219,#0f0c09)] shadow-[inset_0_0_0_2px_var(--m2)]">
          {spell.icon ? (
            <OptimizedImage src={spell.icon} alt={spell.name} width={44} height={44} className="size-full object-cover p-0.5" fallback={fallbackIcon} />
          ) : (
            fallbackIcon
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="hud-sc truncate text-[15px] text-hud-ink">{spell.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1">
            <HudPill icon={<Sparkles className="size-3" />}>{spellLevelName(spell.level)}</HudPill>
            {spell.type === "aoe" && spell.damageType === "damage" ? (
              <HudPill icon={<Zap className="size-3" />}>AOE Демедж</HudPill>
            ) : (
              <>
                <HudPill icon={<TypeIcon className="size-3" />}>{spell.type === "target" ? "Цільове" : "AoE"}</HudPill>
                <HudPill icon={<DamageTypeIcon className="size-3" />}>{getSpellDamageTypeLabel(spell.damageType)}</HudPill>
              </>
            )}
            {spell.diceCount && spell.diceType ? (
              <HudPill>
                {spell.diceCount}
                {spell.diceType}
              </HudPill>
            ) : null}
            {spell.damageElement && <HudPill>{getDamageElementLabel(spell.damageElement)}</HudPill>}
            {spell.damageModifier && <HudPill>{getDamageModifierLabel(spell.damageModifier)}</HudPill>}
            {spell.healModifier && <HudPill>{getHealModifierLabel(spell.healModifier)}</HudPill>}
            {spell.target && <HudPill>{getSpellTargetLabel(spell.target)}</HudPill>}
            {spell.range && <HudPill>{spell.range}</HudPill>}
            {spell.castingTime && <HudPill>{spell.castingTime}</HudPill>}
          </div>
        </div>
        <div className="-mr-1 -mt-1 flex shrink-0">
          <Button variant="ghost" size="icon" className={ICON_BTN} asChild>
            <Link href={`/campaigns/${campaignId}/dm/spells/${spell.id}`} aria-label="Редагувати" title="Редагувати">
              <Pencil className="size-3.5" />
            </Link>
          </Button>
          {spell.spellGroup && (
            <Button variant="ghost" size="icon" className={ICON_BTN} onClick={() => onRemoveFromGroup(spell.id)} aria-label="Видалити з групи" title="Видалити з групи">
              <X className="size-3.5" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className={ICON_BTN} aria-label="Перемістити в групу" title="Перемістити в групу">
                <Move className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onMoveToGroup(spell.id, null)}>Без групи</DropdownMenuItem>
              {spellGroups.map((group) => (
                <DropdownMenuItem key={group.id} onClick={() => onMoveToGroup(spell.id, group.id)}>
                  {group.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <p className="line-clamp-2 flex-1 text-xs text-hud-muted">{description}</p>

      <div className="flex min-w-0 items-center gap-1.5 border-t border-[#2a2218] pt-1.5 text-[11px] text-hud-muted">
        <GroupIcon className="size-3 shrink-0" />
        <span className="truncate">{groupName}</span>
        {/* Тимчасово: ID заклинання та копіювання */}
        <code className="ml-auto max-w-[45%] truncate font-mono text-[10px]" title={spell.id}>
          {copied ? "Скопійовано" : spell.id}
        </code>
        <Button variant="ghost" size="icon" className="size-6 shrink-0 text-hud-muted" onClick={handleCopyId} aria-label={copied ? "Скопійовано" : "Копіювати ID"} title={copied ? "Скопійовано" : "Копіювати ID"}>
          <Copy className="size-3" />
        </Button>
      </div>
    </HudCard>
  );
}
