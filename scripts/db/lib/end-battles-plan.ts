export interface EndBattlesArgs {
    apply: boolean;
    allowRemote: boolean;
    sceneIds: string[];
    campaigns: string[];
}

export interface ActiveSceneRow {
    id: string;
    name: string;
    status: string;
    round: number;
    turnIndex: number;
    version: number;
    eventSeq: number;
    campaignId: string;
    campaignName: string;
    dmUserId: string;
    participants: number;
    pending: number;
}

export type SceneOutcome =
    | { id: string; ok: true }
    | { id: string; ok: false; error: string };

const split = (v: string) =>
    v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

export function parseArgs(argv: string[]): EndBattlesArgs {
    const args: EndBattlesArgs = {
        apply: false,
        allowRemote: false,
        sceneIds: [],
        campaigns: [],
    };

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];

        if (a === '--apply') args.apply = true;
        else if (a === '--allow-remote') args.allowRemote = true;
        else if (a === '--scene' || a === '--campaign') {
            const value = argv[++i];

            if (!value || value.startsWith('--'))
                throw new Error(`${a} потребує значення`);

            (a === '--scene' ? args.sceneIds : args.campaigns).push(
                ...split(value)
            );
        } else throw new Error(`Невідомий аргумент: ${a}`);
    }

    return args;
}

/** `--scene` filters by id, `--campaign` by id or exact name; both given means both must match. */
export function selectScenes(
    rows: ActiveSceneRow[],
    args: Pick<EndBattlesArgs, 'sceneIds' | 'campaigns'>
): ActiveSceneRow[] {
    return rows.filter(
        (r) =>
            r.status === 'active' &&
            (args.sceneIds.length === 0 || args.sceneIds.includes(r.id)) &&
            (args.campaigns.length === 0 ||
                args.campaigns.includes(r.campaignId) ||
                args.campaigns.includes(r.campaignName))
    );
}

export function missingSceneIds(
    rows: ActiveSceneRow[],
    args: Pick<EndBattlesArgs, 'sceneIds'>
): string[] {
    const found = new Set(rows.map((r) => r.id));

    return args.sceneIds.filter((id) => !found.has(id));
}

export function formatScene(r: ActiveSceneRow): string {
    return [
        `сцена ${r.id} «${r.name}»`,
        `кампанія ${r.campaignId} «${r.campaignName}»`,
        `раунд ${r.round}, хід #${r.turnIndex}`,
        `учасників ${r.participants}${r.pending ? ` (+${r.pending} у резерві)` : ''}`,
        `v${r.version}, eventSeq ${r.eventSeq}`,
        `${r.status} -> completed`,
    ].join(' · ');
}

export function summarize(outcomes: SceneOutcome[]): string {
    const failed = outcomes.filter((o) => !o.ok);

    return `завершено ${outcomes.length - failed.length} з ${outcomes.length}${
        failed.length
            ? `; помилки: ${failed.map((f) => `${f.id} (${f.ok ? '' : f.error})`).join(', ')}`
            : ''
    }`;
}

/** One scene at a time; a failing scene never blocks the rest. */
export async function endScenes(
    scenes: ActiveSceneRow[],
    end: (scene: ActiveSceneRow) => Promise<void>
): Promise<SceneOutcome[]> {
    const outcomes: SceneOutcome[] = [];

    for (const scene of scenes) {
        try {
            await end(scene);

            outcomes.push({ id: scene.id, ok: true });
        } catch (e) {
            outcomes.push({
                id: scene.id,
                ok: false,
                error: e instanceof Error ? e.message : String(e),
            });
        }
    }

    return outcomes;
}

export function snapshotFileName(host: string, now: Date): string {
    return `${host}-${now.toISOString().replace(/:/g, '-')}.json`;
}
