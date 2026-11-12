'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Images } from 'lucide-react';

import { HudPage, HudPageHeader, HudPanel } from '@/components/hud/page';
import { ShowStage } from '@/components/show/stage/ShowStage';
import { Button } from '@/components/ui/button';
import type { ShowState, SlideDeck } from '@/types/show';

export function DemoDeckPreview({
    campaignId,
    deck,
}: {
    campaignId: string;
    deck: SlideDeck;
}) {
    const t = useTranslations('show.decksPage');

    const [index, setIndex] = useState(0);

    const slide = deck.slides[index];

    const show: ShowState = {
        deckId: deck.id,
        deckTitle: deck.title,
        slide: slide ?? null,
        nextImageUrl: deck.slides[index + 1]?.imageUrl ?? null,
        audio: null,
        seq: index,
    };

    return (
        <HudPage>
            <HudPageHeader
                title={deck.title}
                subtitle={t('previewReadOnly')}
                actions={
                    <Button asChild variant="outline">
                        <Link
                            href={`/campaigns/${campaignId}/dm/show`}
                            data-tour="show.back"
                        >
                            {t('backToDecks')}
                        </Link>
                    </Button>
                }
            />
            {slide ? (
                <HudPanel className="mx-auto max-w-5xl space-y-4 p-4">
                    <div
                        data-tour="show.stage"
                        className="relative mx-auto h-[65dvh] min-h-96 max-w-5xl overflow-hidden rounded-lg bg-black/40"
                    >
                        <ShowStage
                            show={show}
                            campaignId={campaignId}
                            readOnlyPreview
                        />
                    </div>
                    <div
                        data-tour="show.nav"
                        className="flex items-center justify-between gap-3"
                    >
                        <Button
                            type="button"
                            variant="outline"
                            disabled={index === 0}
                            onClick={() =>
                                setIndex((value) => Math.max(0, value - 1))
                            }
                        >
                            <ChevronLeft aria-hidden />
                            {t('previousSlide')}
                        </Button>
                        <span className="text-sm text-hud-muted">
                            {t('previewSlideCount', {
                                current: index + 1,
                                total: deck.slides.length,
                            })}
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={index >= deck.slides.length - 1}
                            onClick={() =>
                                setIndex((value) =>
                                    Math.min(deck.slides.length - 1, value + 1)
                                )
                            }
                        >
                            {t('nextSlide')}
                            <ChevronRight aria-hidden />
                        </Button>
                    </div>
                </HudPanel>
            ) : (
                <HudPanel className="flex flex-col items-center gap-2 p-8 text-center">
                    <Images aria-hidden className="size-8 text-hud-muted" />
                    <p className="text-hud-muted">{t('previewEmpty')}</p>
                </HudPanel>
            )}
        </HudPage>
    );
}
