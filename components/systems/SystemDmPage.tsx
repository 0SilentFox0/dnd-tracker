'use client';

import { notFound } from 'next/navigation';

import { systemUiOf } from '@/components/systems';
import type { DmPageProps } from '@/components/systems/types';
import type { SystemSelection } from '@/lib/utils/rules/systems/catalog';

export function SystemDmPage({
    section,
    system,
    ...page
}: DmPageProps & {
    section: string;
    system: SystemSelection;
}) {
    const dmPages = systemUiOf(system.key, system.modules).dmPages;

    const Page =
        dmPages && Object.hasOwn(dmPages, section)
            ? dmPages[section]
            : undefined;

    if (!Page) notFound();

    return <Page {...page} />;
}
