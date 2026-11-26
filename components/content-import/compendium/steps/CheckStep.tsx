'use client';
import { RulesPatchOffer } from '../../shared/RulesPatchOffer';
import { CompendiumDependencies } from '../CompendiumDependencies';
import { CompendiumReport } from '../report/CompendiumReport';

import { HudPanel } from '@/components/hud/page';
import type { CompendiumImportController } from '@/lib/hooks/compendium-import';

export function CheckStep({
    wizard,
    campaignId,
}: {
    wizard: CompendiumImportController;
    campaignId: string;
}) {
    const { preview, busy, options } = wizard.state;

    const { applyOptions } = wizard.actions;

    if (!preview) return null;

    const unresolved = preview.graph.some((row) =>
        row.refs.some((ref) => ref.unresolved)
    );

    return (
        <HudPanel className="space-y-3">
            <RulesPatchOffer wizard={wizard} />
            <CompendiumReport
                campaignId={campaignId}
                report={preview.report}
                initialTab={unresolved ? 'deps' : undefined}
                dependencies={{
                    count: preview.graph.length,
                    node: (
                        <CompendiumDependencies
                            key={preview.token}
                            wizard={wizard}
                        />
                    ),
                }}
                blockerActions={{
                    busy,
                    allowMixedEdition: options.allowMixedEdition
                        ? undefined
                        : () =>
                              applyOptions({
                                  ...options,
                                  allowMixedEdition: true,
                              }),
                }}
            />
        </HudPanel>
    );
}
