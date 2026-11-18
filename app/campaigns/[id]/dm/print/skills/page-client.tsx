'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { PrintPageShell } from '@/components/common/PrintPageShell';
import { SkillCard } from '@/components/skills/list/SkillCard';
import { groupDisplayName } from '@/lib/constants/ungrouped';
import { useTranslator } from '@/lib/i18n/use-translator';
import {
    PLACEMENT_UNPLACED,
    skillPlacements,
} from '@/lib/utils/skills/progression';
import {
    convertGroupedSkillsToArray,
    groupSkillsByMainSkill,
} from '@/lib/utils/skills/skills';
import type { MainSkill } from '@/types/main-skills';
import type { Skill } from '@/types/skills';

interface MainSkillForPrint extends MainSkill {
    spellGroupName: string | null;
}

interface PrintSkillsPageClientProps {
    campaignId: string;
    campaignName: string;
    initialSkills: Skill[];
    mainSkills: MainSkillForPrint[];
    skillTrees: Array<{ id: string; skills: unknown }>;
}

export function PrintSkillsPageClient({
    campaignId,
    campaignName,
    initialSkills,
    mainSkills,
    skillTrees,
}: PrintSkillsPageClientProps) {
    const t = useTranslations('skills.print');

    const tRoot = useTranslator();

    const tGroup = useTranslations('skills.group');

    const positions = useMemo(() => skillPlacements(skillTrees), [skillTrees]);

    const groupedByMainSkill = useMemo(() => {
        const map = groupSkillsByMainSkill(initialSkills, mainSkills);

        return convertGroupedSkillsToArray(map);
    }, [initialSkills, mainSkills]);

    return (
        <PrintPageShell
            title={t('title', { campaign: campaignName })}
            hint={t('hint')}
            button={t('button')}
            empty={groupedByMainSkill.length === 0 ? t('empty') : null}
        >
            {groupedByMainSkill.map(([groupName, groupSkills]) => {
                const mainSkill = mainSkills.find(
                    (ms) => ms.name === groupName
                );

                const byGroup = new Map<
                    number,
                    { label: string; skills: typeof groupSkills }
                >();

                for (const skill of groupSkills) {
                    const place = positions.get(skill.id) ?? PLACEMENT_UNPLACED;

                    const entry = byGroup.get(place.group) ?? {
                        label: tRoot(place.label, place.params),
                        skills: [],
                    };

                    entry.skills.push(skill);
                    byGroup.set(place.group, entry);
                }

                return (
                    <section
                        key={groupName}
                        className="print-section mb-4"
                        style={
                            mainSkill?.color
                                ? {
                                      borderTop: `4px solid ${mainSkill.color}`,
                                  }
                                : undefined
                        }
                    >
                        <div className="flex items-center gap-2 py-1.5">
                            <div className="leading-tight">
                                <h2 className="text-base font-semibold">
                                    {groupDisplayName(
                                        groupName,
                                        tGroup('ungrouped')
                                    )}
                                </h2>
                                {mainSkill?.spellGroupName && (
                                    <p className="text-xs text-muted-foreground">
                                        {t('school', {
                                            group: mainSkill.spellGroupName,
                                        })}
                                    </p>
                                )}
                            </div>
                        </div>

                        {[...byGroup.entries()]
                            .sort(([a], [b]) => a - b)
                            .map(([group, { label, skills: levelSkills }]) => {
                                return (
                                    <div key={group} className="mb-2">
                                        <p className="mb-1 text-xs tracking-wide text-muted-foreground uppercase">
                                            {label}
                                        </p>
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                            {levelSkills.map((skill) => (
                                                <div
                                                    key={skill.id}
                                                    className="print-card"
                                                >
                                                    <SkillCard
                                                        skill={skill}
                                                        campaignId={campaignId}
                                                        printMode
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                    </section>
                );
            })}
        </PrintPageShell>
    );
}
