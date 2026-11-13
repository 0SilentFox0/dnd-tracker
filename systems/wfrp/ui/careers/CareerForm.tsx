'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { CareerTierFields } from './CareerTierFields';

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

    return (
        <form
            id={formId}
            onSubmit={(e) => void onSubmit(e)}
            className="space-y-4"
        >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            {form.data.tiers.map((tier, index) => (
                <CareerTierFields
                    key={index}
                    index={index}
                    tier={tier}
                    feats={feats.data ?? []}
                    onChange={(patch) => patchTier(index, patch)}
                />
            ))}
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </form>
    );
}
