import type { CSSProperties } from 'react';

import { FEATURE_ITEMS } from '@/components/landing/media';
import { MediaFrame, Screen } from '@/components/landing/MediaFrame';
import { SectionTitle } from '@/components/landing/parts';
import type { Locale } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translator';

export function Features({ t, locale }: { t: Translator; locale: Locale }) {
    return (
        <section
            id="features"
            className="ld-lazy ld-panel scroll-mt-20 px-4 py-20"
        >
            <SectionTitle
                eyebrow={t('features.eyebrow')}
                title={t('features.title')}
                text={t('features.text')}
            />
            <div className="ld-container mt-12 grid gap-6 min-[2560px]:grid-cols-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(FEATURE_ITEMS).map(
                    ([id, { icon: Icon, shot }], i) => {
                        const title = t(`features.items.${id}.title`);

                        return (
                            <article
                                key={id}
                                className="ld-rise"
                                style={{ '--c': i % 3 } as CSSProperties}
                            >
                                <div
                                    data-ld-tilt
                                    className="ld-tiltcard flex h-full flex-col gap-4 rounded-xl border border-hud-line bg-gradient-to-b from-hud-surface to-hud-page p-4 shadow-[inset_0_1px_0_rgba(230,194,90,.15)]"
                                >
                                    <MediaFrame title={title}>
                                        <Screen
                                            locale={locale}
                                            id={shot}
                                            alt={title}
                                            sizes="(min-width: 1024px) 380px, 100vw"
                                            className="ld-inner-par"
                                        />
                                    </MediaFrame>
                                    <div className="space-y-2 px-1 pb-1">
                                        <h3 className="hud-sc flex items-center gap-2 text-xl text-hud-ink">
                                            <Icon
                                                aria-hidden
                                                className="size-5 shrink-0 text-[var(--ld-gold)]"
                                            />
                                            {title}
                                        </h3>
                                        <p className="text-sm text-hud-bone">
                                            {t(`features.items.${id}.text`)}
                                        </p>
                                    </div>
                                </div>
                            </article>
                        );
                    }
                )}
            </div>
        </section>
    );
}
