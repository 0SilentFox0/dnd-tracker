import { campaignPost } from '@/lib/api/client';
import { systemPath } from '@/lib/api/system';
import type {
    CorruptionGrantBody,
    CorruptionGrantResult,
    CorruptionUndoBody,
    CorruptionUndoResult,
} from '@/systems/wfrp/rules/corruption/api-types';

export const postCorruptionGrant = (
    campaignId: string,
    characterId: string,
    body: CorruptionGrantBody
) =>
    campaignPost<CorruptionGrantResult>(
        campaignId,
        systemPath.character(characterId, 'corruption'),
        body
    );

export const postCorruptionUndo = (
    campaignId: string,
    characterId: string,
    body: CorruptionUndoBody
) =>
    campaignPost<CorruptionUndoResult>(
        campaignId,
        systemPath.character(characterId, 'corruption.undo'),
        body
    );
