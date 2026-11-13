'use client';

import { notFound } from 'next/navigation';

import { systemUiOf } from '@/components/systems';
import type { SystemSelection } from '@/lib/utils/rules/systems/catalog';

export function SystemDmPage({
    campaignId,
    section,
    system,
    canEdit,
}: {
    campaignId: string;
    section: string;
    system: SystemSelection;
    canEdit: boolean;
}) {
    const dmPages = systemUiOf(system.key, system.modules).dmPages;

    const Page =
        dmPages && Object.hasOwn(dmPages, section)
            ? dmPages[section]
            : undefined;

    if (!Page) notFound();

    return <Page campaignId={campaignId} canEdit={canEdit} />;
}
