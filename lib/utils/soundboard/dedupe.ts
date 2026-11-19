import { NONCE_LRU } from '@/lib/constants/soundboard';

export function createNonceGuard(size = NONCE_LRU): (nonce: string) => boolean {
    const seen = new Set<string>();

    return (nonce) => {
        if (seen.has(nonce)) return false;

        seen.add(nonce);

        if (seen.size > size) seen.delete(seen.values().next().value as string);

        return true;
    };
}
