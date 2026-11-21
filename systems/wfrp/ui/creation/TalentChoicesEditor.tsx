'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/select-field';

interface Option {
    value: string;
    label: string;
}

interface TalentChoicesEditorProps {
    groups: string[][];
    options: Option[];
    onChange: (groups: string[][]) => void;
}

const MAX_GROUPS = 5;

const MAX_PER_GROUP = 6;

export function TalentChoicesEditor({
    groups,
    options,
    onChange,
}: TalentChoicesEditorProps) {
    const t = useTranslations('wfrpCreation.editor');

    const label = (id: string) =>
        options.find((o) => o.value === id)?.label ?? id;

    const patch = (index: number, next: string[]) =>
        onChange(groups.map((g, i) => (i === index ? next : g)));

    return (
        <section aria-label={t('talentChoices')} className="space-y-2">
            <h3 className="text-sm font-semibold">{t('talentChoices')}</h3>
            <p className="text-sm text-hud-muted">{t('talentChoicesHint')}</p>
            {groups.map((group, i) => (
                <div
                    key={i}
                    role="group"
                    aria-label={t('talentChoiceGroup', { n: i + 1 })}
                    className="space-y-2 rounded-lg border border-hud-line p-2"
                >
                    <ul className="flex flex-wrap gap-2">
                        {group.map((id) => (
                            <li
                                key={id}
                                className="flex items-center gap-1 rounded-lg border border-hud-line pl-3 text-sm"
                            >
                                {label(id)}
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="size-11"
                                    aria-label={`${t('removeTalent')}: ${label(id)}`}
                                    onClick={() =>
                                        patch(
                                            i,
                                            group.filter((g) => g !== id)
                                        )
                                    }
                                >
                                    ×
                                </Button>
                            </li>
                        ))}
                    </ul>
                    <div className="flex items-center gap-2">
                        {group.length < MAX_PER_GROUP && (
                            <div className="min-w-0 flex-1">
                                <SelectField
                                    aria-label={t('talentsPlaceholder')}
                                    value=""
                                    onValueChange={(id) =>
                                        id &&
                                        !group.includes(id) &&
                                        patch(i, [...group, id])
                                    }
                                    options={options.filter(
                                        (o) => !group.includes(o.value)
                                    )}
                                    placeholder={t('talentsPlaceholder')}
                                    triggerClassName="min-h-11 w-full"
                                />
                            </div>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-11"
                            onClick={() =>
                                onChange(groups.filter((_, j) => j !== i))
                            }
                        >
                            {t('removeTalentChoice')}
                        </Button>
                    </div>
                </div>
            ))}
            {groups.length < MAX_GROUPS && (
                <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => onChange([...groups, []])}
                >
                    {t('addTalentChoice')}
                </Button>
            )}
        </section>
    );
}
