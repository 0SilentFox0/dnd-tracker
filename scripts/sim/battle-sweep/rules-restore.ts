import fs from 'node:fs';
import path from 'node:path';

export const RESTORE_DIR = path.resolve(
    __dirname,
    '../../../.superpowers/sweep-restore'
);

export interface RestoreEntry {
    campaignId: string;
    db: string;
    raw: unknown;
}

export const dbIdentity = (url = process.env.DATABASE_URL): string => {
    try {
        const { host, pathname } = new URL(url ?? '');

        return `${host}${pathname}`;
    } catch {
        return 'unknown';
    }
};

const fileOf = (dir: string, db: string, campaignId: string) =>
    path.join(dir, `${encodeURIComponent(db)}__${campaignId}.json`);

export function saveRestoreFile(
    campaignId: string,
    raw: unknown,
    db = dbIdentity(),
    dir = RESTORE_DIR
): string {
    fs.mkdirSync(dir, { recursive: true });

    const file = fileOf(dir, db, campaignId);

    if (!fs.existsSync(file))
        fs.writeFileSync(
            file,
            JSON.stringify({
                campaignId,
                db,
                raw: raw ?? null,
            } satisfies RestoreEntry)
        );

    return file;
}

export function dropRestoreFile(
    campaignId: string,
    db = dbIdentity(),
    dir = RESTORE_DIR
): void {
    fs.rmSync(fileOf(dir, db, campaignId), { force: true });
}

/** applies and deletes the leftover files of this DB; a file whose apply throws stays for the next start */
export async function recoverRules(
    apply: (entry: RestoreEntry) => Promise<void>,
    db = dbIdentity(),
    dir = RESTORE_DIR
): Promise<string[]> {
    if (!fs.existsSync(dir)) return [];

    const restored: string[] = [];

    for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.json'))) {
        const file = path.join(dir, name);

        const entry = JSON.parse(
            fs.readFileSync(file, 'utf8')
        ) as Partial<RestoreEntry>;

        if (entry.db === undefined) {
            console.warn(
                `sweep restore: skipping legacy file without db: ${name}`
            );
            continue;
        }

        if (entry.db !== db) continue;

        await apply(entry as RestoreEntry);
        fs.rmSync(file, { force: true });
        restored.push(entry.campaignId as string);
    }

    return restored;
}

export function keptRunNotice(
    campaign: { id: string; templateKey?: string | null },
    heroIds: string[],
    importedTemplate: boolean
): string {
    const ids = heroIds.map((id) => `'${id}'`).join(',') || "''";

    return [
        `--keep-battles: template run kept (campaign ${campaign.id}, template ${campaign.templateKey ?? '-'})`,
        `manual cleanup: DELETE FROM battle_scenes WHERE "campaignId" = '${campaign.id}' AND name LIKE 'ТЕСТ%'; DELETE FROM characters WHERE id IN (${ids});`,
        importedTemplate
            ? 'the template campaign was imported by this run: delete it and its sweep-* user after inspection'
            : 'the next sweep start restores the original rules of this campaign',
    ].join('\n');
}
