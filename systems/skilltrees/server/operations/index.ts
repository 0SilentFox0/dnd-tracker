import { NextResponse } from 'next/server';
import { z } from 'zod';

import { runProgressionAction } from '../progression/actions';
import { loadProgressionContext } from '../progression/context';
import { buildProgressionDto } from '../progression/dto';

import { characterIdSchema } from '@/lib/server/characters/character-id-schema';
import {
    defineCharacterOperation,
    memberScope,
} from '@/lib/server/characters/operation-runner';
import type { SystemOperation } from '@/lib/server/systems/types';

const nodeId = z.string().min(1);

const nodeIds = z.array(nodeId).min(1).max(100);

const progressionOperation = defineCharacterOperation({
    name: 'progression',
    action: 'load character progression',
    schema: z.object({}),
    unlocked: true,
    query: () => ({}),
    gate: memberScope,
    run: async ({ access, campaignId, characterId }) => {
        const ctx = await loadProgressionContext(
            access,
            campaignId,
            characterId
        );

        return ctx instanceof NextResponse
            ? ctx
            : NextResponse.json(await buildProgressionDto(campaignId, ctx));
    },
});

const learnOperation = defineCharacterOperation({
    name: 'progression.learn',
    action: 'learn skill node',
    schema: z.object({ nodeId }),
    gate: memberScope,
    run: ({ access, campaignId, characterId }, { nodeId }) =>
        runProgressionAction(access, campaignId, characterId, {
            type: 'learn',
            nodeId,
        }),
});

const unlearnOperation = defineCharacterOperation({
    name: 'progression.unlearn',
    action: 'unlearn skill node',
    schema: z.object({ nodeIds }),
    gate: memberScope,
    run: ({ access, campaignId, characterId }, { nodeIds }) =>
        runProgressionAction(access, campaignId, characterId, {
            type: 'unlearn',
            nodeIds,
        }),
});

const resetOperation = defineCharacterOperation({
    name: 'progression.reset',
    action: 'reset skill progression',
    schema: z.object({}),
    query: () => ({}),
    gate: memberScope,
    run: ({ access, campaignId, characterId }) =>
        runProgressionAction(access, campaignId, characterId, {
            type: 'reset',
        }),
});

const erased = (operation: unknown) =>
    operation as SystemOperation['operation'];

export const SKILLTREES_OPERATIONS: Record<string, SystemOperation> = {
    progression: {
        operation: erased(progressionOperation),
        input: characterIdSchema,
        scoped: true,
    },
    'progression.learn': {
        operation: erased(learnOperation),
        input: characterIdSchema.extend({ nodeId }).strict(),
        scoped: true,
    },
    'progression.unlearn': {
        operation: erased(unlearnOperation),
        input: characterIdSchema.extend({ nodeIds }).strict(),
        scoped: true,
    },
    'progression.reset': {
        operation: erased(resetOperation),
        input: characterIdSchema,
        scoped: true,
    },
};
