import { resolveOpportunityAttacks } from './opportunity';

import type { MoveHook } from '@/lib/utils/rules/systems/types';

export const opportunityOnMove: MoveHook = (input) =>
    input.rules.actions.opportunityAttacks
        ? resolveOpportunityAttacks({
              ...input,
              moverId: input.mover.basicInfo.id,
          })
        : null;
