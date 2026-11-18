import { z } from 'zod';

import { isRecord } from '@/lib/utils/common/is-record';
import type { AiProposalOp } from '@/types/ai';

const storedOpsSchema = z
    .array(
        z.custom<AiProposalOp>(
            (v) => isRecord(v) && typeof v.op === 'string',
            'ai.proposal.op'
        )
    )
    .catch([]);

export const readProposalOps = (value: unknown): AiProposalOp[] =>
    storedOpsSchema.parse(value);
