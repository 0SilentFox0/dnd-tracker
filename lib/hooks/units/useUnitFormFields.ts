'use client';

import { useMemo, useState } from 'react';

import { useAbilityValidity } from '@/lib/hooks/abilities';
import { useCampaignRules } from '@/lib/hooks/campaigns';
import { useRaces } from '@/lib/hooks/races';
import { useSpells } from '@/lib/hooks/spells';
import { useRuleSystem } from '@/lib/hooks/systems';
import { classesEnabled } from '@/lib/utils/characters/classes/classes-enabled';
import { byName } from '@/lib/utils/common/text';
import type { Unit } from '@/types/units';

export function useUnitFormFields(
    campaignId: string,
    initial: () => Partial<Unit>
) {
    const { data: rawRaces } = useRaces(campaignId);

    const { data: spells = [] } = useSpells(campaignId);

    const { data: rules } = useCampaignRules(campaignId);

    const { key: system } = useRuleSystem({ campaignId });

    const fiveE =
        !!rules && (classesEnabled(rules) || rules.encounters.balance === 'xp');

    const [formData, setFormData] = useState<Partial<Unit>>(initial);

    const [dirty, setDirty] = useState(false);

    const abilities = useAbilityValidity();

    const races = useMemo(() => [...(rawRaces ?? [])].sort(byName), [rawRaces]);

    const race = races.find((r) => r.id === formData.raceId) ?? null;

    const change = (updates: Partial<Unit>) => {
        setDirty(true);
        setFormData((prev) => ({ ...prev, ...updates }));
    };

    return {
        form: { data: formData, set: setFormData, change, dirty },
        options: { races, race, spells, fiveE, system },
        abilities,
    };
}

export type UnitFormFieldsState = ReturnType<typeof useUnitFormFields>;
