import { SectionTitle } from '@/components/landing/parts';
import { getTemplateStats } from '@/components/landing/template-stats';
import type { Translator } from '@/lib/i18n/translator';

const COUNT_KEYS = ['spells', 'units', 'classes', 'races'] as const;

const SYSTEMS = [
    { id: 'srd', stats: getTemplateStats('srd-5.2') },
    { id: 'grim', stats: getTemplateStats('grim-d100') },
    { id: 'custom', stats: null },
] as const;

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
                {SYSTEMS.map(({ id, stats }) => (
                    <article
                        key={id}
                        className="landing-reveal flex flex-col gap-3 rounded-2xl border border-hud-line bg-gradient-to-b from-hud-surface to-hud-page p-6 shadow-[inset_0_1px_0_rgba(230,194,90,.15)]"
                    >
                        <p className="hud-sc text-xs tracking-[0.2em] text-[var(--ld-gold)]">
                            {t(`systems.cards.${id}.tag`)}
                        </p>
                        <h3 className="hud-sc text-2xl text-hud-ink">
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
                                            className="rounded-md border border-hud-rule bg-hud-page px-2 py-1 text-xs text-hud-ink"
                                        >
                                            {t(`systems.count.${k}`, {
                                                n: stats[k],
                                            })}
                                        </li>
                                    )
                                )}
                            </ul>
                        )}
                    </article>
                ))}
            </div>
        </section>
    );
}
