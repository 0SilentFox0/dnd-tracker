import { useTranslations } from 'next-intl';

import { HudSection } from '@/components/hud/form';
import { Checkbox } from '@/components/ui/checkbox';
import { DND_SAVING_THROWS, DND_SKILLS } from '@/lib/constants/skills';
import type { CharacterFormBindings } from '@/lib/utils/characters/form/bindings';

interface CharacterSkillsSectionProps {
    skills: CharacterFormBindings['skills'];
}

export function CharacterSkillsSection({
    skills: skillsGroup,
}: CharacterSkillsSectionProps) {
    const t = useTranslations('characters.form.sections');

    const tg = useTranslations('gameTerms');

    const {
        data: { savingThrows, skills },
        handlers,
    } = skillsGroup;

    return (
        <div className="w-full space-y-5">
            <HudSection panel title={t('savingThrows')}>
                <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                    {DND_SAVING_THROWS.map((ability) => (
                        <label
                            key={ability}
                            className="flex h-11 cursor-pointer items-center gap-3 border-b border-hud-line/60"
                        >
                            <Checkbox
                                checked={savingThrows[ability] || false}
                                onCheckedChange={() =>
                                    handlers.toggleSavingThrow(ability)
                                }
                                className="rounded"
                            />
                            <span className="text-sm">
                                {tg(`abilities.${ability}.label`)}
                            </span>
                        </label>
                    ))}
                </div>
            </HudSection>

            <HudSection panel title={t('skills')}>
                <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                    {DND_SKILLS.map((skill) => (
                        <label
                            key={skill}
                            className="flex h-11 cursor-pointer items-center gap-3 border-b border-hud-line/60"
                        >
                            <Checkbox
                                checked={skills[skill] || false}
                                onCheckedChange={() =>
                                    handlers.toggleSkill(skill)
                                }
                                className="rounded"
                            />
                            <span className="text-sm">
                                {tg(`dndSkills.${skill}`)}
                            </span>
                        </label>
                    ))}
                </div>
            </HudSection>
        </div>
    );
}
