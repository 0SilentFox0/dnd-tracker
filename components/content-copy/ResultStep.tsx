'use client';

import { useTranslations } from 'next-intl';

import type { CopyResult, CopyTargetReport } from '@/types/content-copy';

const REASON_KEYS = [
    'exists',
    'kind-unsupported',
    'duplicate-name',
    'not-found',
    'unknown-kind',
    'limit',
    'file-failed',
    'error',
] as const;

const isReasonKey = (value: string): value is (typeof REASON_KEYS)[number] =>
    (REASON_KEYS as readonly string[]).includes(value);

const STATUS_TONE = {
    ok: 'text-emerald-400',
    partial: 'text-amber-400',
    failed: 'text-red-400',
} as const;

function TargetReport({
    report,
    dryRun,
}: {
    report: CopyTargetReport;
    dryRun: boolean;
}) {
    const t = useTranslations('contentCopy.report');

    const nothingToCopy =
        report.status === 'ok' &&
        !report.error &&
        report.created.length === 0 &&
        report.skipped.length > 0;

    const reasonLabel = (reason: string) =>
        isReasonKey(reason) ? t(`reasons.${reason}`) : t('reasons.unknown');

    return (
        <li className="space-y-1 rounded border border-hud-line/40 p-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{report.name}</span>
                {!dryRun && (
                    <span
                        className={
                            nothingToCopy
                                ? 'text-hud-muted'
                                : STATUS_TONE[report.status]
                        }
                    >
                        {t(
                            `status.${nothingToCopy ? 'nothing' : report.status}`
                        )}
                    </span>
                )}
            </div>
            {report.error ? (
                <p role="alert" className="text-red-400">
                    {report.error}
                </p>
            ) : (
                <p className="text-hud-muted">
                    {t(dryRun ? 'summaryPreview' : 'summaryResult', {
                        created: report.created.length,
                        reused: report.reused.length,
                        skipped: report.skipped.length,
                    })}
                </p>
            )}
            {report.skipped.length > 0 && (
                <ul className="list-disc pl-5 text-xs text-hud-muted">
                    {report.skipped.map((s, i) => (
                        <li key={`${s.kind}-${s.name}-${i}`}>
                            {s.name}: {reasonLabel(s.reason)}
                        </li>
                    ))}
                </ul>
            )}
            {report.warnings.length > 0 && (
                <p className="text-xs text-amber-400">
                    {t('warnings', { count: report.warnings.length })}
                </p>
            )}
        </li>
    );
}

export function ResultStep({
    result,
    dryRun = false,
}: {
    result: CopyResult;
    dryRun?: boolean;
}) {
    return (
        <ul className="space-y-2">
            {result.targets.map((report) => (
                <TargetReport
                    key={report.campaignId}
                    report={report}
                    dryRun={dryRun}
                />
            ))}
        </ul>
    );
}
