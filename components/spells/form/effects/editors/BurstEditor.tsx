'use client';

import type { SpellOnlyEditorProps } from '../spell-only-types';
import { SpellOnlyField } from '../SpellOnlyField';
import { ZoneTriggerEditor } from '../ZoneTriggerEditor';

import { useTranslator } from '@/lib/i18n/use-translator';

export function BurstEditor({
    effect,
    path,
    onChange,
}: SpellOnlyEditorProps<'burst'>) {
    const t = useTranslator('editors');

    const owner = { kind: 'burst', effect, path } as const;

    return (
        <>
            <SpellOnlyField
                owner={owner}
                field={{ name: 'radiusFeet', input: 'number' }}
                onChange={onChange}
            />
            <SpellOnlyField
                owner={owner}
                field={{ name: 'dice', input: 'text' }}
                onChange={onChange}
            />
            <SpellOnlyField
                owner={owner}
                field={{ name: 'upcastDice', input: 'number', optional: true }}
                onChange={onChange}
            />
            <ZoneTriggerEditor
                value={effect.trigger}
                path={`${path}.trigger`}
                label={t('spellEffects.fields.burst.trigger')}
                onChange={(trigger) =>
                    trigger && onChange({ ...effect, trigger })
                }
            />
        </>
    );
}
