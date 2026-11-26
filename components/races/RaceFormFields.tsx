'use client';

import { useState } from 'react';

import { RACE_FORM_TAB, type RaceFormTabId } from './race-form-tabs';
import { type RaceFormTabsInput, useRaceFormTabs } from './useRaceFormTabs';

import { HudTabs } from '@/components/hud/form';
import { useRevealInvalidTab } from '@/components/hud/form/reveal-invalid-tab';

export type RaceFormFieldsProps = RaceFormTabsInput;

export function RaceFormFields(props: RaceFormFieldsProps) {
    const [tab, setTab] = useState<RaceFormTabId>(RACE_FORM_TAB.basic);

    const onInvalidCapture = useRevealInvalidTab(tab, setTab);

    const tabs = useRaceFormTabs(props);

    return (
        <div onInvalidCapture={onInvalidCapture}>
            <HudTabs
                tabs={tabs}
                value={tab}
                onValueChange={setTab}
                keepMounted
                styles={{ content: 'px-0' }}
            />
        </div>
    );
}
