import { PrimaryAbilityPicker } from './PrimaryAbilityPicker';

import type { CharacterFormBindings } from '@/lib/utils/characters/form/bindings';
import { AbilityScoresGrid } from '@/systems/d20/ui/stats/AbilityScoresGrid';

interface CharacterAbilityScoresProps {
    abilityScores: CharacterFormBindings['abilityScores'];
    withPrimary?: boolean;
}

export function CharacterAbilityScores({
    abilityScores: { data, set },
    withPrimary = false,
}: CharacterAbilityScoresProps) {
    return (
        <div className="w-full space-y-4">
            <AbilityScoresGrid data={data} set={set} showModifier />
            {withPrimary && (
                <PrimaryAbilityPicker
                    value={data.primaryAbility}
                    onChange={(v) => set('primaryAbility', v)}
                />
            )}
        </div>
    );
}
