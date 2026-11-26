import type { CSSProperties } from 'react';

import { keysOf } from '@/components/landing/messages';
import { SectionTitle } from '@/components/landing/parts';
import type { Translator } from '@/lib/i18n/translator';

export function HowItWorks({ t }: { t: Translator }) {
    return (
        <section
            id="how"
            className="ld-lazy ld-panel scroll-mt-20 border-t border-hud-rule px-4 py-20"
        >
            <SectionTitle eyebrow={t('how.eyebrow')} title={t('how.title')} />
            <ol className="ld-route ld-container relative mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <svg
                    aria-hidden
                    viewBox="0 0 1000 40"
                    preserveAspectRatio="none"
                    className="ld-route-path absolute -top-5 left-[1.25rem] hidden h-10 w-[calc(75%+0.75rem)] text-[var(--ld-gold)] lg:block"
                >
                    <path
                        d="M0 20 C 120 -8, 210 46, 333 20 S 540 -6, 666 20 S 880 44, 1000 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeDasharray="4 7"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
                {keysOf(t, 'how.steps').map((key, i) => (
                    <li
                        key={key}
                        style={{ '--c': i } as CSSProperties}
                        className="ld-rise relative rounded-xl border border-hud-rule bg-hud-panel p-5 pt-8"
                    >
                        <span
                            aria-hidden
                            className="ld-stop metal-gold metal-fill hud-sc absolute -top-5 left-5 grid size-10 place-items-center rounded-full text-lg"
                        >
                            {i + 1}
                        </span>
                        <h3 className="hud-sc mb-1 text-lg text-hud-ink">
                            {t(`how.steps.${key}.title`)}
                        </h3>
                        <p className="text-sm text-hud-bone">
                            {t(`how.steps.${key}.text`)}
                        </p>
                    </li>
                ))}
            </ol>
        </section>
    );
}
