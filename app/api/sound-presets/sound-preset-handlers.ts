import {
    createPresetSchema,
    reorderPresetsSchema,
    updatePresetSchema,
} from '@/lib/schemas/soundboard';
import {
    createPreset,
    deletePreset,
    reorderPresets,
    updatePreset,
} from '@/lib/server/soundboard/preset-store';
import { privateJson } from '@/lib/utils/api/api-response';
import { withBody, withUser } from '@/lib/utils/api/with-user';

export const createPresetHandler = (req: Request) =>
    withBody(
        'create sound preset',
        req,
        createPresetSchema,
        async (userId, body) =>
            privateJson(await createPreset(userId, body.name), 201)
    );

export const updatePresetHandler = (req: Request, id: string) =>
    withBody(
        'update sound preset',
        req,
        updatePresetSchema,
        async (userId, body) =>
            privateJson(await updatePreset(userId, id, body))
    );

export const deletePresetHandler = (id: string) =>
    withUser('delete sound preset', async (userId) => {
        await deletePreset(userId, id);

        return privateJson({ ok: true });
    });

export const reorderPresetsHandler = (req: Request) =>
    withBody(
        'reorder sound presets',
        req,
        reorderPresetsSchema,
        async (userId, body) => {
            await reorderPresets(userId, body.ids);

            return privateJson({ ok: true });
        }
    );
