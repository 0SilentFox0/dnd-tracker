'use client';

import { useTranslations } from 'next-intl';

import { ResultStep } from './ResultStep';

import { LoadingState } from '@/components/common/states/LoadingState';
import type { CopyResult } from '@/types/content-copy';

export function PreviewStep({
    result,
    pending,
    error,
}: {
    result?: CopyResult;
    pending: boolean;
    error?: string;
}) {
    const t = useTranslations('contentCopy.preview');

    if (pending) return <LoadingState />;

    if (error)
        return (
            <p role="alert" className="text-sm text-red-400">
                {error}
            </p>
        );

    if (!result) return null;

    return (
        <div className="space-y-3">
            <p className="text-sm text-hud-muted">{t('intro')}</p>
            <ResultStep result={result} dryRun />
        </div>
    );
}
