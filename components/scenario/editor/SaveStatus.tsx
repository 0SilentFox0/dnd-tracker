'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import type { DraftError, DraftState } from '@/lib/hooks/scenario';

export function SaveStatus({
    state,
    error,
    onRetry,
    onReload,
    onRetain,
}: {
    state: DraftState;
    error?: DraftError | null;
    onRetry: () => void;
    onReload: () => void;
    onRetain?: () => void;
}) {
    const t = useTranslations('scenario.save');

    return (
        <span
            className="sans"
            role="status"
            aria-live="polite"
            style={{
                color:
                    state === 'error' || state === 'conflict'
                        ? 'var(--blood)'
                        : 'var(--ink-soft)',
            }}
        >
            {state === 'error' && error ? error.message : t(state)}
            {state === 'error' && error?.retryable !== false && (
                <Button
                    variant="plain"
                    size="auto"
                    type="button"
                    className="toggle"
                    style={{ marginLeft: 8 }}
                    onClick={onRetry}
                >
                    {t('retry')}
                </Button>
            )}
            {state === 'conflict' && (
                <>
                    <span>
                        {' '}
                        {t('conflictNote')} {error?.message}
                    </span>
                    <Button
                        variant="plain"
                        size="auto"
                        type="button"
                        className="toggle"
                        style={{ marginLeft: 8 }}
                        onClick={onReload}
                    >
                        {t('discard')}
                    </Button>
                    {onRetain && (
                        <Button
                            variant="plain"
                            size="auto"
                            type="button"
                            className="toggle"
                            onClick={onRetain}
                        >
                            {t('keepLocal')}
                        </Button>
                    )}
                </>
            )}
        </span>
    );
}
