'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { opsKeys } from './keys';

import { muteOpsAlert } from '@/lib/api/ops';
import type { OpsMuteMinutes } from '@/types/ops';

export function useMuteAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            rule,
            minutes,
        }: {
            rule: string;
            minutes: OpsMuteMinutes;
        }) => muteOpsAlert(rule, minutes),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: opsKeys.alerts() }),
    });
}
