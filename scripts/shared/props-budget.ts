import fs from 'node:fs';
import path from 'node:path';

import {
    collectPropsCounts,
    overBudget,
} from '@/lib/__tests__/helpers/props-budget';

export const PROPS_BUDGET_FILE = 'ratchets/props-budget-exempt.json';

if (process.argv.includes('--write')) {
    const sorted = Object.fromEntries(
        Object.entries(overBudget(collectPropsCounts())).sort(([a], [b]) =>
            a.localeCompare(b)
        )
    );

    fs.writeFileSync(
        path.resolve(__dirname, '../..', PROPS_BUDGET_FILE),
        `${JSON.stringify(sorted, null, 4)}\n`
    );
    console.log(`${Object.keys(sorted).length} entries written`);
}
