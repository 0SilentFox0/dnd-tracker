'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { SPOTS } from '../../rules/combat/constants';
import type { WfrpAttackMods } from '../../rules/percentile/fortune';

import { DieInput } from '@/components/battle/hud/DiceInput';
import { HudButton } from '@/components/hud';
import { cn } from '@/lib/utils';
import { PERCENTILE_SIDES } from '@/lib/utils/battle/flows';

type Patch = { [K in keyof WfrpAttackMods]?: WfrpAttackMods[K] | undefined };

interface AttackModsPickerProps {
    mods: WfrpAttackMods;
    set: (patch: Patch) => void;
    kind: 'melee' | 'ranged' | null;
    helpless: boolean;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div
            role="group"
            aria-label={label}
            className="mt-1 flex h-9 flex-wrap border border-white/20"
        >
            {children}
        </div>
    );
}

function Toggle({
    on,
    onClick,
    children,
}: {
    on: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <HudButton
            type="button"
            aria-pressed={on}
            onClick={onClick}
            className={cn(
                'flex-1 border-l border-white/20 px-1 text-sm first:border-l-0',
                on ? 'bg-white/10 font-bold text-[var(--ink)]' : 'text-hud-soft'
            )}
        >
            {children}
        </HudButton>
    );
}

export function AttackModsPicker({
    mods,
    set,
    kind,
    helpless,
}: AttackModsPickerProps) {
    const t = useTranslations('battleWfrp.ui.attackMods');

    const tf = useTranslations('battleWfrp.ui.fortune');

    return (
        <div className="mt-3">
            <div className="text-sm text-[var(--hud-muted)]">{t('title')}</div>
            <Row label={t('calledShot')}>
                <Toggle
                    on={!mods.calledShot}
                    onClick={() => set({ calledShot: undefined })}
                >
                    {t('off')}
                </Toggle>
                {SPOTS.map((spot) => (
                    <Toggle
                        key={spot}
                        on={mods.calledShot === spot}
                        onClick={() => set({ calledShot: spot })}
                    >
                        {tf(`locations.${spot}`)}
                    </Toggle>
                ))}
            </Row>
            <Row label={t('highGround')}>
                <Toggle
                    on={!mods.highGround}
                    onClick={() => set({ highGround: undefined })}
                >
                    {t('off')}
                </Toggle>
                <Toggle
                    on={mods.highGround === 'attacker'}
                    onClick={() => set({ highGround: 'attacker' })}
                >
                    {t('highAttacker')}
                </Toggle>
                <Toggle
                    on={mods.highGround === 'defender'}
                    onClick={() => set({ highGround: 'defender' })}
                >
                    {t('highDefender')}
                </Toggle>
            </Row>
            <Row label={t('situation')}>
                {kind === 'ranged' && (
                    <Toggle
                        on={!!mods.cover}
                        onClick={() =>
                            set({ cover: mods.cover ? undefined : true })
                        }
                    >
                        {t('cover')}
                    </Toggle>
                )}
                {kind === 'melee' && (
                    <Toggle
                        on={!!mods.enclosed}
                        onClick={() =>
                            set({ enclosed: mods.enclosed ? undefined : true })
                        }
                    >
                        {t('enclosed')}
                    </Toggle>
                )}
                {kind === 'melee' && (
                    <Toggle
                        on={!!mods.badFooting}
                        onClick={() =>
                            set({
                                badFooting: mods.badFooting ? undefined : true,
                            })
                        }
                    >
                        {t('badFooting')}
                    </Toggle>
                )}
                {kind === 'melee' && (
                    <Toggle
                        on={!!mods.grapple}
                        onClick={() =>
                            set({ grapple: mods.grapple ? undefined : true })
                        }
                    >
                        {t('grapple')}
                    </Toggle>
                )}
            </Row>
            {helpless && (
                <div className="mt-1 flex items-center gap-2 text-sm text-hud-soft">
                    {t('helplessRoll')}
                    <DieInput
                        label={t('helplessRoll')}
                        sides={PERCENTILE_SIDES}
                        value={mods.helplessRoll}
                        onChange={(v) => set({ helplessRoll: v })}
                        strict
                        className="h-8 w-16 border border-white/25 bg-black/30 px-1 text-center text-[var(--ink)]"
                    />
                </div>
            )}
        </div>
    );
}
