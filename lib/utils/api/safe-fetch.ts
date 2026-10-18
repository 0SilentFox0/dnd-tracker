import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

export class SafeFetchError extends Error {}

const MAX_REDIRECTS = 3;

const TIMEOUT_MS = 10_000;

const blocked = new BlockList();

for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}

for (const [net, prefix] of [
  ["::", 96],
  ["::ffff:0:0:0", 96],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

function expandIPv6(ip: string): number[] | null {
  let s = ip;

  const v4 = s.match(/(\d+\.\d+\.\d+\.\d+)$/);

  if (v4) {
    const [a, b, c, d] = v4[1].split(".").map(Number);

    s = s.slice(0, -v4[1].length) + `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }

  const [head, tail, extra] = s.split("::");

  if (extra !== undefined) return null;

  const h = head ? head.split(":") : [];

  const t = tail ? tail.split(":") : [];

  const missing = 8 - h.length - t.length;

  if (tail === undefined ? missing !== 0 : missing < 1) return null;

  const groups = [...h, ...Array(tail === undefined ? 0 : missing).fill("0"), ...t].map((g) => parseInt(g, 16));

  return groups.length === 8 && groups.every((g) => g >= 0 && g <= 0xffff) ? groups : null;
}

function groupsToIPv4(hi: number, lo: number): string {
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
}

export function isPrivateIp(raw: string): boolean {
  const ip = raw.replace(/^\[|\]$/g, "").toLowerCase().split("%")[0];

  const family = isIP(ip);

  if (family === 4) return blocked.check(ip, "ipv4");

  if (family !== 6) return true;

  const g = expandIPv6(ip);

  if (!g) return true;

  const zeroPrefix = (n: number) => g.slice(0, n).every((x) => x === 0);

  if (zeroPrefix(5) && g[5] === 0xffff) return blocked.check(groupsToIPv4(g[6], g[7]), "ipv4");

  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return blocked.check(groupsToIPv4(g[6], g[7]), "ipv4");

  if (g[0] === 0x2002) return blocked.check(groupsToIPv4(g[1], g[2]), "ipv4");

  return blocked.check(g.map((x) => x.toString(16)).join(":"), "ipv6");
}

function withSignal<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return p;

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new Error("aborted"));

    if (signal.aborted) return onAbort();

    signal.addEventListener("abort", onAbort, { once: true });
    p.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

export async function assertPublicHttpsUrl(rawUrl: string, signal?: AbortSignal): Promise<URL> {
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
    addrs = await withSignal(lookup(host, { all: true }), signal);
  } catch {
    if (signal?.aborted) throw new SafeFetchError("Час очікування завантаження вичерпано");

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
      const url = await assertPublicHttpsUrl(current, controller.signal);

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
