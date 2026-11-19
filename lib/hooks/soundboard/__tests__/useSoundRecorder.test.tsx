// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSoundRecorder } from '../useSoundRecorder';

const track = { stop: vi.fn() };

class FakeRecorder {
    static isTypeSupported = vi.fn(() => false);

    static instances: FakeRecorder[] = [];

    state: 'inactive' | 'recording' = 'inactive';

    ondataavailable: ((e: { data: Blob }) => void) | null = null;

    onstop: (() => void) | null = null;

    stop = vi.fn(() => {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['x']) });
        this.onstop?.();
    });

    constructor(
        public stream: unknown,
        public options: { mimeType: string }
    ) {
        FakeRecorder.instances.push(this);
    }

    start() {
        this.state = 'recording';
    }
}

const getUserMedia = vi.fn();

beforeEach(() => {
    vi.useFakeTimers();
    track.stop.mockClear();
    FakeRecorder.instances = [];
    FakeRecorder.isTypeSupported.mockReturnValue(false);
    getUserMedia.mockResolvedValue({ getTracks: () => [track] });
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia },
        configurable: true,
    });
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('useSoundRecorder', () => {
    it('starts recording and exposes a webm file after stop', async () => {
        const { result } = renderHook(() => useSoundRecorder());

        expect(result.current.supported).toBe(true);

        await act(async () => {
            await result.current.start();
        });

        expect(result.current.state).toBe('recording');
        expect(FakeRecorder.instances[0].options.mimeType).toBe(
            'audio/webm;codecs=opus'
        );

        act(() => result.current.stop());

        expect(result.current.state).toBe('ready');
        expect(result.current.result?.name).toBe('rec.webm');
        expect(track.stop).toHaveBeenCalled();
    });

    it('prefers audio/mp4 when supported', async () => {
        FakeRecorder.isTypeSupported.mockReturnValue(true);

        const { result } = renderHook(() => useSoundRecorder());

        await act(async () => {
            await result.current.start();
        });
        act(() => result.current.stop());

        expect(result.current.result?.name).toBe('rec.m4a');
        expect(result.current.result?.type).toBe('audio/mp4');
    });

    it('auto-stops after the maximum duration', async () => {
        const { result } = renderHook(() => useSoundRecorder());

        await act(async () => {
            await result.current.start();
        });
        act(() => {
            vi.advanceTimersByTime(10_000);
        });

        expect(FakeRecorder.instances[0].stop).toHaveBeenCalled();
        expect(result.current.state).toBe('ready');
    });

    it('reports denied when the permission is refused', async () => {
        getUserMedia.mockRejectedValue(
            Object.assign(new Error('no'), { name: 'NotAllowedError' })
        );

        const { result } = renderHook(() => useSoundRecorder());

        await act(async () => {
            await result.current.start();
        });

        expect(result.current.state).toBe('denied');
    });

    it('stops the tracks on reset', async () => {
        const { result } = renderHook(() => useSoundRecorder());

        await act(async () => {
            await result.current.start();
        });
        act(() => result.current.reset());

        expect(track.stop).toHaveBeenCalled();
        expect(result.current.state).toBe('idle');
        expect(result.current.result).toBeNull();
    });

    it('is unsupported without MediaRecorder', () => {
        vi.stubGlobal('MediaRecorder', undefined);

        const { result } = renderHook(() => useSoundRecorder());

        expect(result.current.supported).toBe(false);
    });
});
