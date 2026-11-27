import { LoadingState, type LoadingVariant } from './LoadingState';

import { HudPage } from '@/components/hud/page';

type PageWidth = Parameters<typeof HudPage>[0]['width'];

/** Route-level and system-gate skeleton: same container as the page, so the gate hands over to `loading.tsx` without a visible swap */
export function SectionLoading({
    label,
    variant = 'cards',
    width = 'page',
}: {
    label?: string;
    variant?: LoadingVariant;
    width?: PageWidth;
}) {
    return (
        <HudPage width={width} className="print:hidden">
            <LoadingState variant={variant} count={6} label={label} />
        </HudPage>
    );
}
