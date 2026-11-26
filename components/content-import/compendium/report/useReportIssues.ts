import { useMemo } from 'react';

import { useTranslator } from '@/lib/i18n/use-translator';
import {
    groupIssues,
    splitInfoIssues,
} from '@/lib/utils/compendium-import/labels';
import type { CompendiumReport as Report } from '@/types/compendium-import';

export function useReportIssues(report: Report) {
    const t = useTranslator('compendium');

    return useMemo(() => {
        const { actions, info } = splitInfoIssues(report.nextActions);

        return {
            info,
            blockers: groupIssues(
                t,
                actions.filter((issue) => issue.severity === 'error')
            ),
            groups: groupIssues(
                t,
                actions.filter((issue) => issue.severity !== 'error')
            ),
        };
    }, [t, report.nextActions]);
}
