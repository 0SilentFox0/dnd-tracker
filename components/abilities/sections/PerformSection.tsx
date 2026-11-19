'use client';

import { useTranslations } from 'next-intl';

import type { AbilitySectionProps } from '../editor/AbilityPanel';
import { useAbilityEditor, useErrorsUnder } from '../editor/editor-context';
import { FieldErrors } from '../editor/FieldErrors';
import { SectionTitle } from './SectionTitle';

import { SelectField } from '@/components/ui/select-field';

export function PerformSection({
    ability,
    path,
    onChange,
}: Omit<AbilitySectionProps, 'state'>) {
    const t = useTranslations('abilities.perform');

    const { performChoices } = useAbilityEditor();

    const errors = useErrorsUnder(`${path}.perform`);

    if (!ability.limits?.legendaryCost && !ability.limits?.lair) return null;

    const fieldClass =
        'h-9 w-auto rounded-md border border-hud-line bg-hud-field px-2 text-sm';

    const changeKind = (kind: string) => {
        const { perform: _p, ...rest } = ability;

        onChange(
            kind === 'attack'
                ? {
                      ...rest,
                      perform: {
                          kind,
                          attack: performChoices?.attacks[0]?.name ?? '',
                      },
                      effects: [
                          {
                              kind: 'note',
                              text: ability.description || t('attackNote'),
                          },
                      ],
                  }
                : kind === 'spell'
                  ? {
                        ...rest,
                        perform: {
                            kind,
                            spellId: performChoices?.spells[0]?.id ?? '',
                        },
                        effects: [
                            {
                                kind: 'note',
                                text: ability.description || t('spellNote'),
                            },
                        ],
                    }
                  : rest
        );
    };

    return (
        <div className="space-y-2">
            <SectionTitle>{t('title')}</SectionTitle>
            <SelectField
                aria-label={t('kindAria')}
                triggerClassName={fieldClass}
                value={ability.perform?.kind ?? ''}
                onValueChange={changeKind}
                allowNone
                noneLabel={t('effects')}
                options={[
                    { value: 'attack', label: t('attack') },
                    { value: 'spell', label: t('spell') },
                ]}
            />
            {ability.perform?.kind === 'attack' && (
                <SelectField
                    aria-label={t('attackAria')}
                    triggerClassName={fieldClass}
                    value={ability.perform.attack}
                    onValueChange={(attack) =>
                        onChange({
                            ...ability,
                            perform: { kind: 'attack', attack },
                        })
                    }
                    allowNone
                    noneLabel={t('pickAttack')}
                    options={(performChoices?.attacks ?? []).map((a) => ({
                        value: a.name,
                        label: a.name,
                    }))}
                />
            )}
            {ability.perform?.kind === 'spell' && (
                <SelectField
                    aria-label={t('spellAria')}
                    triggerClassName={fieldClass}
                    value={ability.perform.spellId}
                    onValueChange={(spellId) =>
                        onChange({
                            ...ability,
                            perform: { kind: 'spell', spellId },
                        })
                    }
                    allowNone
                    noneLabel={t('pickSpell')}
                    options={(performChoices?.spells ?? []).map((s) => ({
                        value: s.id,
                        label: s.name,
                    }))}
                />
            )}
            <FieldErrors errors={errors} />
        </div>
    );
}
