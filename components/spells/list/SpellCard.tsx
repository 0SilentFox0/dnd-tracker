"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Copy, Move, Pencil, Sparkles, X } from "lucide-react";

import { SpellPrintCard } from "./SpellPrintCard";

import { HudCard, HudPill } from "@/components/hud/page";
import { SpellIcon } from "@/components/spells/SpellIcon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSpellMechanics } from "@/lib/hooks/spells/useSpellMechanics";
import { useTranslator } from "@/lib/i18n/use-translator";
import { getSpellGroupIcon } from "@/lib/utils/spells/spell-icons";
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
  const t = useTranslations("spells.card");

  const ta = useTranslations("common.actions");

  const tg = useTranslator("gameTerms");

  const mechanics = useSpellMechanics();

  const [copied, setCopied] = useState(false);

  if (printMode) return <SpellPrintCard spell={spell} />;

  const groupName = spell.spellGroup?.name || tg("ungrouped.spellGroup");

  const GroupIcon = getSpellGroupIcon(spell.spellGroup);


  const handleCopyId = async () => {
    await navigator.clipboard.writeText(spell.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <HudCard className="flex h-full flex-col gap-2">
      <div className="flex items-start gap-3">
        <div className="metal-bronze relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[radial-gradient(#2c2219,#0f0c09)] shadow-[inset_0_0_0_2px_var(--m2)]">
          <SpellIcon spell={spell} size={44} className="size-full object-cover p-0.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="hud-sc truncate text-[15px] text-hud-ink">{spell.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1">
            <HudPill icon={<Sparkles className="size-3" />}>{tg(`spellLevels.${spell.level}`)}</HudPill>
            {groupName === "Monster Actions" && <HudPill>Monster Actions</HudPill>}
            {mechanics(spell).map((label) => (
              <HudPill key={label}>{label}</HudPill>
            ))}
          </div>
        </div>
        <div className="-mr-1 -mt-1 flex shrink-0">
          <Button variant="ghost" size="icon" className={ICON_BTN} asChild>
            <Link href={`/campaigns/${campaignId}/dm/spells/${spell.id}`} aria-label={ta("edit")} title={ta("edit")}>
              <Pencil className="size-3.5" />
            </Link>
          </Button>
          {spell.spellGroup && (
            <Button variant="ghost" size="icon" className={ICON_BTN} onClick={() => onRemoveFromGroup(spell.id)} aria-label={t("removeFromGroup")} title={t("removeFromGroup")}>
              <X className="size-3.5" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className={ICON_BTN} aria-label={t("moveToGroup")} title={t("moveToGroup")}>
                <Move className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onMoveToGroup(spell.id, null)}>{tg("ungrouped.spellGroup")}</DropdownMenuItem>
              {spellGroups.map((group) => (
                <DropdownMenuItem key={group.id} onClick={() => onMoveToGroup(spell.id, group.id)}>
                  {group.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <p className="line-clamp-2 flex-1 text-xs text-hud-muted">{spell.description}</p>

      <div className="flex min-w-0 items-center gap-1.5 border-t border-[#2a2218] pt-1.5 text-[11px] text-hud-muted">
        <GroupIcon className="size-3 shrink-0" />
        <span className="truncate">{groupName}</span>
        {/* Тимчасово: ID заклинання та копіювання */}
        <code className="ml-auto max-w-[45%] truncate font-mono text-[10px]" title={spell.id}>
          {copied ? t("copied") : spell.id}
        </code>
        <Button variant="ghost" size="icon" className="size-6 shrink-0 text-hud-muted" onClick={handleCopyId} aria-label={copied ? t("copied") : t("copyId")} title={copied ? t("copied") : t("copyId")}>
          <Copy className="size-3" />
        </Button>
      </div>
    </HudCard>
  );
}
