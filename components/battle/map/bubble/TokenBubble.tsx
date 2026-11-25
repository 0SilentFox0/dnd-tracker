'use client';

import { useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { HeroStatesPanel } from '@/components/battle/participants/hero/HeroStatesPanel';
import { ParticipantDetails } from '@/components/battle/participants/ParticipantDetails';
import { HUD_GLASS, HudButton } from '@/components/hud';
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
} from '@/components/ui/popover';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import {
    revealToken,
    useBattleScene,
    useTokenAnchor,
} from '@/lib/hooks/battle';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';
import { isFallen } from '@/lib/utils/battle/grid';
import { NO_EFFECTS } from '@/lib/utils/battle/view';

const onSelectedToken = (target: EventTarget | null, id: string) =>
    target instanceof Element &&
    !!target.closest(`[data-fx-participant="${id}"][data-fx-anchor="map"]`);

export function TokenBubble({ mapBusy = false }: { mapBusy?: boolean }) {
    const t = useTranslations('battle.bubble');

    const {
        battle,
        selectedId,
        select,
        intents,
        effects,
        roster: { hero },
        viewer: { isDM },
    } = useBattleScene();

    const desktop = useMediaQuery(DESKTOP_QUERY);

    const participant = selectedId
        ? battle.initiativeOrder?.find((p) => p.basicInfo.id === selectedId)
        : undefined;

    // DM opens fallen tokens too (revive); players never do
    const fallen = !!participant && !isDM && isFallen(participant);

    const blocked = !!intents.mapAim || !!intents.mapPick || mapBusy;

    const open = !!participant && !fallen && !blocked;

    useEffect(() => {
        if (fallen || blocked) select(null);
    }, [fallen, blocked, select]);

    const { attackReady } = intents;

    const anchor = useTokenAnchor(open && desktop ? selectedId : null);

    const virtualRef = useMemo(() => {
        if (!anchor) return null;

        const { left, top, width, height } = anchor.box;

        return {
            current: {
                getBoundingClientRect: () =>
                    new DOMRect(left, top, width, height),
            },
        };
    }, [anchor]);

    useEffect(() => {
        if (!open) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !e.defaultPrevented) select(null);
        };

        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [open, select]);

    // a repeat click on the open token closes it; capture beats the map's own click handler
    useEffect(() => {
        if (!open || !selectedId || !anchor || attackReady) return;

        const onClick = (e: MouseEvent) => {
            if (!onSelectedToken(e.target, selectedId)) return;

            e.stopPropagation();

            select(null);
        };

        document.addEventListener('click', onClick, true);

        return () => document.removeEventListener('click', onClick, true);
    }, [open, selectedId, anchor, attackReady, select]);

    if (!open || !participant || !selectedId) return null;

    const isOwnHero = hero?.basicInfo.id === selectedId;

    const body = (
        <div className="flex flex-col gap-3">
            <ParticipantDetails participant={participant} />
            {isOwnHero && (
                <HeroStatesPanel
                    hero={participant}
                    effects={effects.get(selectedId) ?? NO_EFFECTS}
                    round={battle.currentRound}
                />
            )}
        </div>
    );

    const title = t('title', { name: participant.basicInfo.name });

    const close = (o: boolean) => {
        if (!o) select(null);
    };

    if (desktop && anchor === undefined) return null;

    if (!desktop || !anchor || !virtualRef)
        return (
            <ResponsiveDialog
                open
                onOpenChange={close}
                title={title}
                hud
                size="sm"
            >
                {body}
            </ResponsiveDialog>
        );

    return (
        <Popover open onOpenChange={close}>
            <PopoverAnchor virtualRef={virtualRef} />
            <PopoverContent
                side="right"
                align="start"
                sideOffset={anchor.inView ? 10 : 6}
                collisionPadding={12}
                aria-label={title}
                data-token-bubble
                onOpenAutoFocus={(e) => e.preventDefault()}
                onPointerDownOutside={(e) => {
                    if (onSelectedToken(e.target, selectedId))
                        e.preventDefault();
                }}
                className={cn(
                    HUD_GLASS,
                    'max-h-[min(70dvh,640px)] w-[min(380px,92vw)] overflow-y-auto rounded-xl p-4'
                )}
            >
                {!anchor.inView && (
                    <div className="mb-3 flex items-center justify-between gap-2 text-sm text-hud-muted">
                        <span>{t('offscreen')}</span>
                        <HudButton
                            type="button"
                            onClick={() => revealToken(selectedId)}
                            className="h-10 shrink-0 rounded-xl border border-white/20 px-3 text-[var(--ink)]"
                        >
                            {t('toToken')}
                        </HudButton>
                    </div>
                )}
                {body}
            </PopoverContent>
        </Popover>
    );
}
