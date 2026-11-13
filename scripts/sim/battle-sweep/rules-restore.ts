import fs from 'node:fs';
import path from 'node:path';

export const RESTORE_DIR = path.resolve(
    __dirname,
    '../../../.superpowers/sweep-restore'
);

export interface RestoreEntry {
    campaignId: string;
    raw: unknown;
}

const fileOf = (dir: string, campaignId: string) =>
    path.join(dir, `${campaignId}.json`);

export function saveRestoreFile(
    campaignId: string,
    raw: unknown,
    dir = RESTORE_DIR
): string {
    fs.mkdirSync(dir, { recursive: true });

    const file = fileOf(dir, campaignId);

    if (!fs.existsSync(file))
        fs.writeFileSync(
            file,
            JSON.stringify({
                campaignId,
                raw: raw ?? null,
            } satisfies RestoreEntry)
        );

    return file;
}

export function dropRestoreFile(campaignId: string, dir = RESTORE_DIR): void {
    fs.rmSync(fileOf(dir, campaignId), { force: true });
}

/** applies and deletes every leftover file; a file whose apply throws stays for the next start */
export async function recoverRules(
    apply: (entry: RestoreEntry) => Promise<void>,
    dir = RESTORE_DIR
): Promise<string[]> {
    if (!fs.existsSync(dir)) return [];

    const restored: string[] = [];

    for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.json'))) {
        const file = path.join(dir, name);

        const entry = JSON.parse(fs.readFileSync(file, 'utf8')) as RestoreEntry;

        await apply(entry);
        fs.rmSync(file, { force: true });
        restored.push(entry.campaignId);
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
