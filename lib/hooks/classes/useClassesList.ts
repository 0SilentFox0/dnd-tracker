'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { useClasses, useCreateClass, useDeleteClass } from './useClasses';

import { useLibraryList } from '@/lib/hooks/common';
import type { ClassFormData } from '@/types/classes';

export function useClassesList(campaignId: string) {
    const t = useTranslations('classes');

    const locale = useLocale();

    const list = useLibraryList({
        query: useClasses(campaignId),
        create: useCreateClass(campaignId),
        remove: useDeleteClass(campaignId),
        texts: {
            confirmDelete: t('list.confirmDelete'),
            deleteError: t('list.deleteError'),
            createError: t('list.createError'),
        },
    });

    const classes = useMemo(() => {
        const collator = new Intl.Collator(locale);

        return [...list.items].sort((a, b) => collator.compare(a.name, b.name));
    }, [list.items, locale]);

    return {
        classes,
        isLoading: list.isLoading,
        createDialog: list.createDialog,
        actions: {
            createClass: (data: ClassFormData) => list.create(data),
            deleteClass: list.remove,
        },
    };
}
