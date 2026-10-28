export type LimitedBody = { ok: true; text: string } | { ok: false };

export async function readLimitedBodyBytes(req: Request, maxBytes: number): Promise<{ ok: true; bytes: Uint8Array } | { ok: false }> {
  if (Number(req.headers.get("content-length")) > maxBytes) {
    void req.body?.cancel().catch(() => {});

    return { ok: false };
  }

  const reader = req.body?.getReader();

  if (!reader) return { ok: true, bytes: new Uint8Array() };

  const chunks: Uint8Array[] = [];

  let size = 0;

  try {
    for (;;) {
      const { value, done } = await reader.read();

      if (done) break;

      size += value.byteLength;

      if (size > maxBytes) {
        void reader.cancel().catch(() => {});

        return { ok: false };
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return { ok: true, bytes: Buffer.concat(chunks, size) };
}

export async function readLimitedBody(req: Request, maxBytes: number): Promise<LimitedBody> {
  const body = await readLimitedBodyBytes(req, maxBytes);

  return body.ok ? { ok: true, text: new TextDecoder().decode(body.bytes) } : { ok: false };
}
