'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { type CopySelection, PickStep } from './PickStep';
import { PreviewStep } from './PreviewStep';
import { ResultStep } from './ResultStep';

import { LoadingState } from '@/components/common/states/LoadingState';
import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import type { ContentKind } from '@/lib/constants/content-kinds';
import {
    useContentCopy,
    useContentCopyOptions,
} from '@/lib/hooks/content-copy';
import type { CopyRequest } from '@/types/content-copy';

type Step = 'pick' | 'preview' | 'result';

interface ContentCopyDialogProps {
    campaignId: string;
    kind: ContentKind;
    initialIds?: string[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ContentCopyDialog({
    campaignId,
    kind,
    initialIds = [],
    open,
    onOpenChange,
}: ContentCopyDialogProps) {
    const t = useTranslations('contentCopy');

    const tc = useTranslations('common.actions');

    const options = useContentCopyOptions(campaignId, kind, open);

    const { preview, run } = useContentCopy(campaignId);

    const [step, setStep] = useState<Step>('pick');

    const [selection, setSelection] = useState<CopySelection>({
        itemIds: initialIds,
        campaignIds: [],
        all: false,
    });

    const canNext =
        selection.itemIds.length > 0 &&
        (selection.all || selection.campaignIds.length > 0);

    const body: Omit<CopyRequest, 'dryRun'> = {
        items: [{ kind, ids: selection.itemIds }],
        targets: selection.all
            ? { all: true }
            : { campaignIds: selection.campaignIds },
    };

    const close = (next: boolean) => {
        if (!next) {
            preview.reset();
            run.reset();
            setStep('pick');
        }

        onOpenChange(next);
    };

    const goPreview = () => {
        setStep('preview');
        preview.mutate(body);
    };

    const goRun = () => {
        setStep('result');
        run.mutate(body);
    };

    const footer = {
        pick: (
            <>
                <Button variant="outline" onClick={() => close(false)}>
                    {tc('cancel')}
                </Button>
                <Button onClick={goPreview} disabled={!canNext}>
                    {t('actions.next')}
                </Button>
            </>
        ),
        preview: (
            <>
                <Button
                    variant="outline"
                    onClick={() => setStep('pick')}
                    disabled={preview.isPending}
                >
                    {tc('back')}
                </Button>
                <Button
                    onClick={goRun}
                    disabled={preview.isPending || !preview.data}
                >
                    {t('actions.copy')}
                </Button>
            </>
        ),
        result: (
            <Button onClick={() => close(false)} disabled={run.isPending}>
                {t('actions.done')}
            </Button>
        ),
    }[step];

    return (
        <ResponsiveDialog
            hud
            size="lg"
            open={open}
            onOpenChange={close}
            title={t('title')}
            description={t(`steps.${step}`)}
            footer={footer}
        >
            {step === 'pick' &&
                (options.data ? (
                    <PickStep
                        items={options.data.items}
                        campaigns={options.data.campaigns}
                        selection={selection}
                        onChange={setSelection}
                    />
                ) : (
                    <LoadingState />
                ))}
            {step === 'preview' && (
                <PreviewStep
                    result={preview.data}
                    pending={preview.isPending}
                    error={preview.error?.message}
                />
            )}
            {step === 'result' &&
                (run.data ? (
                    <ResultStep result={run.data} />
                ) : run.error ? (
                    <p role="alert" className="text-sm text-red-400">
                        {run.error.message}
                    </p>
                ) : (
                    <LoadingState />
                ))}
        </ResponsiveDialog>
    );
}
