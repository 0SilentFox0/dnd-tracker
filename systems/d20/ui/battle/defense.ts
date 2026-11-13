import type { DefenseCtx } from '@/components/systems/types';
import { getEffectiveArmorClass } from '@/lib/utils/battle/participant/helpers';
import {
    formatKnownArmorClass,
    resolveKnownArmorClass,
} from '@/lib/utils/battle/view';
import type { BattleParticipant } from '@/types/battle';

export const d20Defense = (p: BattleParticipant, ctx: DefenseCtx): string =>
    ctx.exact
        ? String(getEffectiveArmorClass(p, ctx.order))
        : formatKnownArmorClass(
              resolveKnownArmorClass(ctx.log, p.basicInfo.id, ctx.knowledge)
          );
