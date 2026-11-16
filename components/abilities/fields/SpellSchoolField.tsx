'use client';

import type { FieldProps } from './FieldRenderer';

import { SelectInput } from './SelectInput';
import { useAbilityEditor } from '@/components/abilities/editor-context';
import { useSpellGroups } from '@/lib/hooks/spells';
import type { LocalizedFieldMeta } from '@/lib/utils/abilities/registry/fields';

export function SpellSchoolField({
    id,
    value,
    onChange,
    meta,
}: FieldProps<string | undefined>) {
    const { campaignId } = useAbilityEditor();
    const { data: groups = [] } = useSpellGroups(campaignId);

    const options = groups.flatMap((group) => [
        { value: group.id, label: group.name },
        // Older abilities stored the school name; keep those values editable.
        { value: group.name, label: group.name },
    ]);
    const localizedMeta: LocalizedFieldMeta = {
        ...meta,
        input: 'select',
        options,
    };

    return (
        <SelectInput
            id={id}
            value={value}
            onChange={onChange}
            meta={localizedMeta}
        />
    );
}
