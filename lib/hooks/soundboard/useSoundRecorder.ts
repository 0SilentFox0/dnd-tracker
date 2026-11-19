'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { MAX_SOUND_SECONDS } from '@/lib/constants/soundboard';

export type RecorderState = 'idle' | 'recording' | 'ready' | 'denied' | 'error';

const TICK_MS = 100;

export const isRecorderSupported = (): boolean =>
    typeof MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia;

const pickFormat = () =>
    MediaRecorder.isTypeSupported?.('audio/mp4')
        ? { mime: 'audio/mp4', type: 'audio/mp4', ext: 'm4a' }
        : { mime: 'audio/webm;codecs=opus', type: 'audio/webm', ext: 'webm' };

export function useSoundRecorder(): {
    supported: boolean;
    state: RecorderState;
    elapsedMs: number;
    start(): Promise<void>;
    stop(): void;
    result: File | null;
    reset(): void;
} {
    const [state, setState] = useState<RecorderState>('idle');

    const [elapsedMs, setElapsedMs] = useState(0);

    const [result, setResult] = useState<File | null>(null);

    const recorder = useRef<MediaRecorder | null>(null);

    const stream = useRef<MediaStream | null>(null);

    const timers = useRef<{ tick?: number; cap?: number }>({});

    const clearTimers = () => {
        window.clearInterval(timers.current.tick);
        window.clearTimeout(timers.current.cap);
        timers.current = {};
    };

    const releaseTracks = () => {
        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = null;
    };

    const stop = useCallback(() => {
        clearTimers();

        if (recorder.current?.state === 'recording') recorder.current.stop();
    }, []);

    const reset = useCallback(() => {
        clearTimers();

        if (recorder.current) {
            recorder.current.onstop = null;

            if (recorder.current.state === 'recording') recorder.current.stop();

            recorder.current = null;
        }

        releaseTracks();
        setResult(null);
        setElapsedMs(0);
        setState('idle');
    }, []);

    const start = useCallback(async () => {
        if (!isRecorderSupported()) return;

        let media: MediaStream;

        try {
            media = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error) {
            setState(
                error instanceof Error && error.name === 'NotAllowedError'
                    ? 'denied'
                    : 'error'
            );

            return;
        }

        const format = pickFormat();

        const chunks: Blob[] = [];

        try {
            const rec = new MediaRecorder(media, { mimeType: format.mime });

            rec.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            rec.onstop = () => {
                clearTimers();
                releaseTracks();
                setResult(
                    new File(chunks, `rec.${format.ext}`, { type: format.type })
                );
                setState('ready');
            };

            stream.current = media;
            recorder.current = rec;
            setResult(null);
            setElapsedMs(0);
            rec.start();
            setState('recording');

            const startedAt = Date.now();

            timers.current.tick = window.setInterval(
                () => setElapsedMs(Date.now() - startedAt),
                TICK_MS
            );
            timers.current.cap = window.setTimeout(
                stop,
                MAX_SOUND_SECONDS * 1000
            );
        } catch {
            media.getTracks().forEach((track) => track.stop());
            setState('error');
        }
    }, [stop]);

    useEffect(
        () => () => {
            window.clearInterval(timers.current.tick);
            window.clearTimeout(timers.current.cap);

            if (recorder.current) recorder.current.onstop = null;

            if (recorder.current?.state === 'recording')
                recorder.current.stop();

            releaseTracks();
        },
        []
    );

    return {
        supported: isRecorderSupported(),
        state,
        elapsedMs,
        start,
        stop,
        result,
        reset,
    };
}
