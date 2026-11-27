import { useMemo } from 'react';

import { markdownToDoc } from '@/lib/utils/scenario/markdown';
import { spellDescriptionBody } from '@/lib/utils/spells/description-body';
import type { RichDoc } from '@/types/scenario';

export function useSpellDescriptionDoc(description: string): RichDoc {
    return useMemo(
        () => markdownToDoc(spellDescriptionBody(description)),
        [description]
    );
}
