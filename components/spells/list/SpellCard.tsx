'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronDown, Copy, Move, Pencil, Sparkles, X } from 'lucide-react';

import { SpellPrintCard } from './SpellPrintCard';

import { ZoomableEntityIcon } from '@/components/common/entity/ZoomableEntityIcon';
import { HudCard, HudPill } from '@/components/hud/page';
import { ScenarioRichText } from '@/components/scenario/page/ScenarioRichText';
import { SpellComponentsLine } from '@/components/spells/SpellComponentsLine';
import { SpellIcon } from '@/components/spells/SpellIcon';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCopyToClipboard } from '@/lib/hooks/common';
import { useSpellDescriptionDoc } from '@/lib/hooks/spells';
import { useSpellMechanics } from '@/lib/hooks/spells/useSpellMechanics';
import { useTranslator } from '@/lib/i18n/use-translator';
import { cn } from '@/lib/utils';
import { getSpellGroupIcon } from '@/lib/utils/spells/spell-icons';
import type { Spell, SpellGroup } from '@/types/spells';

interface SpellCardProps {
    spell: Spell;
    campaignId: string;
    spellGroups: SpellGroup[];
    actions?: {
        onRemoveFromGroup?: (spellId: string) => void;
        onMoveToGroup?: (spellId: string, groupId: string | null) => void;
    };
    canEdit?: boolean;
    printMode?: boolean;
    'data-tour'?: string;
}

const ICON_BTN = 'size-7 shrink-0 text-hud-muted hover:text-hud-ink';

export function SpellCard({
    spell,
    campaignId,
    spellGroups,
    actions,
    canEdit = true,
    printMode = false,
    'data-tour': dataTour,
}: SpellCardProps) {
    const { onRemoveFromGroup, onMoveToGroup } = actions ?? {};

    const t = useTranslations('spells.card');

    const ta = useTranslations('common.actions');

    const tg = useTranslator('gameTerms');

    const mechanics = useSpellMechanics();

    const { copied, copy } = useCopyToClipboard();

    const [expanded, setExpanded] = useState(false);

    const descriptionDoc = useSpellDescriptionDoc(spell.description ?? '');

    if (printMode) return <SpellPrintCard spell={spell} />;

    const groupName = spell.spellGroup?.name || tg('ungrouped.spellGroup');

    const GroupIcon = getSpellGroupIcon(spell.spellGroup);

    const handleCopyId = () => void copy(spell.id);

    return (
        <HudCard
            data-tour={dataTour}
            link={
                canEdit
                    ? {
                          href: `/campaigns/${campaignId}/dm/spells/${spell.id}`,
                          label: spell.name,
                      }
                    : undefined
            }
            className="flex flex-col gap-2 [contain-intrinsic-size:auto_80px] [content-visibility:auto]"
        >
            <div className="flex items-start gap-3">
                <div
                    className={cn(
                        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-[radial-gradient(var(--color-hud-raised),var(--color-hud-page))] shadow-[inset_0_0_0_2px_var(--color-hud-accent)]',
                        expanded ? 'size-16' : 'size-10'
                    )}
                >
                    <ZoomableEntityIcon
                        src={spell.icon}
                        name={spell.name}
                        size={128}
                        className="size-full rounded-none bg-transparent"
                        fallback={
                            <SpellIcon
                                spell={spell}
                                size={expanded ? 64 : 40}
                            />
                        }
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="hud-sc truncate text-[15px] text-hud-ink">
                        {spell.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-1">
                        <HudPill icon={<Sparkles className="size-3" />}>
                            {tg(`spellLevels.${spell.level}`)}
                        </HudPill>
                        {groupName === 'Monster Actions' && (
                            <HudPill>Monster Actions</HudPill>
                        )}
                        {!expanded && (
                            <HudPill
                                icon={<GroupIcon className="size-3" />}
                                tone="muted"
                            >
                                {groupName}
                            </HudPill>
                        )}
                        {mechanics(spell).map((label) => (
                            <HudPill key={label}>{label}</HudPill>
                        ))}
                    </div>
                </div>
                <div className="-mt-1 -mr-1 flex shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={ICON_BTN}
                        onClick={() => setExpanded((v) => !v)}
                        aria-expanded={expanded}
                        aria-label={expanded ? t('collapse') : t('expand')}
                        title={expanded ? t('collapse') : t('expand')}
                    >
                        <ChevronDown
                            className={cn(
                                'size-4 transition-transform',
                                expanded && 'rotate-180'
                            )}
                        />
                    </Button>
                    {canEdit && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={ICON_BTN}
                                asChild
                            >
                                <Link
                                    href={`/campaigns/${campaignId}/dm/spells/${spell.id}`}
                                    aria-label={ta('edit')}
                                    title={ta('edit')}
                                >
                                    <Pencil className="size-3.5" />
                                </Link>
                            </Button>
                            {spell.spellGroup && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={ICON_BTN}
                                    onClick={() =>
                                        onRemoveFromGroup?.(spell.id)
                                    }
                                    aria-label={t('removeFromGroup')}
                                    title={t('removeFromGroup')}
                                >
                                    <X className="size-3.5" />
                                </Button>
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={ICON_BTN}
                                        aria-label={t('moveToGroup')}
                                        title={t('moveToGroup')}
                                    >
                                        <Move className="size-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onClick={() =>
                                            onMoveToGroup?.(spell.id, null)
                                        }
                                    >
                                        {tg('ungrouped.spellGroup')}
                                    </DropdownMenuItem>
                                    {spellGroups.map((group) => (
                                        <DropdownMenuItem
                                            key={group.id}
                                            onClick={() =>
                                                onMoveToGroup?.(
                                                    spell.id,
                                                    group.id
                                                )
                                            }
                                        >
                                            {group.name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    )}
                </div>
            </div>

            {expanded && (
                <>
                    <div className="flex-1 text-xs text-hud-muted [&_p]:mb-1.5">
                        <ScenarioRichText
                            doc={descriptionDoc}
                            campaignId={campaignId}
                        />
                    </div>

                    <SpellComponentsLine spell={spell} />

                    <div className="flex min-w-0 items-center gap-1.5 border-t border-hud-raised pt-1.5 text-[11px] text-hud-muted">
                        <GroupIcon className="size-3 shrink-0" />
                        <span className="truncate">{groupName}</span>
                        <code
                            className="ml-auto max-w-[45%] truncate font-mono text-[10px]"
                            title={spell.id}
                        >
                            {copied ? t('copied') : spell.id}
                        </code>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 shrink-0 text-hud-muted"
                            onClick={handleCopyId}
                            aria-label={copied ? t('copied') : t('copyId')}
                            title={copied ? t('copied') : t('copyId')}
                        >
                            <Copy className="size-3" />
                        </Button>
                    </div>
                </>
            )}
        </HudCard>
    );
}
