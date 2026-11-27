import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

export type LoadingVariant = 'rows' | 'cards' | 'list' | 'detail' | 'form';

const bar = (cls: string) => (
    <div className={cn('ds-skeleton rounded-lg', cls)} />
);

function Body({ variant, count }: { variant: LoadingVariant; count: number }) {
    const items = Array.from({ length: count }, (_, i) => i);

    switch (variant) {
        case 'cards':
            return (
                <div className="ds-list-grid">
                    {items.map((i) => (
                        <div
                            key={i}
                            data-slot="skeleton-card"
                            className="ds-panel space-y-3 p-4"
                        >
                            {bar('h-5 w-3/5')}
                            {bar('h-4 w-full')}
                            {bar('h-4 w-4/5')}
                            {bar('h-6 w-20 rounded-full')}
                        </div>
                    ))}
                </div>
            );
        case 'list':
            return (
                <div className="space-y-3">
                    {items.map((i) => (
                        <div
                            key={i}
                            data-slot="skeleton-list-item"
                            className="flex items-center gap-3"
                        >
                            {bar('size-10 shrink-0 rounded-full')}
                            <div className="flex-1 space-y-2">
                                {bar('h-4 w-2/5')}
                                {bar('h-4 w-4/5')}
                            </div>
                        </div>
                    ))}
                </div>
            );
        case 'detail':
            return (
                <div className="space-y-4">
                    {bar('h-8 w-1/2')}
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            data-slot="skeleton-paragraph"
                            className="space-y-2"
                        >
                            {bar('h-4 w-full')}
                            {bar('h-4 w-11/12')}
                            {bar('h-4 w-3/4')}
                        </div>
                    ))}
                </div>
            );
        case 'form':
            return (
                <div className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
                    <div className="hidden space-y-2 md:block">
                        {[0, 1, 2, 3, 4].map((i) => (
                            <div key={i}>{bar('h-9 w-full')}</div>
                        ))}
                    </div>
                    <div className="space-y-4">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                data-slot="skeleton-field"
                                className="space-y-2"
                            >
                                {bar('h-4 w-1/4')}
                                {bar('h-10 w-full')}
                            </div>
                        ))}
                    </div>
                </div>
            );
        default:
            return (
                <div className="space-y-2">
                    {items.map((i) => (
                        <div
                            key={i}
                            data-slot="skeleton-row"
                            className="ds-skeleton h-14 rounded-lg"
                        />
                    ))}
                </div>
            );
    }
}

export function LoadingState({
    variant = 'rows',
    count = 3,
    label,
    className,
}: {
    variant?: LoadingVariant;
    count?: number;
    label?: string;
    className?: string;
}) {
    const t = useTranslations('common.states');

    return (
        <div
            role="status"
            aria-busy="true"
            data-variant={variant}
            className={className}
        >
            <span className="sr-only">{label ?? t('loading')}</span>
            <Body variant={variant} count={count} />
        </div>
    );
}
