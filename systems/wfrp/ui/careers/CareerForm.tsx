'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { CareerTierFields } from './CareerTierFields';

import { HudForm, type HudTab } from '@/components/hud/form';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/labeled-input';
import { useFeats } from '@/lib/hooks/feats';
import { errorMessage } from '@/lib/utils/common/error-message';
import { useCareerForm } from '@/systems/wfrp/hooks/careers';
import type {
    CareerData,
    CareerTierDef,
} from '@/systems/wfrp/rules/careers/types';

export interface CareerFormProps {
    formId: string;
    campaignId: string;
    career?: CareerData;
    onDone: () => void;
    onSavingChange?: (saving: boolean) => void;
}

export function CareerForm({
    formId,
    campaignId,
    career,
    onDone,
    onSavingChange,
}: CareerFormProps) {
    const t = useTranslations('wfrpCareers.form');

    const tc = useTranslations('common.tabs');

    const feats = useFeats(campaignId);

    const { form, save, isPending } = useCareerForm(campaignId, career);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => onSavingChange?.(isPending), [isPending, onSavingChange]);

    const patchTier = (index: number, patch: Partial<CareerTierDef>) =>
        form.set((d) => ({
            ...d,
            tiers: d.tiers.map((tier, i) =>
                i === index ? { ...tier, ...patch } : tier
            ),
        }));

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!form.data.name.trim()) return setError(t('nameRequired'));

        if (form.data.tiers.some((tier) => !tier.name.trim()))
            return setError(t('tierNameRequired'));

        setError(null);

        try {
            await save();
            onDone();
        } catch (err) {
            setError(errorMessage(err, t('saveFailed')));
        }
    };

    const basic = (
        <div className="ds-fields">
            <FormField label={t('name')} htmlFor="career-name" required>
                <Input
                    id="career-name"
                    className="min-h-11"
                    value={form.data.name}
                    onChange={(e) =>
                        form.set((d) => ({ ...d, name: e.target.value }))
                    }
                />
            </FormField>
            <FormField label={t('class')} htmlFor="career-class">
                <Input
                    id="career-class"
                    className="min-h-11"
                    value={form.data.class ?? ''}
                    onChange={(e) =>
                        form.set((d) => ({
                            ...d,
                            class: e.target.value || null,
                        }))
                    }
                />
            </FormField>
        </div>
    );

    const tabs: HudTab[] = [
        { id: 'basic', label: tc('basic'), content: basic },
        ...form.data.tiers.map((tier, index) => ({
            id: `tier-${index}`,
            label: t('tier', { n: index + 1 }),
            content: (
                <CareerTierFields
                    index={index}
                    tier={tier}
                    feats={feats.data ?? []}
                    onChange={(patch) => patchTier(index, patch)}
                />
            ),
        })),
    ];

    return (
        <HudForm
            id={formId}
            onSubmit={(e) => void onSubmit(e)}
            tabs={tabs}
            tabStyles={{ variant: 'rail' }}
            error={error}
        />
    );
}
