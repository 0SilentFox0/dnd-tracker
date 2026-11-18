import type { AssistantCaller } from '../../types';
import { WorldOperation } from './inputs';
import { getCampaignId, loadRestRules, StateArgs } from './state-common';
import {
    mapsCreateState,
    mapsDeleteState,
    mapsUpdateState,
    markerMutationState,
    markersCreateState,
    noteMutationState,
    notesCreateState,
} from './state-content';
import { enterState, exitState, restState, travelState } from './state-travel';

import 'server-only';

const WORLD_STATE: Record<
    WorldOperation,
    (args: StateArgs) => Promise<unknown>
> = {
    'maps.create': mapsCreateState,
    'maps.update': mapsUpdateState,
    'maps.delete': mapsDeleteState,
    'markers.create': markersCreateState,
    'markers.update': markerMutationState,
    'markers.delete': markerMutationState,
    'notes.create': notesCreateState,
    'notes.update': noteMutationState,
    'notes.delete': noteMutationState,
    travel: travelState,
    enter: enterState,
    exit: exitState,
    rest: restState,
};

export async function worldState(
    caller: AssistantCaller,
    operation: WorldOperation,
    input: Record<string, unknown>
) {
    const campaignId = getCampaignId(caller);

    const restRules = await loadRestRules(campaignId, operation, input);

    return WORLD_STATE[operation]({
        caller,
        campaignId,
        operation,
        input,
        restRules,
    });
}
