import type { BattleOpMutation } from '@/lib/hooks/battles';

export const isSystemActionPending = (
    mutation: Pick<BattleOpMutation<'system'>, 'isPending' | 'variables'>,
    action: string
): boolean => mutation.isPending && mutation.variables?.action === action;
