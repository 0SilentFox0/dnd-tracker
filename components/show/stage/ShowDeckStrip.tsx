'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Lock, Music, Star, X } from 'lucide-react';

import { SHOW_TONE, ShowButton } from './show-ui';

import { OptimizedImage } from '@/components/common/OptimizedImage';
import { HudButton } from '@/components/hud';
import { SelectField } from '@/components/ui/select-field';
import { type ShowControl, useDeck, useDecks } from '@/lib/hooks/show';
import { cn } from '@/lib/utils';
import type { ShowState, SlideDeckSummary } from '@/types/show';

const SELECT =
    'h-7 min-w-0 max-w-56 rounded border-0 bg-transparent px-1 py-0 text-xs opacity-75 shadow-none hover:opacity-100 data-[size=default]:h-7 dark:bg-transparent dark:hover:bg-transparent';

const inScene = (sceneId?: string) => (d: SlideDeckSummary) =>
    !!sceneId && d.scenarioPageId === sceneId;

const deckGroups = (
    labels: { own: string; other: string },
    decks: SlideDeckSummary[],
    sceneId?: string
) => {
    const option = (d: SlideDeckSummary) => ({
        value: d.id,
        label: `${d.title} (${d.slideCount})`,
    });

    const own = decks.filter(inScene(sceneId));

    const rest = decks.filter((d) => !inScene(sceneId)(d));

    if (own.length === 0) return { options: rest.map(option) };

    return {
        groups: [
            { label: labels.own, options: own.map(option) },
            ...(rest.length > 0
                ? [
                      {
                          label: labels.other,
                          options: rest.map(option),
                      },
                  ]
                : []),
        ],
    };
};

export function ShowDeckStrip({
    campaignId,
    show,
    control,
    sceneId,
}: {
    campaignId: string;
    show: ShowState | null;
    control: ShowControl;
    sceneId?: string;
}) {
    const t = useTranslations('show');

    const { data: decks } = useDecks(campaignId);

    const deckId = show?.deckId ?? decks?.find(inScene(sceneId))?.id ?? null;

    const { data: deck } = useDeck(campaignId, deckId);

    const currentRef = useRef<HTMLLIElement>(null);

    const currentId = show?.slide?.id;

    useEffect(() => {
        currentRef.current?.scrollIntoView?.({
            inline: 'center',
            block: 'nearest',
        });
    }, [currentId, deck]);

    const cover = show?.cover;

    return (
        <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
                <SelectField
                    aria-label={t('deckStrip.deck')}
                    value={deckId ?? ''}
                    onValueChange={(id) =>
                        id && void control.send({ action: 'open', deckId: id })
                    }
                    placeholder={t('deckStrip.chooseDeck')}
                    {...deckGroups(
                        {
                            own: t('deckStrip.thisScene'),
                            other: t('deckStrip.otherDecks'),
                        },
                        decks ?? [],
                        sceneId
                    )}
                    triggerClassName={SELECT}
                />
                {cover && (
                    <span
                        className={cn(
                            'ml-auto flex items-center gap-1 text-xs',
                            SHOW_TONE.muted
                        )}
                        title={t('deckStrip.coverTitle', {
                            title:
                                cover.slide.title ??
                                t('deckStrip.untitledLower'),
                        })}
                    >
                        <Star className="size-3 fill-current" />
                        <OptimizedImage
                            src={cover.slide.imageUrl}
                            alt={t('deckStrip.cover')}
                            width={64}
                            height={36}
                            className="h-[18px] w-8 rounded-sm object-cover"
                        />
                        <ShowButton
                            aria-label={t('deckStrip.clearCover')}
                            className="h-6 min-w-6 px-1"
                            onClick={() =>
                                void control.send({ action: 'clearCover' })
                            }
                        >
                            <X className="size-3" />
                        </ShowButton>
                    </span>
                )}
            </div>
            {deck && (
                <ol className="flex gap-2 overflow-x-auto pb-1">
                    {deck.slides.map((slide, i) => {
                        const current =
                            show?.deckId === deck.id && slide.id === currentId;

                        const isCover =
                            cover?.deckId === deck.id &&
                            cover.slide.id === slide.id;

                        return (
                            <li
                                key={slide.id}
                                ref={current ? currentRef : undefined}
                                className="group relative w-28 shrink-0"
                            >
                                <HudButton
                                    type="button"
                                    aria-current={current || undefined}
                                    aria-label={
                                        slide.title
                                            ? t('deckStrip.slideTitled', {
                                                  index: i + 1,
                                                  title: slide.title,
                                              })
                                            : t('slide', { index: i + 1 })
                                    }
                                    onClick={() =>
                                        void control.send({
                                            action: 'open',
                                            deckId: deck.id,
                                            slideId: slide.id,
                                        })
                                    }
                                    title={slide.title}
                                    className={cn(
                                        'relative block w-full overflow-hidden rounded transition',
                                        current
                                            ? SHOW_TONE.accent
                                            : 'opacity-60 hover:opacity-100'
                                    )}
                                >
                                    <OptimizedImage
                                        src={slide.imageUrl}
                                        alt=""
                                        width={128}
                                        height={72}
                                        className="h-[63px] w-28 object-cover"
                                    />
                                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1.5 pt-3 pb-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                                        {i + 1}.{' '}
                                        {slide.title ?? t('deckStrip.untitled')}
                                    </span>
                                </HudButton>
                                {slide.audience && (
                                    <Lock
                                        aria-label={t('deckStrip.audience', {
                                            count: slide.audience.length,
                                        })}
                                        className="absolute right-1 bottom-1 size-3 text-white drop-shadow"
                                    />
                                )}
                                {slide.trackId && (
                                    <Music
                                        aria-label={t('deckStrip.hasTrack')}
                                        className="absolute top-1 right-1 size-3 text-white drop-shadow"
                                    />
                                )}
                                {!slide.audience && (
                                    <HudButton
                                        type="button"
                                        aria-pressed={isCover}
                                        aria-label={
                                            isCover
                                                ? t('deckStrip.isCover')
                                                : t('deckStrip.makeCover')
                                        }
                                        title={
                                            isCover
                                                ? t('deckStrip.isCover')
                                                : t('deckStrip.makeCover')
                                        }
                                        onClick={() =>
                                            void control.send(
                                                isCover
                                                    ? { action: 'clearCover' }
                                                    : {
                                                          action: 'setCover',
                                                          deckId: deck.id,
                                                          slideId: slide.id,
                                                      }
                                            )
                                        }
                                        className={cn(
                                            'absolute top-0.5 left-0.5 rounded p-0.5 text-amber-300 drop-shadow transition',
                                            !isCover &&
                                                'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
                                        )}
                                    >
                                        <Star
                                            className={cn(
                                                'size-3',
                                                isCover && 'fill-current'
                                            )}
                                        />
                                    </HudButton>
                                )}
                            </li>
                        );
                    })}
                </ol>
            )}
        </div>
    );
}
