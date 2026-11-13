'use client';

import { AiPanel, AiProposalCard } from '@/components/ai';
import { AssistantReview } from '@/components/ai/AssistantReview';
import type { AiThreadMode } from '@/lib/constants/ai';
import type { useAiProposals } from '@/lib/hooks/ai';
import type { AiFocus } from '@/types/ai';
import type { ScenarioPage } from '@/types/scenario';

type Props = {
    campaignId: string;
    mode: AiThreadMode;
    page: ScenarioPage;
    focus: { value: AiFocus | undefined; onClear: () => void };
    proposals: {
        data: ReturnType<typeof useAiProposals>;
        showPending: boolean;
    };
    onClose: () => void;
};

export function ScenarioAiPanel({
    campaignId,
    mode,
    page,
    focus,
    proposals,
    onClose,
}: Props) {
    const { data } = proposals;

    return (
        <AiPanel
            campaignId={campaignId}
            mode={mode}
            focus={{ value: focus.value, page, onClear: focus.onClear }}
            proposals={{
                data,
                showPending: proposals.showPending,
                review: <AssistantReview campaignId={campaignId} />,
                render: (id, { send }) => {
                    const proposal = data.byId(id);

                    if (!proposal) return null;

                    const onRedo = () =>
                        send?.(
                            `The proposal "${proposal.summary}" is outdated: re-read the page and propose it again.`
                        );

                    return (
                        <AiProposalCard
                            campaignId={campaignId}
                            proposal={proposal}
                            busy={data.isApplying}
                            actions={{
                                onApply: () => data.apply(id),
                                onReject: () => data.reject(id),
                                onRedo,
                            }}
                        />
                    );
                },
            }}
            actions={{ onClose }}
        />
    );
}
