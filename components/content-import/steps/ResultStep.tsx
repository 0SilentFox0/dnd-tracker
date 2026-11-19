'use client';

import { ErrorReportButton } from '../shared/ErrorReportButton';
import { ImportCounts } from '../shared/ImportCounts';

import type { ContentImportState } from '@/lib/hooks/content-import';

export function ResultStep({ wizard }: { wizard: ContentImportState }) {
    const report = wizard.result;

    if (!report) return null;

    return (
        <div className="space-y-3">
            <ImportCounts report={report} />
            {wizard.status.error && (
                <p role="alert" className="text-sm text-red-400">
                    {wizard.status.error}
                </p>
            )}
            <ErrorReportButton wizard={wizard} report={report} />
        </div>
    );
}
