// pnpm ratchet:ui-scale [--write]: ratchets/ui-scale-exempt.json = { file: count } of off-scale font/radius/button-height/disabled-opacity/css-small-font hits (only shrinks)
import fs from 'node:fs';
import path from 'node:path';

import { collectUiScale } from '@/lib/__tests__/helpers/ui-scale';

export const UI_SCALE_FILE = 'ratchets/ui-scale-exempt.json';

if (process.argv.includes('--write')) {
    const counts = collectUiScale();

    const sorted = Object.fromEntries(
        Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))
    );

    fs.writeFileSync(
        path.resolve(__dirname, '../..', UI_SCALE_FILE),
        `${JSON.stringify(sorted, null, 4)}\n`
    );
    console.log(
        `${Object.keys(sorted).length} files, total ${Object.values(sorted).reduce((a, b) => a + b, 0)}`
    );
}
