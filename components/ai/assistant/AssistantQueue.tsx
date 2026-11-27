'use client';
import { useTranslations } from 'next-intl';

import { PagerNav } from '@/components/common/shell/PagerNav';
import { Button } from '@/components/ui/button';
import { ASSISTANT_PAGE_SIZES } from '@/lib/constants/ai';
import { cn } from '@/lib/utils';
import type { IntentSummary } from '@/types/assistant';

export function AssistantQueue({
    items,
    selectedId,
    onSelect,
    onNext,
    onPrevious,
}: {
    items: IntentSummary[];
    selectedId?: string;
    onSelect: (id: string) => void;
    onNext?: () => void;
    onPrevious?: () => void;
}) {
    const t = useTranslations('ai');

    return (
        <section
            aria-label={t('review.queueAria')}
            className="min-w-0 space-y-2"
        >
            <h2 className="font-semibold">
                {t('review.queueTitle', {
                    count: items.filter((i) => i.status === 'pending').length,
                })}
            </h2>
            <p className="text-xs">
                {t('review.perPage', {
                    size: ASSISTANT_PAGE_SIZES.queue,
                    max: ASSISTANT_PAGE_SIZES.queueMax,
                })}
            </p>
            {items.map((item) => (
                <Button
                    className={cn(
                        'h-auto w-full justify-start text-left break-words whitespace-normal',
                        selectedId === item.id &&
                            'border-hud-accent text-hud-accent-fg'
                    )}
                    variant="outline"
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                >
                    {item.summary} · {item.channel} ·{' '}
                    {t(`intentStatus.${item.status}`)}
                </Button>
            ))}
            <PagerNav
                pager={{
                    page: 0,
                    canPrev: !!onPrevious,
                    canNext: !!onNext,
                    prev: () => onPrevious?.(),
                    next: () => onNext?.(),
                }}
                labels={{ prev: t('review.prev'), next: t('review.next') }}
            />
        </section>
    );
}
