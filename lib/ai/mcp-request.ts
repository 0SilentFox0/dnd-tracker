import "server-only";

// Match the SDK's 4 MiB transport limit. mcp-handler preparses req.clone().json()
// and supplies parsedBody, which otherwise skips the SDK's bounded body reader.
const MAX_MCP_BODY_BYTES = 4 * 1024 * 1024;

const tooLarge = () => Response.json({
  jsonrpc: "2.0", error: { code: -32000, message: `Payload Too Large: Request body must not exceed ${MAX_MCP_BODY_BYTES} bytes` }, id: null,
}, { status: 413 });

/** Bound bytes before any JSON parse, including streams without Content-Length. */
export async function boundMcpRequest(req: Request): Promise<Request | Response> {
  if (req.method !== "POST") return req;

  if (Number(req.headers.get("content-length")) > MAX_MCP_BODY_BYTES) {
    void req.body?.cancel().catch(() => {});

    return tooLarge();
  }

  const reader = req.body?.getReader();

  if (!reader) return req;

  const chunks: Uint8Array[] = [];

  let bytes = 0;

  try {
    for (;;) {
      const { value, done } = await reader.read();

      if (done) break;

      bytes += value.byteLength;

      if (bytes > MAX_MCP_BODY_BYTES) {
        void reader.cancel().catch(() => {});

        return tooLarge();
      }

      chunks.push(value);
    }
  } finally { reader.releaseLock(); }

  // Preserve headers, signal and raw JSON semantics for the existing MCP handler.
  return new Request(req, { body: Buffer.concat(chunks, bytes) });
}
