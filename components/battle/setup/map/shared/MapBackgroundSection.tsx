'use client';

import { MapBackgroundImage } from './MapBackgroundImage';
import { MapGridAlignment } from './MapGridAlignment';

import type { BattleMapEditor } from '@/lib/hooks/battles';

export function MapBackgroundSection({ editor }: { editor: BattleMapEditor }) {
    return (
        <div className="space-y-4">
            <MapGridAlignment editor={editor} />
            <MapBackgroundImage editor={editor} />
        </div>
    );
}
