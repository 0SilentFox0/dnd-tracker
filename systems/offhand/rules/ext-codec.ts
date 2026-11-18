import { isRecord } from '@/lib/utils/common/is-record';
import { registerD20Ext } from '@/systems/d20/rules/state';

declare module '@/systems/d20/rules/state' {
    interface D20ParticipantState {
        attackedWithLight?: true;
    }
}

const flag = (raw: unknown): true | undefined =>
    raw === true ? true : undefined;

registerD20Ext({
    key: 'offhand',
    legacy: ['attackedWithLight'],
    read: (ext, raw) => {
        const own = isRecord(ext) ? ext : undefined;

        const attackedWithLight = own
            ? flag(own.attackedWithLight)
            : flag(raw.attackedWithLight);

        return attackedWithLight ? { attackedWithLight: true as const } : {};
    },
    write: (state) =>
        state.attackedWithLight ? { attackedWithLight: true } : undefined,
});
