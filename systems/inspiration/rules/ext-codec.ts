import { isRecord } from '@/lib/utils/common/is-record';
import { registerD20Ext } from '@/systems/d20/rules/state';

declare module '@/systems/d20/rules/state' {
    interface D20ParticipantState {
        inspiration?: true;
        inspirationSpent?: true;
    }
}

const flag = (raw: unknown): true | undefined =>
    raw === true ? true : undefined;

registerD20Ext({
    key: 'inspiration',
    legacy: ['inspiration', 'inspirationSpent'],
    read: (ext, raw) => {
        const own = isRecord(ext) ? ext : undefined;

        const available = own ? flag(own.available) : flag(raw.inspiration);

        const spent = own ? flag(own.spent) : flag(raw.inspirationSpent);

        return {
            ...(available && { inspiration: true as const }),
            ...(spent && { inspirationSpent: true as const }),
        };
    },
    write: (state) =>
        state.inspiration || state.inspirationSpent
            ? {
                  ...(state.inspiration && { available: true }),
                  ...(state.inspirationSpent && { spent: true }),
              }
            : undefined,
});
