'use client';

import {
    type ComponentType,
    type FormEvent,
    type ReactNode,
    useMemo,
} from 'react';

import { DefaultAttacksSection } from './sections/DefaultAttacksSection';
import { EncountersSection } from './sections/EncountersSection';
import { ItemsSection } from './sections/ItemsSection';
import { OutOfCombatSection } from './sections/OutOfCombatSection';
import { SpellIngredientsSection } from './sections/SpellIngredientsSection';
import { SystemSection } from './sections/SystemSection';
import { useMechanicText } from './mechanic-text';
import { RulesChangesContext } from './RulesChanges';
import { RulesPathsProvider } from './RulesPaths';
import { RulesSide } from './RulesSide';
import { RulesTocFilter } from './RulesTocFilter';
import { useRulesSection } from './useRulesSection';

import { HudForm, HudFormPage, type HudTab } from '@/components/hud/form';
import { systemUiOf } from '@/components/systems';
import type { RulesSectionProps } from '@/components/systems/types';
import { Button } from '@/components/ui/button';
import {
    type RulesFormState,
    useCampaignModules,
    type useRulesForm,
} from '@/lib/hooks/campaigns';
import { useSearch } from '@/lib/hooks/common';
import { ruleSystemLabelKey } from '@/lib/i18n/system-scope';
import { useTranslator } from '@/lib/i18n/use-translator';
import { cn } from '@/lib/utils';
import type { MechanicKey } from '@/lib/utils/rules';
import { groupSectionKeys } from '@/lib/utils/rules/section-groups';
import { sectionsOfComposition } from '@/lib/utils/rules/section-registry';
import { rulePaths } from '@/lib/utils/rules/sections';
import { composition } from '@/lib/utils/rules/systems/catalog';

const FORM_ID = 'campaign-rules-form';

const CORE_EDITORS: Partial<
    Record<MechanicKey, ComponentType<RulesSectionProps>>
> = {
    defaultAttacks: DefaultAttacksSection,
    outOfCombat: OutOfCombatSection,
    encounters: EncountersSection,
    items: ItemsSection,
    spellIngredients: SpellIngredientsSection,
} satisfies Partial<Record<MechanicKey, ComponentType<RulesSectionProps>>>;

export function RulesBook({
    campaignId,
    title,
    rules,
    form,
    readOnly,
}: {
    campaignId: string;
    title: ReactNode;
    rules: ReturnType<typeof useRulesForm>;
    form: RulesFormState;
    readOnly: boolean;
}) {
    const t = useTranslator('rules');

    const tc = useTranslator('common');

    const tTerms = useTranslator('gameTerms');

    const text = useMechanicText();

    const modules = useCampaignModules(campaignId);

    const { save, reset, isSaving, isDirty, systemLocked, dirtyKeys } = rules;

    const ui = systemUiOf(form.data.system.key, form.data.system.modules);

    const active = sectionsOfComposition(composition(form.data.system));

    const editors = { ...CORE_EDITORS, ...ui.rulesSections };

    const mechanicKeys = (Object.keys(active) as MechanicKey[]).filter(
        (key) => active[key].mechanic && editors[key]
    );

    const keys = useMemo(
        () => ['system', ...mechanicKeys],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [mechanicKeys.join(',')]
    );

    const { section, setSection } = useRulesSection(keys);

    const tab = section ?? 'system';

    const labelOf = (key: string) =>
        key === 'system' ? t('system.label') : text(key, 'label');

    const search = useSearch(keys, (key) => [
        labelOf(key),
        key === 'system' ? t('system.description') : text(key, 'description'),
    ]);

    const shown = new Set(search.items);

    const dirty = new Set<string>(dirtyKeys);

    const dot = (
        <span
            role="img"
            aria-label={t('page.changed')}
            className="size-2 rounded-full bg-hud-accent"
        />
    );

    const guard = (node: ReactNode) =>
        readOnly ? (
            <fieldset disabled className="contents">
                {node}
            </fieldset>
        ) : (
            node
        );

    const tabs: HudTab<string>[] = groupSectionKeys(keys, active).flatMap(
        ({ group, keys: inGroup }) =>
            inGroup.map((key) => {
                const Section = editors[key as MechanicKey];

                return {
                    id: key,
                    label: labelOf(key),
                    group: t(`page.groups.${group}`),
                    badge: dirty.has(key) ? dot : undefined,
                    hidden: search.isActive && !shown.has(key),
                    content: guard(
                        key === 'system' ? (
                            <SystemSection
                                form={form}
                                locked={systemLocked}
                                modules={modules}
                                dirty={isDirty}
                            />
                        ) : (
                            Section && <Section form={form} />
                        )
                    ),
                };
            })
    );

    const chip = [
        tTerms(ruleSystemLabelKey(form.data.system.key)),
        ...modules.toggles
            .filter((toggle) => toggle.active)
            .map((toggle) => `+${tTerms(`module.${toggle.id}.name`)}`),
    ].join(' ');

    const pathsValue = {
        paths: new Set(rulePaths(active)),
        items: ui.rulesItems ?? {},
    };

    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!readOnly) void save();
    };

    const resetSection = (key: string) =>
        rules.resetKey(key as keyof typeof form.data);

    return (
        <RulesChangesContext.Provider value={{ dirty, reset: resetSection }}>
            <RulesPathsProvider value={pathsValue}>
                <HudFormPage
                    width="wide"
                    header={{
                        title,
                        aside: (
                            <>
                                <RulesTocFilter
                                    value={search.query.value}
                                    onChange={search.query.set}
                                />
                                <span>{chip}</span>
                            </>
                        ),
                    }}
                    sidePreview={false}
                    side={
                        <RulesSide
                            changed={dirtyKeys as string[]}
                            reset={resetSection}
                        />
                    }
                    actions={
                        readOnly ? undefined : (
                            <>
                                {isDirty && (
                                    <span className="text-sm text-hud-muted">
                                        {t('page.changedSections', {
                                            count: dirtyKeys.length,
                                        })}
                                    </span>
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={!isDirty || isSaving}
                                    onClick={reset}
                                >
                                    {tc('actions.cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    form={FORM_ID}
                                    disabled={!isDirty || isSaving}
                                >
                                    {tc('actions.save')}
                                </Button>
                            </>
                        )
                    }
                >
                    {(readOnly || section) && (
                        <div data-notice>
                            {readOnly && (
                                <p
                                    role="status"
                                    className="mb-3 rounded-xl border border-hud-rule px-4 py-2 text-sm text-hud-muted"
                                >
                                    {t('page.demoReadOnly')}
                                </p>
                            )}
                            {section && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="mb-2 lg:hidden"
                                    onClick={() => setSection(null)}
                                >
                                    {`‹ ${tc('actions.back')}`}
                                </Button>
                            )}
                        </div>
                    )}
                    <HudForm
                        id={FORM_ID}
                        className={cn(
                            section
                                ? 'max-lg:[&_[data-slot=hud-tabs-list]]:hidden'
                                : 'max-lg:[&_[data-slot=hud-tabs-panels]]:hidden'
                        )}
                        onSubmit={onSubmit}
                        tabs={tabs}
                        tab={tab}
                        onTabChange={setSection}
                        tabStyles={{
                            variant: 'rail',
                            rail: { from: 'lg', mobile: 'list' },
                        }}
                    />
                </HudFormPage>
            </RulesPathsProvider>
        </RulesChangesContext.Provider>
    );
}
