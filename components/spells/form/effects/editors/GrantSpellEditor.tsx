'use client';

import type { SpellOnlyEditorProps } from '../spell-only-types';
import { SpellOnlyField } from '../SpellOnlyField';

export function GrantSpellEditor({
    effect,
    path,
    onChange,
}: SpellOnlyEditorProps<'grantSpell'>) {
    const owner = { kind: 'grantSpell', effect, path } as const;

    return (
        <>
            <SpellOnlyField
                owner={owner}
                field={{ name: 'maxLevel', input: 'number' }}
                onChange={onChange}
            />
            <SpellOnlyField
                owner={owner}
                field={{ name: 'onOption', input: 'number', optional: true }}
                onChange={onChange}
            />
            <SpellOnlyField
                owner={owner}
                field={{ name: 'duration', input: 'duration' }}
                onChange={onChange}
            />
        </>
    );
}
