'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { useCampaignRules, useUpdateCampaignRules } from './useCampaignRules';

import { MAX_CLASS_LEVEL } from '@/lib/constants/classes';
import { useNotify } from '@/lib/hooks/common';
import { sameJson } from '@/lib/utils/common/json';
import { type Ruleset, type RulesetPatch } from '@/lib/utils/rules';
import { ALL_SECTIONS } from '@/lib/utils/rules/section-registry';

export const HERO_LEVELS = Array.from(
    { length: MAX_CLASS_LEVEL },
    (_, i) => i + 1
);

export interface RulesFormState {
    campaignId: string;
    data: Ruleset;
    set: <K extends keyof Ruleset>(key: K, value: Ruleset[K]) => void;
}

export function useRulesForm(campaignId: string) {
    const query = useCampaignRules(campaignId);

    const update = useUpdateCampaignRules(campaignId);

    const notify = useNotify();

    const t = useTranslations('rules');

    const [changes, setChanges] = useState<Partial<Ruleset>>({});

    const server = query.data;

    const merged = server && { ...server, ...changes };

    const data: Ruleset | undefined = merged && {
        ...merged,
        conditions: {
            ...merged.conditions,
            custom: server.conditions.custom,
        },
    };

    const dirtyKeys = server
        ? (Object.keys(changes) as (keyof Ruleset)[]).filter(
              (key) => !sameJson(changes[key], server[key])
          )
        : [];

    const form: RulesFormState | null =
        server && data
            ? {
                  campaignId,
                  data,
                  set: (key, value) =>
                      setChanges((prev) => ({
                          ...prev,
                          [key]:
                              key === 'system' &&
                              (value as Ruleset['system']).key ===
                                  server.system.key &&
                              !(value as Ruleset['system']).modules
                                  ? server.system
                                  : value,
                      })),
              }
            : null;

    const save = async () => {
        if (!data || dirtyKeys.length === 0) return true;

        const patchValue = (key: keyof Ruleset) => {
            const prepare = ALL_SECTIONS[key]?.prepareSave;

            if (prepare) return prepare(data[key] as Record<string, unknown>);

            if (key === 'conditions')
                return {
                    enabled: data.conditions.enabled,
                    exhaustion: data.conditions.exhaustion,
                };

            return data[key];
        };

        const patch = Object.fromEntries(
            dirtyKeys.map((key) => [key, patchValue(key)])
        ) as RulesetPatch;

        try {
            await update.mutateAsync(patch);
            setChanges({});

            return true;
        } catch (error) {
            await notify(
                error instanceof Error ? error.message : t('form.saveFailed')
            );

            return false;
        }
    };

    return {
        form,
        save,
        isSaving: update.isPending,
        isDirty: dirtyKeys.length > 0,
        systemLocked: query.data?.systemLocked ?? false,
        isLoading: query.isLoading,
        loadError: query.isError ? query.error : null,
        reload: () => void query.refetch(),
        reset: () => setChanges({}),
    };
}
