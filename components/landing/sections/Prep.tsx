import type { CSSProperties } from 'react';

import { PREP_PANELS } from '@/components/landing/media';
import { MediaFrame, Screen } from '@/components/landing/MediaFrame';
import { listOf } from '@/components/landing/messages';
import { CheckList, SectionTitle } from '@/components/landing/parts';
import type { Translator } from '@/lib/i18n/translator';

export function Prep({ t }: { t: Translator }) {
    const p = (id: string, key: string) => t(`prep.panels.${id}.${key}`);

    return (
        <section id="prep" className="ld-lazy ld-panel scroll-mt-20 px-4 py-20">
            <SectionTitle
                eyebrow={t('prep.eyebrow')}
                title={t('prep.title')}
                text={t('prep.text')}
            />
            <div className="ld-container mt-12 grid gap-6 min-[2560px]:grid-cols-4 lg:grid-cols-3">
                {PREP_PANELS.map((id, i) => (
                    <article
                        key={id}
                        style={{ '--c': i } as CSSProperties}
                        className="ld-unfurl flex flex-col gap-4 rounded-2xl border border-hud-line bg-gradient-to-b from-hud-surface to-hud-page p-4 shadow-[inset_0_1px_0_rgba(230,194,90,.15)]"
                    >
                        <MediaFrame title={p(id, 'screen')}>
                            <Screen
                                id={id}
                                alt={p(id, 'alt')}
                                sizes="(min-width: 1024px) 380px, 100vw"
                            />
                        </MediaFrame>
                        <div className="space-y-3 px-1 pb-1">
                            <p className="hud-sc text-xs tracking-[0.2em] text-[var(--ld-gold)]">
                                {p(id, 'eyebrow')}
                            </p>
                            <h3 className="hud-sc text-xl text-hud-ink">
                                {p(id, 'title')}
                            </h3>
                            <p className="text-sm text-hud-bone">
                                {p(id, 'text')}
                            </p>
                            <CheckList
                                items={listOf(t, `prep.panels.${id}.points`)}
                            />
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
