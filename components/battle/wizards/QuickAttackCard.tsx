'use client';

import { useTranslations } from 'next-intl';
import { Loader2, Swords, X } from 'lucide-react';

import { HudButton, HudIconButton, HudToggleChip } from '@/components/hud';
import type { QuickAttackModel } from '@/lib/hooks/battle';
import { useText } from '@/lib/i18n/use-text';

export function QuickAttackCard({ quick }: { quick: QuickAttackModel }) {
    const t = useTranslations('battleWizards.attack.quick');

    const text = useText();

    const { view, actions } = quick;

    const { target, counter, status } = view;

    const busy = status !== 'idle';

    return (
        <section
            data-quick-attack
            aria-label={t('title')}
            className="ds-panel pointer-events-auto w-full max-w-sm space-y-2 rounded-xl p-3 text-hud-ink"
        >
            <header className="flex items-center justify-between gap-2">
                <h2 className="hud-sc text-base font-bold">
                    {counter
                        ? t('counter', { n: counter.n, m: counter.m })
                        : t('title')}
                    {target && ` → ${target.basicInfo.name}`}
                </h2>
                {!busy && (
                    <HudIconButton
                        size="sm"
                        aria-label={t('close')}
                        onClick={actions.close}
                    >
                        <X className="size-4" />
                    </HudIconButton>
                )}
            </header>
            {!target ? (
                <>
                    <p className="text-sm text-hud-soft">
                        {view.targets.length > 0 ? t('pick') : t('noTargets')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {view.targets.map((p) => (
                            <HudToggleChip
                                key={p.basicInfo.id}
                                tall
                                active={false}
                                onClick={() => actions.pickTarget(p.basicInfo.id)}
                            >
                                {p.basicInfo.name}
                            </HudToggleChip>
                        ))}
                    </div>
                </>
            ) : (
                <>
                    <div
                        role="group"
                        aria-label={t('weapons')}
                        className="flex flex-wrap gap-1.5"
                    >
                        {view.weapons.map(({ attack, reachable, reason }) => {
                            const id = attack.id ?? attack.name;

                            return (
                                <HudToggleChip
                                    key={id}
                                    tall
                                    active={id === view.attackId}
                                    disabled={!reachable || busy}
                                    title={reason ? text(reason) : undefined}
                                    onClick={() => actions.pickWeapon(id)}
                                >
                                    {attack.name}
                                </HudToggleChip>
                            );
                        })}
                    </div>
                    {view.cover && (
                        <p className="text-sm text-[#e0a050]">{t('cover')}</p>
                    )}
                    {view.forced && (
                        <p className="text-xs text-hud-ink">
                            {text(view.forced.reason)}
                        </p>
                    )}
                    {view.error && (
                        <p role="alert" className="text-sm text-[#e9a08f]">
                            {text(view.error)}
                        </p>
                    )}
                    {status === 'waitingDm' && (
                        <p role="status" className="text-sm text-hud-soft">
                            {t('waitingDm')}
                        </p>
                    )}
                    <div className="grid grid-cols-[1.4fr_1fr] gap-2">
                        <HudButton
                            type="button"
                            disabled={busy || !view.attackId}
                            onClick={actions.attack}
                            className="hud-sc flex h-11 items-center justify-center gap-2 border border-hud-accent-2 bg-hud-accent font-bold text-hud-accent-ink disabled:opacity-50"
                        >
                            {status === 'sending' ? (
                                <Loader2
                                    className="size-4 animate-spin"
                                    aria-hidden
                                />
                            ) : (
                                <Swords className="size-4" aria-hidden />
                            )}
                            {status === 'sending' ? t('sending') : t('attack')}
                        </HudButton>
                        <HudButton
                            type="button"
                            disabled={busy}
                            onClick={actions.wizard}
                            className="h-11 border border-white/25 text-sm text-[var(--ink)] disabled:opacity-50"
                        >
                            {t('wizard')}
                        </HudButton>
                    </div>
                </>
            )}
        </section>
    );
}
