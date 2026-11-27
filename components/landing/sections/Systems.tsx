import type { CSSProperties } from 'react';

import { SYSTEM_DICE } from '@/components/landing/Dice';
import { SectionTitle } from '@/components/landing/parts';
import { getTemplateStats } from '@/components/landing/template-stats';
import type { Translator } from '@/lib/i18n/translator';

const COUNT_KEYS = ['spells', 'units', 'classes', 'races'] as const;

const SYSTEMS = [
    { id: 'srd', stats: getTemplateStats('srd') },
    { id: 'grim', stats: getTemplateStats('grim') },
    { id: 'custom', stats: null },
] as const;

// the number counts up on scroll (CSS counter); readers get the plain label
function CountChip({ label, n }: { label: string; n: number }) {
    const parts = label.split(String(n));

    if (parts.length !== 2) return <>{label}</>;

    return (
        <>
            <span className="sr-only">{label}</span>
            <span aria-hidden>
                {parts[0]}
                <span
                    className="ld-count"
                    style={
                        {
                            '--to': n,
                            '--w': `${String(n).length}ch`,
                        } as CSSProperties
                    }
                >
                    <span className="ld-count-static">{n}</span>
                </span>
                {parts[1]}
            </span>
        </>
    );
}

export function Systems({ t }: { t: Translator }) {
    return (
        <section
            id="systems"
            className="ld-lazy ld-panel scroll-mt-20 px-4 py-20"
        >
            <SectionTitle
                eyebrow={t('systems.eyebrow')}
                title={t('systems.title')}
                text={t('systems.text')}
            />
            <div className="ld-container mt-12 grid gap-6 lg:grid-cols-3">
                {SYSTEMS.map(({ id, stats }, i) => {
                    const Die = SYSTEM_DICE[id];

                    return (
                        <article
                            key={id}
                            className="ld-rise relative flex flex-col gap-3 rounded-xl border border-hud-line bg-gradient-to-b from-hud-surface to-hud-page p-6 shadow-[inset_0_1px_0_rgba(230,194,90,.15)]"
                            style={{ '--c': i } as CSSProperties}
                        >
                            <span
                                aria-hidden
                                className="ld-die-in absolute top-5 right-5 block h-14"
                            >
                                <Die className="h-full w-auto drop-shadow-[0_10px_14px_rgba(0,0,0,.7)]" />
                            </span>
                            <p className="hud-sc pr-20 text-xs tracking-[0.2em] text-[var(--ld-gold)]">
                                {t(`systems.cards.${id}.tag`)}
                            </p>
                            <h3 className="hud-sc pr-20 text-2xl text-hud-ink">
                                {t(`systems.cards.${id}.name`)}
                            </h3>
                            <p className="text-sm text-hud-bone">
                                {t(`systems.cards.${id}.text`)}
                            </p>
                            {stats && (
                                <ul className="mt-auto flex flex-wrap gap-2 pt-2">
                                    {COUNT_KEYS.filter((k) => stats[k] > 0).map(
                                        (k) => (
                                            <li
                                                key={k}
                                                className="rounded-lg border border-hud-rule bg-hud-page px-2 py-1 text-xs text-hud-ink"
                                            >
                                                <CountChip
                                                    label={t(
                                                        `systems.count.${k}`,
                                                        {
                                                            n: stats[k],
                                                        }
                                                    )}
                                                    n={stats[k]}
                                                />
                                            </li>
                                        )
                                    )}
                                </ul>
                            )}
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
