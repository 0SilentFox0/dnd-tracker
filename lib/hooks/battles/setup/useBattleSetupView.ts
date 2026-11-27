'use client';

import { useState } from 'react';

export type CatalogTab = 'heroes' | 'units';

export function useBattleSetupView() {
    const [catalogTab, setCatalogTab] = useState<CatalogTab>('heroes');

    const [rosterOpen, setRosterOpen] = useState(false);

    return {
        catalog: { tab: catalogTab, set: setCatalogTab },
        roster: { open: rosterOpen, set: setRosterOpen },
    };
}
