'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { D100Input } from './D100Input';

import { AiRollButton } from '@/components/battle/hud/DiceInput';
import { HudButton } from '@/components/hud';
import type { HeroPanelProps } from '@/components/systems/types';
import { cn } from '@/lib/utils';
import { useMomentumPanel } from '@/systems/wfrp/hooks/useMomentumPanel';
import { DEFENSIVE_SKILLS } from '@/systems/wfrp/rules/combat/defensive';

const SOURCES = ['server', 'manual'] as const;

const GRAPPLE_CHOICES = ['damage', 'entangle', 'free'] as const;

const btn =
    'h-9 w-full border border-white/25 px-2 text-left text-sm text-[var(--bone)] disabled:opacity-40';

export function MomentumPanel({ hero }: HeroPanelProps) {
    const t = useTranslations('battleWfrp.ui.momentum');

    const tSrc = useTranslations('battleWfrp.ui.test');

    const panel = useMomentumPanel(hero);

    const [open, setOpen] = useState(false);

    const [rolling, setRolling] = useState(false);

    const [sprinting, setSprinting] = useState(false);

    const [charging, setCharging] = useState(false);

    const [aiming, setAiming] = useState(false);

    const [defending, setDefending] = useState(false);

    const [grappling, setGrappling] = useState(false);

    const [ally, setAlly] = useState('');

    const [source, setSource] = useState<(typeof SOURCES)[number]>('server');

    if (!panel) return null;

    const run = (roll?: number) => {
        setOpen(false);
        panel.leadership(ally, roll);
    };

    const rollSource = (onRoll: (roll?: number) => void) => (
        <div className="pb-1">
            <div className="grid h-9 grid-cols-2 border border-white/20">
                {SOURCES.map((m) => (
                    <HudButton
                        key={m}
                        type="button"
                        aria-pressed={source === m}
                        onClick={() => setSource(m)}
                        className={cn(
                            'border-l border-white/20 text-sm first:border-l-0',
                            source === m
                                ? 'bg-white/10 font-bold text-[var(--ink)]'
                                : 'text-hud-soft'
                        )}
                    >
                        {tSrc(m === 'server' ? 'auto' : 'manual')}
                    </HudButton>
                ))}
            </div>
            {source === 'manual' ? (
                <D100Input onRoll={(roll) => onRoll(roll)} />
            ) : (
                <div className="mt-2">
                    <AiRollButton onClick={() => onRoll()} />
                </div>
            )}
        </div>
    );

    const disengage = (roll?: number) => {
        setRolling(false);
        panel.disengage(roll);
    };

    return (
        <div className="mt-2 space-y-1.5">
            <div className="text-xs text-hud-soft uppercase">{t('title')}</div>
            {panel.canDisengage && (
                <>
                    <HudButton
                        type="button"
                        disabled={panel.isPending}
                        aria-expanded={rolling}
                        className={btn}
                        onClick={() =>
                            panel.holds ? disengage() : setRolling(!rolling)
                        }
                    >
                        {t(panel.holds ? 'disengageFree' : 'disengage')}
                    </HudButton>
                    {rolling && !panel.holds && rollSource(disengage)}
                </>
            )}
            {panel.canRun && (
                <HudButton
                    type="button"
                    disabled={panel.isPending}
                    className={btn}
                    onClick={panel.run}
                >
                    {t('run')}
                </HudButton>
            )}
            {panel.canSprint && (
                <>
                    <HudButton
                        type="button"
                        disabled={panel.isPending}
                        aria-expanded={sprinting}
                        className={btn}
                        onClick={() => setSprinting(!sprinting)}
                    >
                        {t('sprint')}
                    </HudButton>
                    {sprinting &&
                        rollSource((roll) => {
                            setSprinting(false);
                            panel.sprint(roll);
                        })}
                </>
            )}
            {panel.canCharge && panel.chargeTargets.length > 0 && (
                <>
                    <HudButton
                        type="button"
                        disabled={panel.isPending}
                        aria-expanded={charging}
                        className={btn}
                        onClick={() => setCharging(!charging)}
                    >
                        {t('charge')}
                    </HudButton>
                    {charging &&
                        panel.chargeTargets.map((f) => (
                            <HudButton
                                key={f.id}
                                type="button"
                                disabled={panel.isPending}
                                className={btn}
                                onClick={() => {
                                    setCharging(false);
                                    panel.charge(f.id);
                                }}
                            >
                                {f.name}
                            </HudButton>
                        ))}
                </>
            )}
            {panel.canAim && panel.aimTargets.length > 0 && (
                <>
                    <HudButton
                        type="button"
                        disabled={panel.isPending}
                        aria-expanded={aiming}
                        className={btn}
                        onClick={() => setAiming(!aiming)}
                    >
                        {t('aim')}
                    </HudButton>
                    {aiming &&
                        panel.aimTargets.map((f) => (
                            <HudButton
                                key={f.id}
                                type="button"
                                disabled={panel.isPending}
                                className={btn}
                                onClick={() => {
                                    setAiming(false);
                                    panel.aim(f.id);
                                }}
                            >
                                {f.name}
                            </HudButton>
                        ))}
                </>
            )}
            {panel.canDefend && (
                <>
                    <HudButton
                        type="button"
                        disabled={panel.isPending}
                        aria-expanded={defending}
                        className={btn}
                        onClick={() => setDefending(!defending)}
                    >
                        {t('defensive')}
                    </HudButton>
                    {defending &&
                        DEFENSIVE_SKILLS.map((skill) => (
                            <HudButton
                                key={skill}
                                type="button"
                                disabled={panel.isPending}
                                className={btn}
                                onClick={() => {
                                    setDefending(false);
                                    panel.defend(skill);
                                }}
                            >
                                {t(`defensiveSkill.${skill}`)}
                            </HudButton>
                        ))}
                </>
            )}
            {panel.canFlee && (
                <HudButton
                    type="button"
                    disabled={panel.isPending}
                    className={btn}
                    onClick={panel.flee}
                >
                    {t('flee')}
                </HudButton>
            )}
            {panel.canGrapple && (
                <>
                    <HudButton
                        type="button"
                        disabled={panel.isPending}
                        aria-expanded={grappling}
                        className={btn}
                        onClick={() => setGrappling(!grappling)}
                    >
                        {t('grapple')}
                    </HudButton>
                    {grappling &&
                        GRAPPLE_CHOICES.map((choice) => (
                            <HudButton
                                key={choice}
                                type="button"
                                disabled={panel.isPending}
                                className={btn}
                                onClick={() => {
                                    setGrappling(false);
                                    panel.grapple(choice);
                                }}
                            >
                                {t(`grappleChoice.${choice}`)}
                            </HudButton>
                        ))}
                </>
            )}
            {panel.holds && (
                <>
                    <HudButton
                        type="button"
                        disabled={panel.isPending || panel.blocker !== null}
                        className={btn}
                        onClick={panel.secondAttack}
                    >
                        {t('secondAttack')}
                    </HudButton>
                    {panel.blocker && (
                        <div className="text-xs text-hud-soft">
                            {t(`reason.${panel.blocker}`)}
                        </div>
                    )}
                    <HudButton
                        type="button"
                        disabled={panel.isPending || panel.allies.length === 0}
                        aria-expanded={open}
                        className={btn}
                        onClick={() => setOpen(!open)}
                    >
                        {t('leadership')}
                    </HudButton>
                    {open && (
                        <div className="pb-1">
                            <div className="text-xs text-hud-soft">
                                {t('ally')}
                            </div>
                            {panel.allies.map((a) => (
                                <HudButton
                                    key={a.id}
                                    type="button"
                                    aria-pressed={ally === a.id}
                                    className={cn(
                                        btn,
                                        ally === a.id && 'bg-white/10 font-bold'
                                    )}
                                    onClick={() => setAlly(a.id)}
                                >
                                    {a.name}
                                </HudButton>
                            ))}
                            {ally && rollSource(run)}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
