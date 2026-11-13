import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

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
