'use client';

import { useTranslations } from 'next-intl';

import { DoorToolOptions, EDGE_TOOLS, ToolButtons } from '../shared/MapToolButtons';

import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { Label } from '@/components/ui/label';
import type { BattleMapEditor } from '@/lib/hooks/battles';

export function EdgesSection({ editor }: { editor: BattleMapEditor }) {
    const t = useTranslations('battleSetup.map');

    return (
        <div className="space-y-2">
            <OnboardingHint id="dm.map-walls" />
            <Label>{t('edgeDrawing')}</Label>
            <ToolButtons
                tools={EDGE_TOOLS}
                tool={editor.state.tool}
                onPick={editor.actions.setTool}
            />
            <DoorToolOptions editor={editor} />
        </div>
    );
}
