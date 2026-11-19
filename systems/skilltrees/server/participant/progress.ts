import { readProgress } from '../progress-store';
import { skillTreeContext } from './context';

import type { CampaignSpellContext } from '@/lib/utils/battle/types/participant';

type Holder = { id: string };

export function contextProgress(
    character: Holder,
    context: CampaignSpellContext | undefined
): unknown {
    return skillTreeContext.read(context)?.progress?.[character.id];
}

export async function loadCharacterProgress(
    character: Holder,
    context: CampaignSpellContext | undefined
): Promise<unknown> {
    if (context) return contextProgress(character, context);

    return (await readProgress([character.id])).get(character.id);
}
