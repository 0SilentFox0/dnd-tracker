'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Loader2, Sparkles } from 'lucide-react';

import { BattlePlayerViewToggle } from '../BattlePlayerViewToggle';
import { BattleDrawer } from './BattleDrawer';
import { GridShapePicker } from './GridShapePicker';
import type { DrawerKey } from './rail-items';

import { AudioDock } from '@/components/audio/AudioDock';
import { HudButton, HudIconButton } from '@/components/hud';
import { actionIcon } from '@/components/hud/icons/battle';
import { HudChipTabs } from '@/components/hud/page/HudChipTabs';
import { SoundboardPanel } from '@/components/soundboard/SoundboardPanel';
import { BattleStatus, ParticipantSide } from '@/lib/constants/battle';
import {
    type BattleViewMode,
    MAP_TAB,
    type MobileBattleTab,
    useBattleScene,
    useFxEnabled,
} from '@/lib/hooks/battle';
import { useConfirm } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';

const FIRST_ROW = '[&>div>div:first-child]';

const MAP_TOOLS_SLOT = cn(
    'relative flex min-w-0 flex-col gap-2',
    `${FIRST_ROW}:grid ${FIRST_ROW}:grid-cols-2 ${FIRST_ROW}:gap-2`,
    `${FIRST_ROW}>*:h-auto ${FIRST_ROW}>*:min-h-11 ${FIRST_ROW}>*:text-sm ${FIRST_ROW}>*:leading-tight ${FIRST_ROW}>*:whitespace-normal`,
    '[&_button[aria-pressed]]:min-h-11 [&_button[aria-pressed]]:text-sm'
);

const NextTurnIcon = actionIcon.nextTurn;

const SECTION = 'hud-sc text-[13px] tracking-[.1em] text-[var(--hud-muted)]';

export interface ToolsProps {
    onComplete?: () => void;
    view?: { mode: BattleViewMode; set: (mode: BattleViewMode) => void };
    tabs?: { value: MobileBattleTab; set: (tab: MobileBattleTab) => void };
    onToolsSlot?: (el: HTMLDivElement | null) => void;
    onOpenDrawer?: (key: DrawerKey) => void;
    // phone keeps the player on the stage (`player: false`): the sheet unmounts on close and would stop the video
    audio?: { sound?: boolean; player?: boolean };
}

export function ToolsContent({
    onComplete,
    view,
    tabs,
    onToolsSlot,
    onOpenDrawer,
    audio,
}: ToolsProps) {
    const withSound = audio?.sound ?? true;

    const withPlayer = audio?.player ?? true;

    const t = useTranslations('battle.topBar');

    const ts = useTranslations('battle.scene');

    const tSides = useTranslations('battle.sides');

    const td = useTranslations('battle.drawers');

    const {
        battle,
        viewer: { isDM, readOnly },
        roster: { allies, enemies, reserve },
        actions,
    } = useBattleScene();

    const [mode, setMode] = useState<'play' | 'edit'>('play');

    const [gridOpen, setGridOpen] = useState(false);

    const confirm = useConfirm();

    const {
        enabled: fxOn,
        motionAllowed,
        setEnabled: setFxOn,
    } = useFxEnabled();

    const reset = async () => {
        if (
            await confirm({
                title: t('resetTitle'),
                description: t('resetDescription'),
                confirmLabel: t('reset'),
            })
        ) {
            actions.reset.mutate({});
        }
    };

    const soundboard = isDM && !readOnly;

    const dmControls =
        isDM && !readOnly && battle.status !== BattleStatus.PREPARED;

    return (
        <div className="flex flex-col gap-5">
            {view && battle.map && (
                <section className="flex flex-col gap-2">
                    <h3 className={SECTION}>{td('view')}</h3>
                    <HudChipTabs
                        size="lg"
                        ariaLabel={ts('viewMode')}
                        items={[
                            {
                                key: 'map',
                                label: ts('viewMap'),
                                active: view.mode === 'map',
                                onSelect: () => view.set('map'),
                            },
                            {
                                key: 'columns',
                                label: ts('viewColumns'),
                                active: view.mode === 'columns',
                                onSelect: () => view.set('columns'),
                            },
                        ]}
                    />
                </section>
            )}
            {tabs && (
                <section className="flex flex-col gap-2">
                    <h3 className={SECTION}>{td('view')}</h3>
                    <HudChipTabs
                        size="lg"
                        ariaLabel={ts('viewMode')}
                        items={[
                            ...(battle.map
                                ? [
                                      {
                                          key: MAP_TAB,
                                          label: ts('viewMap'),
                                          active: tabs.value === MAP_TAB,
                                          onSelect: () => tabs.set(MAP_TAB),
                                      },
                                  ]
                                : []),
                            {
                                key: ParticipantSide.ALLY,
                                label: `${tSides('allies')} ${allies.length}`,
                                active: tabs.value === ParticipantSide.ALLY,
                                onSelect: () => tabs.set(ParticipantSide.ALLY),
                            },
                            {
                                key: ParticipantSide.ENEMY,
                                label: `${tSides('enemies')} ${enemies.length}`,
                                active: tabs.value === ParticipantSide.ENEMY,
                                onSelect: () => tabs.set(ParticipantSide.ENEMY),
                            },
                        ]}
                    />
                </section>
            )}
            {onToolsSlot && battle.map && (
                <>
                    {isDM && !readOnly && (
                        <section className="flex flex-col gap-2">
                            <h3 className={SECTION}>{td('mode')}</h3>
                            <HudChipTabs
                                size="lg"
                                ariaLabel={td('mode')}
                                items={[
                                    {
                                        key: 'play',
                                        label: td('modePlay'),
                                        active: mode === 'play',
                                        onSelect: () => setMode('play'),
                                    },
                                    {
                                        key: 'edit',
                                        label: td('modeEdit'),
                                        active: mode === 'edit',
                                        onSelect: () => setMode('edit'),
                                    },
                                ]}
                            />
                        </section>
                    )}
                    <section
                        hidden={isDM && !readOnly && mode === 'play'}
                        className="flex flex-col gap-2"
                    >
                        <h3 className={SECTION}>{td('mapTools')}</h3>
                        <div
                            ref={onToolsSlot}
                            className={MAP_TOOLS_SLOT}
                        />
                    </section>
                    {isDM && !readOnly && mode === 'edit' && (
                        <section className="flex flex-col gap-2">
                            <h3 className={SECTION}>{td('gridShape')}</h3>
                            <HudButton
                                type="button"
                                aria-expanded={gridOpen}
                                onClick={() => setGridOpen((o) => !o)}
                                className="h-11 rounded-xl border border-white/20 text-sm text-[var(--ink)]"
                            >
                                {td('grid')}
                            </HudButton>
                            {gridOpen && <GridShapePicker />}
                        </section>
                    )}
                </>
            )}
            <section className="flex flex-col gap-2">
                <h3 className={SECTION}>{td('display')}</h3>
                <div className="flex items-center gap-2">
                    <HudIconButton
                        type="button"
                        disabled={!motionAllowed}
                        title={motionAllowed ? undefined : t('fxDisabledHint')}
                        onClick={() => setFxOn(!fxOn)}
                        aria-label={fxOn ? t('fxOn') : t('fxOff')}
                        aria-pressed={fxOn}
                        className={cn(
                            'size-11 hover:bg-white/10 disabled:cursor-not-allowed disabled:hover:bg-transparent',
                            fxOn ? 'text-[var(--gold)]' : 'text-hud-muted'
                        )}
                    >
                        <Sparkles className="size-5" />
                    </HudIconButton>
                    <BattlePlayerViewToggle className="size-11" />
                </div>
            </section>
            {withSound && (withPlayer || soundboard) && (
                <section className="flex flex-col gap-2">
                    <h3 className={SECTION}>{td('sound')}</h3>
                    {withPlayer && <AudioDock placement="corner" />}
                    {soundboard && (
                        <SoundboardPanel campaignId={battle.campaignId} />
                    )}
                </section>
            )}
            {dmControls && (
                <section className="flex flex-col gap-2">
                    <h3 className={SECTION}>{td('dmSection')}</h3>
                    {battle.status === BattleStatus.ACTIVE && (
                        <HudButton
                            type="button"
                            data-tour="battle.next-turn"
                            disabled={actions.nextTurn.isPending}
                            onClick={() => actions.nextTurn.mutate({})}
                            className="hud-sc flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 text-sm tracking-[.08em] disabled:opacity-70"
                        >
                            {actions.nextTurn.isPending ? (
                                <Loader2
                                    className="size-4 animate-spin"
                                    aria-hidden
                                />
                            ) : (
                                <NextTurnIcon className="size-4" aria-hidden />
                            )}
                            {t('nextTurn')}
                        </HudButton>
                    )}
                    {onComplete && battle.status === BattleStatus.ACTIVE && (
                        <HudButton
                            type="button"
                            onClick={onComplete}
                            className="hud-sc h-11 rounded-xl border border-[var(--gold)]/60 text-sm text-[var(--gold)] hover:bg-[var(--gold)]/10"
                        >
                            {t('complete')}
                        </HudButton>
                    )}
                    <HudButton
                        type="button"
                        data-tour="battle.reset"
                        onClick={() => void reset()}
                        className="hud-sc h-11 rounded-xl border border-hud-danger/50 text-sm text-hud-danger hover:bg-hud-danger/10"
                    >
                        {t('reset')}
                    </HudButton>
                </section>
            )}
            {onOpenDrawer && (dmControls || reserve.length > 0) && (
                <div className="flex gap-2">
                    {isDM && !readOnly && (
                        <HudButton
                            type="button"
                            onClick={() => onOpenDrawer('dm')}
                            className="hud-sc h-11 flex-1 rounded-xl border border-white/20 text-sm"
                        >
                            {td('dmPanel')}
                        </HudButton>
                    )}
                    {battle.map && reserve.length > 0 && (
                        <HudButton
                            type="button"
                            onClick={() => onOpenDrawer('reserve')}
                            className="hud-sc h-11 flex-1 rounded-xl border border-white/20 text-sm"
                        >
                            {td('reserve')}
                        </HudButton>
                    )}
                </div>
            )}
            <Link
                href={`/campaigns/${battle.campaignId}`}
                className="hud-sc flex h-11 items-center text-sm text-hud-soft hover:text-[var(--gold)]"
            >
                {t('toCampaign')}
            </Link>
        </div>
    );
}

export function ToolsDrawer({
    panel: { open, onOpenChange },
    ...props
}: ToolsProps & {
    panel: { open: boolean; onOpenChange: (open: boolean) => void };
}) {
    const t = useTranslations('battle.drawers');

    return (
        <BattleDrawer
            drawer="tools"
            open={open}
            onOpenChange={onOpenChange}
            title={t('tools')}
            keepMounted
        >
            <ToolsContent {...props} />
        </BattleDrawer>
    );
}
