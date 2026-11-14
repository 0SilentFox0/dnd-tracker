import { NextResponse } from 'next/server';

import { operationRoute } from '@/lib/server/content/content-routes';
import { CONTENT_OPERATIONS } from '@/lib/server/content/operations';
import { saveSkillTree } from '@/lib/server/skills/skill-tree-service';

export const PATCH = operationRoute(
    CONTENT_OPERATIONS['skill-trees.save'],
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
