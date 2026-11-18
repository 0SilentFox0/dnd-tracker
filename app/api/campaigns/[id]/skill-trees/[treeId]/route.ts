import { NextResponse } from 'next/server';

import { saveSkillTreeSchema } from '@/lib/schemas/skills';
import { operationRoute } from '@/lib/server/content/content-routes';
import { moduleContentOperation } from '@/lib/server/content/module-operations';
import type { ContentOperation } from '@/lib/server/content/operations';
import { saveSkillTree } from '@/lib/server/skills/skill-tree-service';

export const PATCH = operationRoute(
    moduleContentOperation('skill-trees.save') as ContentOperation & {
        body: typeof saveSkillTreeSchema;
    },
    async ({ actor, params, body }) => {
        const saved = await saveSkillTree(actor, {
            treeId: params.treeId,
            race: body.race,
            skills: body.skills,
        });

        return NextResponse.json({
            id: saved.id,
            race: saved.race,
            skills: saved.skills,
        });
    }
);
