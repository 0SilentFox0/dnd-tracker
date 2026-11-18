import { NextResponse } from 'next/server';

import { operationRoute } from '@/lib/server/content/content-routes';
import { moduleContentOperation } from '@/lib/server/content/module-operations';
import { listSkillTrees } from '@/lib/server/skills/skill-tree-service';

export const GET = operationRoute(
    moduleContentOperation('skill-trees.list'),
    async ({ actor }) => NextResponse.json(await listSkillTrees(actor))
);
