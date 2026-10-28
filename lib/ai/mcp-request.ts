import "server-only";
import { readLimitedBodyBytes } from "@/lib/utils/api/read-limited-body";

// Match the SDK's 4 MiB transport limit. mcp-handler preparses req.clone().json()
// and supplies parsedBody, which otherwise skips the SDK's bounded body reader.
const MAX_MCP_BODY_BYTES = 4 * 1024 * 1024;

const tooLarge = () => Response.json({
  jsonrpc: "2.0", error: { code: -32000, message: `Payload Too Large: Request body must not exceed ${MAX_MCP_BODY_BYTES} bytes` }, id: null,
}, { status: 413 });

/** Bound bytes before any JSON parse, including streams without Content-Length. */
export async function boundMcpRequest(req: Request): Promise<Request | Response> {
  if (req.method !== "POST") return req;

  const body = await readLimitedBodyBytes(req, MAX_MCP_BODY_BYTES);

  if (!body.ok) return tooLarge();

  if (!req.body) return req;

  // Preserve headers, signal and raw JSON semantics for the existing MCP handler.
  return new Request(req, { body: Buffer.from(body.bytes) });
}
