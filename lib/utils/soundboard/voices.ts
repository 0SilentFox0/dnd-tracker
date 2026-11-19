import { MAX_VOICES } from '@/lib/constants/soundboard';

export function createVoicePool(max = MAX_VOICES) {
    const voices: Array<() => void> = [];

    return {
        add(stop: () => void): () => void {
            voices.push(stop);

            if (voices.length > max) voices.shift()?.();

            return () => {
                const i = voices.indexOf(stop);

                if (i >= 0) voices.splice(i, 1);
            };
        },
    };
}
