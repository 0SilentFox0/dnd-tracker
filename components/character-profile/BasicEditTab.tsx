'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { useProfile } from './ProfileContext';

import { CharacterBasicInfo } from '@/components/characters/basic/CharacterBasicInfo';
import { CharacterHpPreview } from '@/components/characters/stats/CharacterHpPreview';
import { systemUiOf } from '@/components/systems';
import { Button } from '@/components/ui/button';
import { useCampaignRules } from '@/lib/hooks/campaigns';
import type { DmCharacterEditor } from '@/lib/hooks/characters';
import { useClassMode } from '@/lib/hooks/classes';
import { useCampaignSystem } from '@/lib/hooks/systems';
import { characterBaseHp } from '@/lib/utils/characters/hero-hp';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { statColumnsOf } from '@/lib/utils/rules/systems/stats';
import { resolveClassEntries } from '@/lib/utils/spells/class-slots';

export function BasicEditTab({
    editor,
    onDeleted,
}: {
    editor: DmCharacterEditor;
    onDeleted: () => void;
}) {
    const { form, options } = editor;

    const t = useTranslations('characterProfile.basic');

    const { campaignId, sheet } = useProfile();

    const classMode = useClassMode(campaignId);

    const [converting, setConverting] = useState(false);

    const hasEntries = (form.basicInfo.data.classes ?? []).length > 0;

    const classUi = classMode.enabled && (hasEntries || converting);

    const classEntries = resolveClassEntries(
        form.basicInfo.data.classes ?? [],
        classMode.byId
    );

    const { data: rules } = useCampaignRules(campaignId);

    const { def, system } = useCampaignSystem(campaignId, sheet.system);

    const ui = systemUiOf(system.key, system.modules);

    const classHp =
        classUi && classEntries.some((e) => e.class)
            ? characterBaseHp(
                  {
                      level: form.basicInfo.data.level,
                      constitution: form.abilityScores.data.constitution,
                  },
                  { entries: classEntries, rules: rules ?? DEFAULT_RULES }
              )
            : null;

    const hp = classHp
        ? {
              total: classHp.total,
              lines: classHp.breakdown.map((b) => ({ ...b, value: '' })),
          }
        : sheet.hp;

    const remove = async () => {
        if (await editor.dmActions.remove()) onDeleted();
    };

    return (
        <div className="space-y-6">
            <CharacterBasicInfo
                basicInfo={form.basicInfo}
                campaignMembers={options.members}
                races={options.races}
                hideProgression={ui.hideProgression}
                hideLineage={!def.lineage}
                hideClass={!statColumnsOf(def).has('classes')}
                hideAlignment={!def.identity.alignments}
                hideArchetype={!statColumnsOf(def).has('archetype')}
                classMode={classUi ? classMode : undefined}
            />
            {classMode.enabled && !classUi && !ui.hideProgression && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConverting(true)}
                >
                    {t('toClasses')}
                </Button>
            )}
            <CharacterHpPreview hp={hp} />
            <Button
                type="button"
                variant="destructive"
                className="h-11 w-full"
                onClick={() => void remove()}
            >
                {t('delete')}
            </Button>
        </div>
    );
}
