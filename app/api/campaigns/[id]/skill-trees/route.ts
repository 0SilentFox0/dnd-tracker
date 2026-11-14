import { NextResponse } from 'next/server';

import { operationRoute } from '@/lib/server/content/content-routes';
import { CONTENT_OPERATIONS } from '@/lib/server/content/operations';
import { listSkillTrees } from '@/lib/server/skills/skill-tree-service';

export const GET = operationRoute(
    CONTENT_OPERATIONS['skill-trees.list'],
    async ({ actor }) => NextResponse.json(await listSkillTrees(actor))
);
