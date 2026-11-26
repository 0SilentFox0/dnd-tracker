'use client';

import { type ComponentType, type FormEvent, type ReactNode } from 'react';

import { CompositionChip, RulesAside } from './book/RulesAside';
import { RulesChangedChip } from './book/RulesChangedChip';
import { RulesToc, type RulesTocGroup } from './book/RulesToc';
import { useRulesSection } from './book/useRulesSection';
import { DefaultAttacksSection } from './sections/DefaultAttacksSection';
import { EncountersSection } from './sections/EncountersSection';
import { ItemsSection } from './sections/ItemsSection';
import { OutOfCombatSection } from './sections/OutOfCombatSection';
import { SpellIngredientsSection } from './sections/SpellIngredientsSection';
import { SystemSection } from './sections/SystemSection';
import { useMechanicText } from './mechanic-text';
import { RulesPathsProvider } from './RulesPaths';

import { ErrorState, LoadingState } from '@/components/common/states';
import { HudFormPage } from '@/components/hud/form';
import { useRevealInvalidTab } from '@/components/hud/form/reveal-invalid-tab';
import { systemUiOf } from '@/components/systems';
import type { RulesSectionProps } from '@/components/systems/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useCampaignModules, useRulesForm } from '@/lib/hooks/campaigns';
import { useSearch } from '@/lib/hooks/common';
import { useTranslator } from '@/lib/i18n/use-translator';
import { cn } from '@/lib/utils';
import type { MechanicKey, Ruleset } from '@/lib/utils/rules';
import { sectionsOfComposition } from '@/lib/utils/rules/section-registry';
import { rulePaths, RULES_SECTION_GROUPS } from '@/lib/utils/rules/sections';
import { composition } from '@/lib/utils/rules/systems/catalog';

const FORM_ID = 'campaign-rules-form';

const SYSTEM_KEY = 'system';

const CORE_EDITORS: Partial<
    Record<MechanicKey, ComponentType<RulesSectionProps>>
> = {
    defaultAttacks: DefaultAttacksSection,
    outOfCombat: OutOfCombatSection,
    encounters: EncountersSection,
    items: ItemsSection,
    spellIngredients: SpellIngredientsSection,
} satisfies Partial<Record<MechanicKey, ComponentType<RulesSectionProps>>>;

interface BookEntry {
    key: string;
    group: string;
    label: string;
    description: string;
}

const entryFields = (entry: BookEntry) => [entry.label, entry.description];

export function RulesForm({
    campaignId,
    initial,
}: {
    campaignId: string;
    initial?: Ruleset;
}) {
    const t = useTranslator('rules');

    const tc = useTranslator('common');

    const text = useMechanicText();

    const readOnly = !!initial;

    const {
        form,
        save,
        reset,
        resetKey,
        dirtyKeys,
        isSaving,
        isDirty,
        isLoading,
        loadError,
        reload,
        systemLocked,
    } = useRulesForm(campaignId, { initial });

    const modules = useCampaignModules(readOnly ? '' : campaignId);

    const active = form
        ? sectionsOfComposition(composition(form.data.system))
        : null;

    const editors = form
        ? {
              ...CORE_EDITORS,
              ...systemUiOf(form.data.system.key, form.data.system.modules)
                  .rulesSections,
          }
        : {};

    const sectionKeys = active
        ? (Object.keys(active) as MechanicKey[]).filter(
              (key) => active[key].mechanic && editors[key]
          )
        : [];

    const entries: BookEntry[] = active
        ? [
              {
                  key: SYSTEM_KEY,
                  group: 'system',
                  label: t('system.label'),
                  description: t('system.description'),
              },
              ...sectionKeys.map((key) => ({
                  key,
                  group: active[key].group ?? 'other',
                  label: text(key, 'label'),
                  description: text(key, 'description'),
              })),
          ]
        : [];

    const search = useSearch(entries, entryFields, 0);

    const section = useRulesSection(entries.map((entry) => entry.key));

    const revealInvalid = useRevealInvalidTab(
        section.active ?? entries[0]?.key,
        section.select
    );

    if (loadError)
        return (
            <HudFormPage title={t('page.title')}>
                <ErrorState error={loadError} onRetry={reload} />
            </HudFormPage>
        );

    if (isLoading || !form || !active)
        return (
            <HudFormPage title={t('page.title')}>
                <LoadingState />
            </HudFormPage>
        );

    const ui = systemUiOf(form.data.system.key, form.data.system.modules);

    const isChanged = (key: string) => dirtyKeys.has(key as keyof Ruleset);

    const groups: RulesTocGroup[] = [...RULES_SECTION_GROUPS, 'other']
        .map((id) => ({
            id,
            items: search.items
                .filter((entry) => entry.group === id)
                .map((entry) => ({ ...entry, changed: isChanged(entry.key) })),
        }))
        .filter((group) => group.items.length > 0);

    const changed = entries
        .filter((entry) => isChanged(entry.key))
        .map(({ key, label }) => ({ key, label }));

    const pathsValue = {
        paths: new Set(rulePaths(active)),
        items: ui.rulesItems ?? {},
    };

    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        void save();
    };

    const panels: Record<string, ReactNode> = {
        [SYSTEM_KEY]: (
            <SystemSection
                form={form}
                locked={systemLocked || readOnly}
                modules={modules}
                dirty={isDirty}
            />
        ),
        ...Object.fromEntries(
            sectionKeys.map((key) => {
                const Section = editors[
                    key
                ] as ComponentType<RulesSectionProps>;

                return [key, <Section key={key} form={form} />];
            })
        ),
    };

    const value = section.active ?? entries[0].key;

    const actions = readOnly ? undefined : (
        <>
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
    );

    return (
        <HudFormPage
            title={t('page.title')}
            aside={
                <span className="flex flex-wrap items-center gap-2">
                    <CompositionChip system={form.data.system} />
                    <RulesChangedChip count={dirtyKeys.size} />
                </span>
            }
            width="wide"
            actions={actions}
        >
            <RulesPathsProvider value={pathsValue}>
                <Tabs
                    value={value}
                    onValueChange={section.select}
                    orientation="vertical"
                    data-hud-tabs-root=""
                >
                    <div
                        data-hud-rail=""
                        className={cn(
                            'z-20 xl:sticky xl:top-[calc(var(--shell-header-h,57px)+16px)] xl:self-start',
                            section.active && 'max-lg:hidden'
                        )}
                    >
                        <RulesToc groups={groups} query={search.query} />
                    </div>
                    <form
                        id={FORM_ID}
                        data-hud-tabs-panels=""
                        onSubmit={onSubmit}
                        onInvalidCapture={revealInvalid}
                        className={cn(
                            'space-y-3',
                            !section.active && 'max-lg:hidden'
                        )}
                    >
                        <Button
                            type="button"
                            variant="ghost"
                            className="lg:hidden"
                            onClick={() => section.select(null)}
                        >
                            {`‹ ${t('page.toc')}`}
                        </Button>
                        {readOnly && (
                            <p
                                role="note"
                                className="ds-inset p-3 text-sm text-hud-bone"
                            >
                                {t('page.demoReadOnly')}
                            </p>
                        )}
                        <fieldset disabled={readOnly} className="min-w-0">
                            {entries.map((entry) => (
                                <TabsContent
                                    key={entry.key}
                                    value={entry.key}
                                    data-tab-id={entry.key}
                                    forceMount
                                    className="mt-0 space-y-3 data-[state=inactive]:hidden"
                                >
                                    <div className="flex min-h-7 items-center justify-end">
                                        {isChanged(entry.key) && (
                                            <span className="text-sm text-hud-accent-fg">
                                                {`● ${t('page.changedBadge')}`}
                                            </span>
                                        )}
                                    </div>
                                    {panels[entry.key]}
                                    {!readOnly && isChanged(entry.key) && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                resetKey(
                                                    entry.key as keyof Ruleset
                                                )
                                            }
                                        >
                                            {t('page.resetSection')}
                                        </Button>
                                    )}
                                </TabsContent>
                            ))}
                        </fieldset>
                        <p className="text-xs text-hud-muted lg:hidden">
                            {t('form.hint')}
                        </p>
                    </form>
                    <aside className="hud-wide-side">
                        <RulesAside
                            system={form.data.system}
                            changed={changed}
                            actions={
                                readOnly
                                    ? undefined
                                    : {
                                          select: section.select,
                                          reset: (key) =>
                                              resetKey(key as keyof Ruleset),
                                      }
                            }
                        />
                    </aside>
                </Tabs>
            </RulesPathsProvider>
        </HudFormPage>
    );
}
