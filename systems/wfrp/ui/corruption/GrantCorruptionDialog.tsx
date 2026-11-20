'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { GrantSummaryView } from './GrantSummaryView';

import { UndoableResultDialog } from '@/components/common/dialogs/UndoableResultDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/ui/select-field';
import { SwitchField } from '@/components/ui/switch-field';
import { useCampaignRules } from '@/lib/hooks/campaigns';
import { useGrantCorruption, useUndoCorruption } from '@/systems/wfrp/hooks';
import {
    EXPOSURE_DEGREES,
    EXPOSURE_SKILLS,
    type ExposureDegree,
    type ExposureSkill,
    GRANT_MAX as CORRUPTION_GRANT_MAX,
    REASON_MAX as CORRUPTION_REASON_MAX,
} from '@/systems/wfrp/rules/corruption/constants';
import { editionOf } from '@/systems/wfrp/rules/edition';

export function GrantCorruptionDialog({
    campaignId,
    characterId,
    name,
}: {
    campaignId: string;
    characterId: string;
    name?: string;
}) {
    const t = useTranslations('wfrpCorruption.grant');

    const grant = useGrantCorruption(campaignId, characterId);

    const undo = useUndoCorruption(campaignId, characterId);

    const rules = useCampaignRules(campaignId);

    const rulesLoading = rules.isPending;

    const canExposure = editionOf(rules.data).magicModel === 'canon5e';

    const [manual, setManual] = useState(false);

    const exposureMode = canExposure && !manual;

    const [degree, setDegree] = useState<ExposureDegree>('minor');

    const [skill, setSkill] = useState<ExposureSkill>('endurance');

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

    const valid = (exposureMode || pointsValid) && reason.trim() !== '';

    const reset = () => {
        setGranted(false);
        setUndone(false);
        setPoints('1');
        setDegree('minor');
        setSkill('endurance');
        setManual(false);
        setReason('');
        setAttempted(false);
    };

    const submit = () => {
        if (!valid) {
            setAttempted(true);

            return;
        }

        const body = exposureMode
            ? { exposure: { degree, skill }, reason: reason.trim() }
            : { points: n, reason: reason.trim() };

        void grant.mutateOk(body).then((ok) => {
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
            result={
                result && (
                    <GrantSummaryView summary={result.summary} name={name} />
                )
            }
            submit={{
                onClick: submit,
                disabled: grant.isPending || rulesLoading,
            }}
            undo={{
                pending: undo.isPending,
                hidden: !!result && !result.grantId,
                done: undone,
                onConfirm: async () => {
                    if (
                        result?.grantId &&
                        (await undo.mutateOk({ grantId: result.grantId }))
                    )
                        setUndone(true);
                },
            }}
            onClosed={reset}
        >
            {canExposure && (
                <SwitchField
                    id="corruption-manual"
                    label={t('manual')}
                    checked={manual}
                    onCheckedChange={setManual}
                />
            )}
            {exposureMode && (
                <>
                    <div className="space-y-1 text-sm">
                        <Label htmlFor="corruption-degree">{t('degree')}</Label>
                        <SelectField
                            id="corruption-degree"
                            value={degree}
                            onValueChange={(v) =>
                                setDegree(v as ExposureDegree)
                            }
                            options={EXPOSURE_DEGREES.map((k) => ({
                                value: k,
                                label: t(`degrees.${k}`),
                            }))}
                            triggerClassName="w-full"
                        />
                    </div>
                    <div className="space-y-1 text-sm">
                        <Label htmlFor="corruption-skill">{t('skill')}</Label>
                        <SelectField
                            id="corruption-skill"
                            value={skill}
                            onValueChange={(v) => setSkill(v as ExposureSkill)}
                            options={EXPOSURE_SKILLS.map((k) => ({
                                value: k,
                                label: t(`skills.${k}`),
                            }))}
                            triggerClassName="w-full"
                        />
                    </div>
                </>
            )}
            {!exposureMode && !rulesLoading && (
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
            )}
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
