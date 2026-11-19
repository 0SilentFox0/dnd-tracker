'use client';

import type { SpellOnlyEditorProps } from '../spell-only-types';
import { SpellOnlyField } from '../SpellOnlyField';

export function MoveSummonEditor({
    effect,
    path,
    onChange,
}: SpellOnlyEditorProps<'moveSummon'>) {
    return (
        <SpellOnlyField
            owner={{ kind: 'moveSummon', effect, path }}
            field={{ name: 'feet', input: 'number' }}
            onChange={onChange}
        />
    );
}
