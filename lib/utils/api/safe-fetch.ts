import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class SafeFetchError extends Error {}

const MAX_REDIRECTS = 3;

const TIMEOUT_MS = 10_000;

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

export function isPrivateIp(raw: string): boolean {
  const ip = raw.replace(/^\[|\]$/g, "").toLowerCase().split("%")[0];

  const family = isIP(ip);

  if (family === 4) return isPrivateIPv4(ip);

  if (family !== 6) return true;

  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);

  if (mapped) return isPrivateIPv4(mapped[1]);

  const hex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);

  if (hex) {
    const hi = parseInt(hex[1], 16);

    const lo = parseInt(hex[2], 16);

    return isPrivateIPv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }

  if (ip === "::" || ip === "::1") return true;

  const first = parseInt(ip.split(":")[0] || "0", 16);

  return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xff00) === 0xff00;
}

export async function assertPublicHttpsUrl(rawUrl: string): Promise<URL> {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new SafeFetchError("Невалідне посилання");
  }

  if (url.protocol !== "https:") {
    throw new SafeFetchError("Дозволені лише https-посилання");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new SafeFetchError("Посилання на внутрішню адресу заборонене");
  }

  if (isIP(host)) {
    if (isPrivateIp(host)) throw new SafeFetchError("Посилання на внутрішню адресу заборонене");

    return url;
  }

  let addrs: { address: string }[];

  try {
    addrs = await lookup(host, { all: true });
  } catch {
    throw new SafeFetchError("Не вдалося визначити адресу сервера");
  }

  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
    throw new SafeFetchError("Посилання на внутрішню адресу заборонене");
  }

  return url;
}

export type SafeFetchResult = { status: number; contentType: string | null; body: Buffer };

/** Fetch with https-only, public-host check on every hop, 10 s timeout and a streamed size cap. */
export async function safeFetchBuffer(
  rawUrl: string,
  opts: { maxBytes: number; headers?: Record<string, string> },
): Promise<SafeFetchResult> {
  const controller = new AbortController();

  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let current = rawUrl.trim();

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const url = await assertPublicHttpsUrl(current);

      const res = await fetch(url, { headers: opts.headers, redirect: "manual", signal: controller.signal });

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");

        await res.body?.cancel().catch(() => {});

        if (!loc) throw new SafeFetchError(`Не вдалося завантажити зображення (${res.status})`);

        current = new URL(loc, url).toString();

        continue;
      }

      if (!res.ok) {
        await res.body?.cancel().catch(() => {});

        return { status: res.status, contentType: null, body: Buffer.alloc(0) };
      }

      const len = res.headers.get("content-length");

      if (len && parseInt(len, 10) > opts.maxBytes) {
        await res.body?.cancel().catch(() => {});
        throw new SafeFetchError("Файл завеликий (макс. 5 МБ)");
      }

      const chunks: Uint8Array[] = [];

      let total = 0;

      if (res.body) {
        const reader = res.body.getReader();

        for (;;) {
          const { done, value } = await reader.read();

          if (done) break;

          total += value.length;

          if (total > opts.maxBytes) {
            await reader.cancel().catch(() => {});
            throw new SafeFetchError("Файл завеликий (макс. 5 МБ)");
          }

          chunks.push(value);
        }
      }

      return { status: res.status, contentType: res.headers.get("content-type"), body: Buffer.concat(chunks) };
    }

    throw new SafeFetchError("Забагато перенаправлень");
  } catch (e) {
    if (e instanceof SafeFetchError) throw e;

    if (controller.signal.aborted) throw new SafeFetchError("Час очікування завантаження вичерпано");

    throw new SafeFetchError("Не вдалося завантажити зображення");
  } finally {
    clearTimeout(timer);
  }
}

export function sniffImageMime(buf: Buffer): string | null {
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";

  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";

  if (buf.length >= 4 && buf.subarray(0, 4).toString("latin1") === "GIF8") return "image/gif";

  if (buf.length >= 12 && buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") {
    return "image/webp";
  }

  return null;
}
