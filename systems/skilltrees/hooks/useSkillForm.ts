'use client';

import { type FormEvent, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { abilitySaveError, useAbilityValidity } from '@/lib/hooks/abilities';
import { useNavigateFresh } from '@/lib/hooks/common';
import { useMainSkills } from '@/lib/hooks/skills/useMainSkills';
import { useCreateSkill, useUpdateSkill } from '@/lib/hooks/skills/useSkills';
import { useTranslator } from '@/lib/i18n/use-translator';
import { initialSkillFormValues } from '@/systems/skilltrees/rules/form/normalize';
import { buildSkillFormPayload } from '@/systems/skilltrees/rules/form/payload';
import type { MainSkill } from '@/types/main-skills';
import type { Skill, SkillFormBinding, SkillFormValues } from '@/types/skills';

export function useSkillForm(
    campaignId: string,
    {
        initialData,
        initialMainSkills,
    }: { initialData?: Skill; initialMainSkills?: MainSkill[] } = {}
) {
    const t = useTranslations('common.form');

    const ta = useTranslator('abilities');

    const router = useRouter();

    const navigateFresh = useNavigateFresh();

    const { data: mainSkillsFromApi = [] } = useMainSkills(campaignId, {
        enabled: initialMainSkills === undefined,
    });

    const mainSkills = initialMainSkills ?? mainSkillsFromApi;

    const create = useCreateSkill(campaignId);

    const update = useUpdateSkill(campaignId);

    const [values, setValues] = useState<SkillFormValues>(() =>
        initialSkillFormValues(initialData)
    );

    const [error, setError] = useState<string | null>(null);

    const validity = useAbilityValidity();

    const set = useCallback<SkillFormBinding['set']>(
        (key, value) => setValues((prev) => ({ ...prev, [key]: value })),
        []
    );

    const listHref = `/campaigns/${campaignId}/dm/skills`;

    const submit = async (event: FormEvent) => {
        event.preventDefault();

        if (!values.name.trim()) {
            setError(t('nameRequired'));

            return;
        }

        if (!validity.valid) return;

        setError(null);

        try {
            const payload = buildSkillFormPayload(values);

            if (initialData)
                await update.mutateAsync({
                    skillId: initialData.id,
                    data: payload,
                });
            else await create.mutateAsync(payload);

            navigateFresh(listHref);
        } catch (err) {
            setError(
                abilitySaveError(
                    err,
                    initialData ? t('updateFailed') : t('createFailed'),
                    ta
                )
            );
        }
    };

    return {
        form: { data: values, set } satisfies SkillFormBinding,
        mainSkills,
        abilities: { ...validity, issues: initialData?.abilityIssues ?? [] },
        status: {
            isSaving: create.isPending || update.isPending,
            error,
            isEdit: !!initialData,
        },
        actions: { submit, cancel: () => router.push(listHref) },
    };
}
