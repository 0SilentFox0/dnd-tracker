import type { ReactNode } from 'react';

import { useMechanicText } from './mechanic-text';

import { HudSection } from '@/components/hud/form';
import type { MECHANIC_REGISTRY } from '@/lib/utils/rules';

export function RulesSection({
    mechanic,
    children,
}: {
    mechanic: keyof typeof MECHANIC_REGISTRY;
    children: ReactNode;
}) {
    const text = useMechanicText();

    return (
        <HudSection title={text(mechanic, 'label')}>
            <p className="mb-3 text-sm text-hud-muted">
                {text(mechanic, 'description')}
            </p>
            <div className="space-y-4">{children}</div>
        </HudSection>
    );
}
