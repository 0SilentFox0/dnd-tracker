import { BATTLE_MUSIC_BUCKET } from '@/lib/constants/music';
import { USER_AVATARS_BUCKET } from '@/lib/constants/profile';
import { SCENE_SLIDES_BUCKET } from '@/lib/constants/show';
import { SOUNDBOARD_BUCKET } from '@/lib/constants/soundboard';
import { WORLD_MAPS_BUCKET } from '@/lib/constants/world';
import { createAdminClient } from '@/lib/supabase/admin';
import { AVATARS_BUCKET } from '@/lib/supabase/avatar-storage';
import { BATTLE_MAPS_BUCKET } from '@/lib/supabase/battle-map-storage';

export type StoragePlan = { bucket: string; paths: string[] }[];

// Owner-prefixed buckets only. Icon buckets are immutable and compendium-media is
// hash-addressed and shared between campaigns, so neither is ever touched.
const USER_BUCKETS = [USER_AVATARS_BUCKET, SOUNDBOARD_BUCKET];

const CAMPAIGN_BUCKETS = [
    AVATARS_BUCKET,
    BATTLE_MAPS_BUCKET,
    BATTLE_MUSIC_BUCKET,
    SCENE_SLIDES_BUCKET,
    WORLD_MAPS_BUCKET,
];

const PAGE = 1000;

type Storage = ReturnType<
    ReturnType<typeof createAdminClient>['storage']['from']
>;

async function listFiles(storage: Storage, prefix: string): Promise<string[]> {
    const files: string[] = [];

    for (let offset = 0; ; offset += PAGE) {
        const { data, error } = await storage.list(prefix, {
            limit: PAGE,
            offset,
        });

        if (error) throw error;

        for (const entry of data ?? []) {
            const path = `${prefix}/${entry.name}`;

            // folders come back without an id
            if (entry.id === null)
                files.push(...(await listFiles(storage, path)));
            else files.push(path);
        }

        if ((data?.length ?? 0) < PAGE) return files;
    }
}

export async function planUserStorage(
    userId: string,
    campaignIds: string[]
): Promise<StoragePlan> {
    const admin = createAdminClient();

    const targets = [
        ...USER_BUCKETS.map((bucket) => ({ bucket, owners: [userId] })),
        ...CAMPAIGN_BUCKETS.map((bucket) => ({ bucket, owners: campaignIds })),
    ];

    const plan: StoragePlan = [];

    for (const { bucket, owners } of targets) {
        const storage = admin.storage.from(bucket);

        const paths: string[] = [];

        for (const owner of owners)
            paths.push(...(await listFiles(storage, owner)));

        if (paths.length) plan.push({ bucket, paths });
    }

    return plan;
}

const REMOVE_CHUNK = 100;

export async function removeStoragePlan(plan: StoragePlan): Promise<void> {
    const admin = createAdminClient();

    for (const { bucket, paths } of plan)
        for (let i = 0; i < paths.length; i += REMOVE_CHUNK) {
            const { error } = await admin.storage
                .from(bucket)
                .remove(paths.slice(i, i + REMOVE_CHUNK));

            if (error) throw error;
        }
}
