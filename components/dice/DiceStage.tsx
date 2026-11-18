'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import type { DiceEngine } from './engine';

import { FX_LOAD_TIMEOUT_MS } from '@/components/fx/runtime/play';
import type { DiceThrowSpec } from '@/lib/utils/battle/fx/dice';

export interface DiceStageHandle {
    play(spec: DiceThrowSpec): Promise<void>;
    cancel(): void;
}

export const sceneLoader = { load: () => import('./scene') };

export const DiceStage = forwardRef<DiceStageHandle>(
    function DiceStage(_, ref) {
        const host = useRef<HTMLDivElement>(null);

        const engine = useRef<Promise<DiceEngine | null> | null>(null);

        const runs = useRef(0);

        useImperativeHandle(ref, () => {
            const load = async (): Promise<DiceEngine | null> => {
                let scene: Awaited<ReturnType<typeof sceneLoader.load>>;

                try {
                    scene = await sceneLoader.load();
                } catch (e) {
                    console.warn('dice stage', e);
                    engine.current = null;

                    return null;
                }

                try {
                    return host.current
                        ? await scene.createThreeDice(host.current)
                        : null;
                } catch (e) {
                    console.warn('dice stage', e);

                    return null;
                }
            };

            const ensure = () => (engine.current ??= load());

            return {
                async play(spec) {
                    const run = ++runs.current;

                    let timer = 0;

                    const timeout = new Promise<'timeout'>((resolve) => {
                        timer = window.setTimeout(
                            () => resolve('timeout'),
                            FX_LOAD_TIMEOUT_MS
                        );
                    });

                    const e = await Promise.race([ensure(), timeout]).finally(
                        () => window.clearTimeout(timer)
                    );

                    if (e && e !== 'timeout' && run === runs.current)
                        await e.roll(spec);
                },
                cancel() {
                    runs.current++;
                    void engine.current?.then((e) => e?.cancel());
                },
            };
        }, []);

        useEffect(
            () => () => {
                runs.current++;

                const pending = engine.current;

                engine.current = null;
                void pending?.then((e) => e?.dispose());
            },
            []
        );

        return <div ref={host} className="fx-dice-layer fixed" aria-hidden />;
    }
);
