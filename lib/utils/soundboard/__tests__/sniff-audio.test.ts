import { describe, expect, it } from 'vitest';

import { sniffAudioFormat } from '../sniff-audio';

const bytes = (...b: number[]) => new Uint8Array(b);

describe('sniffAudioFormat', () => {
    it('detects mp3 by ID3 and frame sync', () => {
        expect(sniffAudioFormat(bytes(0x49, 0x44, 0x33, 4, 0))).toBe('mp3');
        expect(sniffAudioFormat(bytes(0xff, 0xfb, 0x90))).toBe('mp3');
    });

    it('detects m4a by the ftyp box', () => {
        expect(
            sniffAudioFormat(bytes(0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70))
        ).toBe('m4a');
    });

    it('detects webm by the EBML header', () => {
        expect(sniffAudioFormat(bytes(0x1a, 0x45, 0xdf, 0xa3))).toBe('webm');
    });

    it('returns null for html and empty input', () => {
        expect(sniffAudioFormat(new TextEncoder().encode('<html>'))).toBeNull();
        expect(sniffAudioFormat(bytes())).toBeNull();
    });
});
