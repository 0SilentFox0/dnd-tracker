import { clockOffsetFromDate } from '@/lib/utils/audio/clock';

export async function withClock<T extends object>(
    run: (onResponse: (r: Response) => void) => Promise<T>
): Promise<T & { clockOffsetMs: number | null }> {
    const sentAt = Date.now();

    let date: string | null = null;

    const body = await run((r) => {
        date = r.headers.get('date');
    });

    return {
        ...body,
        clockOffsetMs: clockOffsetFromDate(date, sentAt, Date.now()),
    };
}
