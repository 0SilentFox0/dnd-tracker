'use client';

import { useState } from 'react';

import { useCreateCareer, useUpdateCareer } from './useCareers';

import type {
    CareerData,
    CareerFormData,
    CareerTierDef,
} from '@/systems/wfrp/rules/careers/types';

export const CAREER_TIERS = 4;

const emptyTier = (): CareerTierDef => ({
    name: '',
    characteristics: [],
    skills: [],
    talents: [],
    trappings: [],
});

const initialOf = (career?: CareerData): CareerFormData => ({
    name: career?.name ?? '',
    icon: career?.icon ?? null,
    class: career?.class ?? null,
    tiers: Array.from(
        { length: CAREER_TIERS },
        (_, i) => career?.tiers[i] ?? emptyTier()
    ),
});

export function useCareerForm(campaignId: string, career?: CareerData) {
    const [data, set] = useState<CareerFormData>(() => initialOf(career));

    const create = useCreateCareer(campaignId);

    const update = useUpdateCareer(campaignId);

    const body = { ...data, name: data.name.trim() };

    const save = () =>
        career
            ? update.mutateAsync({ careerId: career.id, data: body })
            : create.mutateAsync(body);

    return {
        form: { data, set },
        save,
        isPending: create.isPending || update.isPending,
    };
}
