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
import { asSystemOperation } from '@/lib/server/systems/operation-helpers';
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

export const SKILLTREES_OPERATIONS: Record<string, SystemOperation> = {
    progression: {
        operation: asSystemOperation(progressionOperation),
        input: characterIdSchema,
        read: true,
    },
    'progression.learn': {
        operation: asSystemOperation(learnOperation),
        input: characterIdSchema.extend({ nodeId }).strict(),
    },
    'progression.unlearn': {
        operation: asSystemOperation(unlearnOperation),
        input: characterIdSchema.extend({ nodeIds }).strict(),
        confirm: 'always',
    },
    'progression.reset': {
        operation: asSystemOperation(resetOperation),
        input: characterIdSchema,
        confirm: 'always',
    },
};
