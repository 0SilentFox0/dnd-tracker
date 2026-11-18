import { NextResponse } from 'next/server';

import type { saveSkillTreeSchema } from '@/lib/schemas/skills';
import { operationRoute } from '@/lib/server/content/content-routes';
import {
    moduleContentOperation,
    runModuleContentOperation,
} from '@/lib/server/content/module-operations';
import type { ContentOperation } from '@/lib/server/content/operations';

export const PATCH = operationRoute(
    moduleContentOperation('skill-trees.save') as ContentOperation & {
        body: typeof saveSkillTreeSchema;
    },
    async ({ actor, params, body }) => {
        const saved = (await runModuleContentOperation(
            'skill-trees.save',
            actor,
            { treeId: params.treeId, body }
        )) as { id: string; race: string; skills: unknown };

        return NextResponse.json({
            id: saved.id,
            race: saved.race,
            skills: saved.skills,
        });
    }
);
