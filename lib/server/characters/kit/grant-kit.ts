import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import 'server-only';
import { STASH_ROW_SELECT } from '@/lib/server/characters/core/read-stash';
import {
    loadStashState,
    purseColumns,
} from '@/lib/server/characters/core/stash-state';
import { writeInventoryLog } from '@/lib/server/inventory/log';
import { toInputJson } from '@/lib/utils/common/json';
import {
    applyStashAction,
    type StashAction,
    type StashCtx,
} from '@/lib/utils/inventory/stash-actions';
import { planGrant } from '@/lib/utils/items/grant';
import type { StartingKit } from '@/types/choices';

const EQUIP_SLOTS = ['weapon', 'range_weapon', 'armor', 'shield'] as const;

const KIT_NOTE = 'starting equipment';

const readable = (slug: string) =>
    slug.replace(/^[^_]*_/, '').replace(/-/g, ' ');

/** Gear is granted once per artifact (the stash holds one ref each); quantities live in the package text. */
export async function grantStartingKit(
    tx: Prisma.TransactionClient,
    ctx: {
        campaignId: string;
        characterId: string;
        actorUserId: string;
        classesEnabled: boolean;
    },
    kit: StartingKit
): Promise<{ skipped: string[] }> {
    const { campaignId, characterId, actorUserId, classesEnabled } = ctx;

    const slugs = kit.items.map((i) => i.artifact);

    const rows =
        slugs.length > 0
            ? await tx.artifact.findMany({
                  where: { campaignId, slug: { in: slugs } },
                  select: { ...STASH_ROW_SELECT, slug: true },
              })
            : [];

    const bySlug = new Map(rows.flatMap((r) => (r.slug ? [[r.slug, r]] : [])));

    let state = await loadStashState(tx, characterId);

    const logs: {
        kind: string;
        delta: Record<string, unknown>;
        note: string | null;
    }[] = [];

    const apply = (action: StashAction, context: Partial<StashCtx> = {}) => {
        const result = applyStashAction(state, action, {
            newItemId: randomUUID(),
            ...context,
        });

        if (!result.ok) return false;

        state = result.state;
        logs.push(result.log);

        return true;
    };

    const skipped: string[] = [];

    const granted: (typeof rows)[number][] = [];

    for (const { artifact, quantity } of kit.items) {
        const row = bySlug.get(artifact);

        const planned = row
            ? planGrant(
                  { artifactId: row.id, quantity },
                  new Map([[row.id, row]])
              )
            : null;

        if (
            !row ||
            !planned?.ok ||
            !apply(
                { action: 'grant', artifactId: row.id, quantity },
                { grant: planned.plan }
            )
        ) {
            skipped.push(readable(artifact));
            continue;
        }

        if (planned.plan.kind === 'stash') granted.push(row);
    }

    for (const slot of EQUIP_SLOTS) {
        const row = granted.find((r) => r.slot === slot);

        if (row)
            apply(
                { action: 'equip', artifactId: row.id },
                { artifact: row, artifactSlotType: row.slot, classesEnabled }
            );
    }

    if (kit.gp > 0)
        apply({ action: 'gain', amount: kit.gp, coin: 'gp', note: KIT_NOTE });

    if (logs.length === 0) return { skipped };

    await tx.characterInventory.update({
        where: { characterId },
        data: {
            equipped: state.equipped,
            stash: state.stash,
            items: toInputJson(state.items),
            ...purseColumns(state.purse),
            attuned: state.attuned ?? [],
        },
    });

    await writeInventoryLog(
        tx,
        logs.map((l) => ({
            campaignId,
            characterId,
            actorUserId,
            ...l,
            note: l.note ?? KIT_NOTE,
        }))
    );

    return { skipped };
}
