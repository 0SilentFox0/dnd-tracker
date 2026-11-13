import {
    mkdirSync,
    readFileSync,
    renameSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';

import { isRecord } from '@/lib/utils/common/is-record';
import type { StateSnapshot } from '@/scripts/db/lib/battle-state-plan';

export function readSnapshotFile(file: string): StateSnapshot {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));

    if (
        !isRecord(parsed) ||
        parsed.version !== 1 ||
        !Array.isArray(parsed.scenes) ||
        !Array.isArray(parsed.participants) ||
        !Array.isArray(parsed.history)
    )
        throw new Error(`${file}: невірний формат знімка`);

    return parsed as unknown as StateSnapshot;
}

/** the audit file appears under its final name only after the transaction has committed */
export async function withSnapshotFile<B>(
    file: string,
    toJson: (body: B) => unknown,
    apply: (write: (body: B) => void) => Promise<B>
): Promise<B> {
    const pending = `${file}.pending`;

    try {
        const body = await apply((b) => {
            mkdirSync(dirname(file), { recursive: true });
            writeFileSync(pending, JSON.stringify(toJson(b), null, 2));
        });

        renameSync(pending, file);

        return body;
    } catch (error) {
        rmSync(pending, { force: true });

        throw error;
    }
}
