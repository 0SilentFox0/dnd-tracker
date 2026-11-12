import type { Career } from '@prisma/client';

import {
    careerTierKey,
    type CareerTierPart,
} from '@/lib/constants/import-aliases';
import { toCareerData } from '@/lib/utils/careers/row';
import type { ImportRecord } from '@/types/content-import';

export function careerToImportRecord(row: Career): ImportRecord {
    const { id, name, icon, class: careerClass, tiers } = toCareerData(row);

    const record: ImportRecord = { id, name, icon, class: careerClass };

    tiers.forEach((tier, i) => {
        for (const part of [
            'name',
            'status',
            'characteristics',
            'skills',
            'talents',
            'trappings',
        ] as const satisfies readonly CareerTierPart[])
            record[careerTierKey(i + 1, part)] = tier[part];
    });

    return record;
}
