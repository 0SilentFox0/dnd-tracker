import { HudPage, HudPanel } from '@/components/hud/page';

export default function Loading() {
    return (
        <HudPage>
            <HudPanel>
                <div className="h-14 animate-pulse rounded-lg bg-hud-panel-2 motion-reduce:animate-none" />
            </HudPanel>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
                {Array.from({ length: 3 }, (_, i) => (
                    <div
                        key={i}
                        className="ds-panel h-64 animate-pulse motion-reduce:animate-none"
                    />
                ))}
            </div>
        </HudPage>
    );
}
