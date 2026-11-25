'use client';

import { useMutation } from '@tanstack/react-query';

import { sendOpsTestNotify } from '@/lib/api/ops';

export function useTestNotify() {
    return useMutation({ mutationFn: sendOpsTestNotify });
}
