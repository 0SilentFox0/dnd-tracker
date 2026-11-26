import type { CSSProperties } from 'react';

import { FX_SPRITES } from '@/components/landing/media';
import { keysOf, listOf } from '@/components/landing/messages';
import { SectionTitle } from '@/components/landing/parts';
import { D20, SessionDemo } from '@/components/landing/SessionDemo';
import type { Translator } from '@/lib/i18n/translator';
import { cn } from '@/lib/utils';

// decorative initiative chips floating at different depths around the demo
const DEPTH_CHIPS = [
    {
        value: '18',
        side: 'right-[-3.5rem] top-[8%]',
        depth: 1.4,
        tone: 'border-[#ff9a4d]/70',
    },
    {
        value: '14',
        side: 'right-[-5.5rem] top-[30%]',
        depth: 0.8,
        tone: 'border-hud-line',
    },
    {
        value: '9',
        side: 'right-[-3rem] top-[52%]',
        depth: 1.1,
        tone: 'border-hud-line',
    },
];

export function Combat({ t }: { t: Translator }) {
    return (
        <section
            id="combat"
            className="ld-lazy ld-panel scroll-mt-20 border-t border-hud-rule px-4 py-20"
        >
            <SectionTitle
                eyebrow={t('combat.eyebrow')}
                title={t('combat.title')}
                text={t('combat.text')}
            />
            <div className="ld-container mt-14">
                <div className="ld-stage relative">
                    <div className="ld-stage-tilt">
                        <SessionDemo t={t} />
                    </div>
                    <div
                        aria-hidden
                        className="ld-depth-layer pointer-events-none absolute inset-y-0 left-1/2 hidden w-full max-w-5xl -translate-x-1/2 xl:block"
                    >
                        <span
                            className="ld-depth absolute top-[14%] -left-20 size-16"
                            style={{ '--d': 1.6 } as CSSProperties}
                        >
                            <D20
                                value="20"
                                className="size-full drop-shadow-[0_18px_20px_rgba(0,0,0,.8)]"
                            />
                        </span>
                        {DEPTH_CHIPS.map((chip) => (
                            <span
                                key={chip.value}
                                className={cn(
                                    'ld-depth hud-sc absolute grid size-12 place-items-center rounded-full border-2 bg-hud-page text-lg text-hud-ink shadow-[0_16px_24px_-8px_rgba(0,0,0,.9)]',
                                    chip.side,
                                    chip.tone
                                )}
                                style={{ '--d': chip.depth } as CSSProperties}
                            >
                                {chip.value}
                            </span>
                        ))}
                    </div>
                </div>

                <ol className="mt-20 grid gap-x-10 gap-y-6 min-[2560px]:grid-cols-4 sm:grid-cols-2 lg:grid-cols-3">
                    {keysOf(t, 'combat.points').map((key, i) => (
                        <li
                            key={key}
                            className="landing-reveal flex gap-4 border-t border-hud-rule pt-4"
                        >
                            <span
                                aria-hidden
                                className="hud-sc text-3xl leading-none text-hud-muted"
                            >
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            <div>
                                <h3 className="hud-sc text-lg text-hud-ink">
                                    {t(`combat.points.${key}.title`)}
                                </h3>
                                <p className="mt-1 text-sm text-hud-soft">
                                    {t(`combat.points.${key}.text`)}
                                </p>
                            </div>
                        </li>
                    ))}
                </ol>

                <div className="relative isolate mt-20 overflow-hidden rounded-2xl border border-hud-rule px-4 py-12 sm:px-8">
                    <div className="absolute inset-0 -z-10 [background:radial-gradient(ellipse_at_50%_30%,rgba(120,80,200,.16),transparent_60%),#0e0b09]" />
                    <div className="mx-auto max-w-2xl space-y-2 text-center">
                        <h3 className="hud-sc text-2xl text-hud-ink sm:text-3xl">
                            {t('combat.fx.title')}
                        </h3>
                        <p className="text-hud-bone">{t('combat.fx.text')}</p>
                    </div>
                    <ul className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        {FX_SPRITES.map((sprite, i) => {
                            const name = t(`combat.fx.names.${i + 1}`);

                            return (
                                <li
                                    key={name}
                                    className="flex flex-col items-center gap-2 rounded-xl border border-hud-rule bg-hud-page p-4"
                                    style={{
                                        boxShadow: `inset 0 -40px 60px -30px ${sprite.glow}`,
                                    }}
                                >
                                    <span
                                        aria-hidden
                                        className="grid size-24 place-items-center"
                                    >
                                        <span
                                            className={cn(
                                                'ld-sprite block',
                                                sprite.sprite,
                                                sprite.scale
                                            )}
                                        />
                                    </span>
                                    <span className="hud-sc text-center text-sm text-hud-ink">
                                        {name}
                                    </span>
                                </li>
                            );
                        })}
                        <li className="flex flex-col items-center gap-2 rounded-xl border border-hud-rule bg-hud-page p-4 shadow-[inset_0_-40px_60px_-30px_rgba(230,120,60,.3)]">
                            <span
                                aria-hidden
                                className="grid size-24 place-items-center"
                            >
                                <D20
                                    value="20"
                                    className="ld-d20-spin size-20"
                                />
                            </span>
                            <span className="hud-sc text-center text-sm text-hud-ink">
                                3D
                            </span>
                        </li>
                    </ul>
                    <ul className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-2">
                        {listOf(t, 'combat.fx.auras').map((a) => (
                            <li
                                key={a}
                                className="rounded-full border border-hud-line bg-black/40 px-3 py-1 text-sm text-hud-bone"
                            >
                                {a}
                            </li>
                        ))}
                        <li className="rounded-full px-3 py-1 text-sm text-[var(--ld-gold)]">
                            {t('combat.fx.more')}…
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    );
}
