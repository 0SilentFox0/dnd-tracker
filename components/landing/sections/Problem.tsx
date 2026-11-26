import type { CSSProperties } from 'react';
import { ArrowRight, X } from 'lucide-react';

import { PROBLEM_ICONS } from '@/components/landing/media';
import { keysOf, listOf } from '@/components/landing/messages';
import { BrandMark, TrailMark } from '@/components/landing/parts';
import { BRAND } from '@/lib/constants/site';
import type { Translator } from '@/lib/i18n/translator';

// where each tool note lies before the scroll tidies the pile: x px, y px, rotation deg
const SCATTER = [
    [-46, 34, -9],
    [58, -18, 7],
    [-24, 52, 5],
    [70, 22, -6],
    [-60, -12, 8],
    [36, 40, -11],
    [-14, -30, 4],
];

export function Problem({ t }: { t: Translator }) {
    return (
        <section
            aria-labelledby="pain-title"
            className="ld-lazy ld-panel px-4 py-20"
        >
            <div className="ld-container grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
                <div className="space-y-5">
                    <TrailMark />
                    <p className="hud-sc text-sm tracking-[0.2em] text-[var(--ld-gold)]">
                        {t('problem.eyebrow')}
                    </p>
                    <h2
                        id="pain-title"
                        className="hud-sc ld-ink text-3xl text-hud-ink sm:text-4xl"
                    >
                        {t('problem.title')}
                    </h2>
                    <ul className="space-y-3">
                        {listOf(t, 'problem.pains').map((p) => (
                            <li
                                key={p}
                                className="flex gap-3 text-lg text-hud-bone"
                            >
                                <X
                                    aria-hidden
                                    className="mt-1 size-5 shrink-0 text-hud-danger"
                                />
                                {p}
                            </li>
                        ))}
                    </ul>
                    <p className="hud-sc flex items-start gap-2 text-xl text-hud-ink">
                        <ArrowRight
                            aria-hidden
                            className="mt-1 size-5 shrink-0"
                        />
                        {t('problem.resolve')}
                    </p>
                </div>

                <div
                    aria-hidden
                    className="ld-pile relative mx-auto w-full max-w-md"
                >
                    <div className="space-y-2">
                        {keysOf(t, 'problem.replaces').map((key, i) => {
                            const Icon = PROBLEM_ICONS[i];

                            const [x, y, r] = SCATTER[i % SCATTER.length];

                            return (
                                <div
                                    key={key}
                                    style={
                                        {
                                            marginLeft: `${(i % 3) * 14}px`,
                                            '--sx': `${x}px`,
                                            '--sy': `${y}px`,
                                            '--sr': `${r}deg`,
                                        } as CSSProperties
                                    }
                                    className="ld-note relative flex items-center gap-3 rounded-lg border border-hud-rule bg-hud-surface px-3 py-2 text-hud-bone/70"
                                >
                                    <Icon className="size-4 shrink-0 text-hud-muted" />
                                    <span className="text-sm">
                                        {t(`problem.replaces.${key}.title`)}
                                    </span>
                                    <span className="ml-auto text-xs text-hud-muted">
                                        {t(`problem.replaces.${key}.text`)}
                                    </span>
                                    <span className="ld-pin" />
                                    <span className="ld-strike absolute inset-x-2 top-1/2 h-px bg-hud-danger/80" />
                                </div>
                            );
                        })}
                    </div>
                    <div className="ld-hub mt-4 flex items-center gap-3 rounded-xl border border-[var(--ld-gold)] bg-gradient-to-r from-[#2a1d05] via-[#3a2a0c] to-[#2a1d05] px-4 py-3 shadow-[0_24px_40px_-20px_rgba(0,0,0,.9)]">
                        <BrandMark />
                        <span className="hud-sc text-hud-ink">
                            {BRAND.name}
                        </span>
                        <span className="ml-auto text-xs text-hud-ink">
                            {t('problem.hubTag')}
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}
