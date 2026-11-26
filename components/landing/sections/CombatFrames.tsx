import type { CSSProperties } from 'react';

import { COMBAT_FRAMES } from '@/components/landing/media';
import { MediaFrame, Screen } from '@/components/landing/MediaFrame';
import type { Translator } from '@/lib/i18n/translator';

// callout anchors, % of the frame (x from the side given by `from`, y from the top)
const CALLOUTS = [
    { from: 'left', x: 4, y: 26 },
    { from: 'left', x: 22, y: 52 },
    { from: 'right', x: 3, y: 86 },
] as const;

export function CombatFrames({ t }: { t: Translator }) {
    return (
        <div className="ld-frames">
            <div className="ld-frames-sticky">
                <ol
                    aria-label={t('combat.frames.label')}
                    className="ld-frames-list"
                >
                    {COMBAT_FRAMES.map((id, i) => {
                        const n = i + 1;

                        const c = CALLOUTS[i];

                        return (
                            <li
                                key={id}
                                className="ld-frame"
                                style={
                                    {
                                        '--cx': `${c.x}%`,
                                        '--cy': `${c.y}%`,
                                    } as CSSProperties
                                }
                            >
                                <MediaFrame
                                    title={t('combat.frames.windowTitle')}
                                >
                                    <Screen
                                        id={id}
                                        alt={t(`combat.frames.${n}.alt`)}
                                    />
                                </MediaFrame>
                                <p
                                    className="ld-callout hud-sc"
                                    data-from={c.from}
                                >
                                    <span aria-hidden className="ld-callout-n">
                                        {n}
                                    </span>
                                    {t(`combat.frames.${n}.caption`)}
                                </p>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </div>
    );
}
