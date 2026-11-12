import { readCharacteristics } from './characteristics/keys';

import { compactResources } from '@/lib/utils/characters/resources/hp';
import type { CharacterResources } from '@/types/characters';

export const onSession = (
    r: CharacterResources,
    characteristics: unknown
): CharacterResources =>
    compactResources({
        ...r,
        fortune: readCharacteristics({ characteristics }).fate,
    });
