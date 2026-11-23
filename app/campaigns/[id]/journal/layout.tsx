import type { ReactNode } from 'react';

import { ExtendLocaleScope } from '@/lib/i18n/extend-locale-scope';
export default function JournalLayout({ children }: { children: ReactNode }) {
    return (
        <ExtendLocaleScope namespaces={['quests', 'scenario', 'world']}>
            {children}
        </ExtendLocaleScope>
    );
}
