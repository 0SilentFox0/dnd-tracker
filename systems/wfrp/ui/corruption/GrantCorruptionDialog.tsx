'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { GrantSummaryView } from './GrantSummaryView';

import { UndoableResultDialog } from '@/components/common/dialogs/UndoableResultDialog';
import { Input } from '@/components/ui/input';
import { useGrantCorruption, useUndoCorruption } from '@/systems/wfrp/hooks';
import {
    GRANT_MAX as CORRUPTION_GRANT_MAX,
    REASON_MAX as CORRUPTION_REASON_MAX,
} from '@/systems/wfrp/rules/corruption/constants';

export function GrantCorruptionDialog({
    campaignId,
    characterId,
}: {
    campaignId: string;
    characterId: string;
}) {
    const t = useTranslations('wfrpCorruption.grant');

    const grant = useGrantCorruption(campaignId, characterId);

    const undo = useUndoCorruption(campaignId, characterId);

    const [points, setPoints] = useState('1');

    const [reason, setReason] = useState('');

    const [attempted, setAttempted] = useState(false);

    const [granted, setGranted] = useState(false);

    const result = granted ? (grant.data ?? null) : null;

    const [undone, setUndone] = useState(false);

    const max = CORRUPTION_GRANT_MAX;

    const n = Number(points);

    const pointsValid =
        points.trim() !== '' && Number.isInteger(n) && n >= 1 && n <= max;

    const valid = pointsValid && reason.trim() !== '';

    const reset = () => {
        setGranted(false);
        setUndone(false);
        setPoints('1');
        setReason('');
        setAttempted(false);
    };

    const submit = () => {
        if (!valid) {
            setAttempted(true);

            return;
        }

        void grant.mutateOk({ points: n, reason: reason.trim() }).then((ok) => {
            if (ok) {
                setGranted(true);
                setUndone(false);
            }
        });
    };

    return (
        <UndoableResultDialog
            labels={{
                button: t('button'),
                title: t('title'),
                submit: t('submit'),
                result: t('result'),
                undo: t('undo'),
                undone: t('undone'),
                undoConfirm: t('undoConfirm'),
            }}
            result={result && <GrantSummaryView summary={result.summary} />}
            submit={{ onClick: submit, disabled: grant.isPending }}
            undo={{
                pending: undo.isPending,
                done: undone,
                onConfirm: async () => {
                    if (
                        result &&
                        (await undo.mutateOk({ grantId: result.grantId }))
                    )
                        setUndone(true);
                },
            }}
            onClosed={reset}
        >
            <label className="block text-sm">
                {t('points')}
                <Input
                    className="mt-1 min-h-11"
                    type="number"
                    min={1}
                    max={max}
                    inputMode="numeric"
                    aria-invalid={
                        (attempted || points.trim() !== '') && !pointsValid
                    }
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                />
                <span
                    className={
                        attempted && !pointsValid
                            ? 'text-xs text-destructive'
                            : 'text-xs text-hud-muted'
                    }
                >
                    {t('pointsHint', { max })}
                </span>
            </label>
            <label className="block text-sm">
                {t('reason')}
                <Input
                    className="mt-1 min-h-11"
                    maxLength={CORRUPTION_REASON_MAX}
                    aria-invalid={attempted && reason.trim() === ''}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                />
                {attempted && reason.trim() === '' && (
                    <span className="text-xs text-destructive">
                        {t('reasonRequired')}
                    </span>
                )}
            </label>
        </UndoableResultDialog>
    );
}
