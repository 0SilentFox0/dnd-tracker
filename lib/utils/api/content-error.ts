import type { ErrorParams } from '@/lib/constants/api-errors';

export class ContentError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly issues?: unknown,
        readonly params?: ErrorParams
    ) {
        super(message);
        this.name = 'ContentError';
    }
}
