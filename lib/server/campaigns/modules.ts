import type { Prisma } from '@prisma/client';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { BattleStatus } from '@/lib/constants/battle';
import { ContentError } from '@/lib/server/content/errors';
import { systemIssues } from '@/lib/utils/rules/section-registry';
import {
    type CompositionIssue,
    moduleChange,
    type SystemSelection,
} from '@/lib/utils/rules/systems/catalog';

const MODULES_PATH = ['system', 'modules'];

export const compositionApiIssues = (issues: CompositionIssue[]) =>
    issues.map((i) => ({
        code: 'custom',
        path: MODULES_PATH,
        message: `rules.validation.composition.${i.code}`,
        params: { module: i.module ?? '', detail: i.detail ?? '' },
    }));

export function assertValidSystem(system: SystemSelection): void {
    const issues = systemIssues(system);

    if (issues.length > 0)
        throw new ContentError(
            API_ERRORS.SYSTEM_MODULES_INVALID,
            422,
            compositionApiIssues(issues)
        );
}

export async function assertModuleChange(
    db: Pick<Prisma.TransactionClient, 'battleScene' | 'character'>,
    campaignId: string,
    current: SystemSelection,
    next: SystemSelection,
    confirm: boolean
): Promise<void> {
    const { changed, setup } = moduleChange(current, next);

    if (!changed) return;

    const active = await db.battleScene.count({
        where: { campaignId, status: BattleStatus.ACTIVE },
    });

    if (active > 0)
        throw new ContentError(API_ERRORS.SYSTEM_MODULES_IN_BATTLE, 409);

    if (setup.length === 0 || confirm) return;

    if ((await db.character.count({ where: { campaignId } })) === 0) return;

    throw new ContentError(
        API_ERRORS.SYSTEM_MODULE_CONFIRM,
        409,
        setup.map((id) => ({
            path: MODULES_PATH,
            message: 'rules.validation.moduleNeedsConfirm',
            params: { module: id },
        }))
    );
}
