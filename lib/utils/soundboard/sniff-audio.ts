export type SniffedAudio = 'mp3' | 'm4a' | 'webm';

const startsWith = (bytes: Uint8Array, sig: number[], offset = 0): boolean =>
    bytes.length >= offset + sig.length &&
    sig.every((b, i) => bytes[offset + i] === b);

export function sniffAudioFormat(bytes: Uint8Array): SniffedAudio | null {
    if (startsWith(bytes, [0x49, 0x44, 0x33])) return 'mp3';

    if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
        return 'mp3';

    if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4)) return 'm4a';

    if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return 'webm';

    return null;
}
