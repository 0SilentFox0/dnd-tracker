export async function decodeDurationMs(file: Blob | string): Promise<number> {
    const bytes =
        typeof file === 'string'
            ? await (await fetch(file)).arrayBuffer()
            : await file.arrayBuffer();

    const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;

    if (!Ctor) throw new Error('AudioContext unavailable');

    const ctx = new Ctor();

    try {
        const buffer = await ctx.decodeAudioData(bytes);

        return Math.round(buffer.duration * 1000);
    } finally {
        void ctx.close().catch(() => {});
    }
}
