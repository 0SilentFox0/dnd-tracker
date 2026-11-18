import { z } from 'zod';

import 'server-only';
import {
    createWorldMapSchema,
    createWorldMarkerSchema,
    createWorldNoteSchema,
    enterSchema,
    exitSchema,
    restWorldSchema,
    travelSchema,
    updateWorldMapSchema,
    updateWorldMarkerSchema,
} from '@/lib/schemas/world';

const id = z.string().min(1);

export const createPublicWorldNoteSchema = createWorldNoteSchema
    .pick({ markerId: true, text: true })
    .extend({ visibility: z.literal('public') })
    .strict();

export const updatePublicWorldNoteSchema = z
    .strictObject({
        text: createWorldNoteSchema.shape.text.optional(),
        visibility: z.literal('public').optional(),
    })
    .refine(
        (value) => Object.keys(value).length > 0,
        'world.validation.nothingToUpdate'
    );

export const WORLD_ACTION_INPUTS = {
    'maps.create': createWorldMapSchema,
    'maps.update': z.strictObject({ mapId: id, patch: updateWorldMapSchema }),
    'maps.delete': z.strictObject({ mapId: id }),
    'markers.create': createWorldMarkerSchema,
    'markers.update': z.strictObject({
        markerId: id,
        patch: updateWorldMarkerSchema,
    }),
    'markers.delete': z.strictObject({ markerId: id }),
    'notes.create': createPublicWorldNoteSchema,
    'notes.update': z.strictObject({
        noteId: id,
        patch: updatePublicWorldNoteSchema,
    }),
    'notes.delete': z.strictObject({ noteId: id }),
    travel: travelSchema,
    enter: enterSchema,
    exit: exitSchema,
    rest: restWorldSchema,
} as const;

export type WorldOperation = keyof typeof WORLD_ACTION_INPUTS;

export const parsedInput = (operation: WorldOperation, input: unknown) =>
    WORLD_ACTION_INPUTS[operation].parse(input) as Record<string, unknown>;
