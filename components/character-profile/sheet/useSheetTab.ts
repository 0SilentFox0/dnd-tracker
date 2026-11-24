import { useState } from 'react';

import type { ProfileTabId } from '../tabs/ProfileTabs';
import { asTab } from './view-tabs';

export function useSheetTab(initialTab?: string) {
    const [tab, setTabState] = useState<ProfileTabId>(() => asTab(initialTab));

    const [seenInitialTab, setSeenInitialTab] = useState(initialTab);

    if (seenInitialTab !== initialTab) {
        // navigation to the same route with another ?tab= (e.g. a toast link) must switch the tab
        setSeenInitialTab(initialTab);
        setTabState(asTab(initialTab));
    }

    const setTab = (id: ProfileTabId) => {
        setTabState(id);

        const next = new URLSearchParams(window.location.search);

        next.set('tab', id);
        // shallow URL update: no useSearchParams (it forces a client-only Suspense boundary) and no server round trip
        window.history.replaceState(
            null,
            '',
            `${window.location.pathname}?${next.toString()}`
        );
    };

    return { tab, setTab };
}
