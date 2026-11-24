'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

import { BattlePlayerViewToggle } from '../BattlePlayerViewToggle';
import { BattleDrawer } from './BattleDrawer';

import { AudioDock } from '@/components/audio/AudioDock';
import { HudButton, HudIconButton } from '@/components/hud';
import { HudChipTabs } from '@/components/hud/page/HudChipTabs';
import { SoundboardPanel } from '@/components/soundboard/SoundboardPanel';
import { BattleStatus } from '@/lib/constants/battle';
import {
    type BattleViewMode,
    useBattleScene,
    useFxEnabled,
} from '@/lib/hooks/battle';
import { useConfirm } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';

const SECTION = 'hud-sc text-[13px] tracking-[.1em] text-[var(--hud-muted)]';

export interface ToolsProps {
    onComplete?: () => void;
    view?: { mode: BattleViewMode; set: (mode: BattleViewMode) => void };
    onToolsSlot?: (el: HTMLDivElement | null) => void;
    withSound?: boolean;
}

export function ToolsContent({
    onComplete,
    view,
    onToolsSlot,
    withSound = true,
}: ToolsProps) {
    const t = useTranslations('battle.topBar');

    const ts = useTranslations('battle.scene');

    const td = useTranslations('battle.drawers');

    const {
        battle,
        viewer: { isDM, readOnly },
        actions,
    } = useBattleScene();

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

    const dmControls =
        isDM && !readOnly && battle.status !== BattleStatus.PREPARED;

    return (
        <div className="flex flex-col gap-5">
            {view && battle.map && (
                <section className="flex flex-col gap-2">
                    <h3 className={SECTION}>{td('view')}</h3>
                    <HudChipTabs
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
            {onToolsSlot && battle.map && (
                <div
                    ref={onToolsSlot}
                    className="relative flex min-w-0 flex-col"
                />
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
                            'size-10 hover:bg-white/10 disabled:cursor-not-allowed disabled:hover:bg-transparent',
                            fxOn ? 'text-[var(--gold)]' : 'text-hud-muted'
                        )}
                    >
                        <Sparkles className="size-5" />
                    </HudIconButton>
                    <BattlePlayerViewToggle className="size-10" />
                </div>
            </section>
            {withSound && (
                <section className="flex flex-col gap-2">
                    <h3 className={SECTION}>{td('sound')}</h3>
                    <AudioDock placement="corner" />
                    {isDM && !readOnly && (
                        <SoundboardPanel campaignId={battle.campaignId} />
                    )}
                </section>
            )}
            {dmControls && (
                <section className="flex flex-col gap-2">
                    <h3 className={SECTION}>{td('dmSection')}</h3>
                    {onComplete && battle.status === BattleStatus.ACTIVE && (
                        <HudButton
                            type="button"
                            onClick={onComplete}
                            className="hud-sc h-10 rounded-xl border border-[var(--gold)]/60 text-sm text-[var(--gold)] hover:bg-[var(--gold)]/10"
                        >
                            {t('complete')}
                        </HudButton>
                    )}
                    <HudButton
                        type="button"
                        data-tour="battle.reset"
                        onClick={() => void reset()}
                        className="hud-sc h-10 rounded-xl border border-hud-danger/50 text-sm text-hud-danger hover:bg-hud-danger/10"
                    >
                        {t('reset')}
                    </HudButton>
                </section>
            )}
            <Link
                href={`/campaigns/${battle.campaignId}`}
                className="hud-sc flex h-10 items-center text-sm text-hud-soft hover:text-[var(--gold)]"
            >
                {t('toCampaign')}
            </Link>
        </div>
    );
}

export function ToolsDrawer({
    open,
    onOpenChange,
    ...props
}: ToolsProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
    const t = useTranslations('battle.drawers');

    return (
        <BattleDrawer
            drawer="tools"
            open={open}
            onOpenChange={onOpenChange}
            title={t('tools')}
            keepOnOutside
            keepMounted
        >
            <ToolsContent {...props} />
        </BattleDrawer>
    );
}
