const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);

const PATH_KINDS = new Set(["shorts", "embed", "live"]);

function fromYoutubePath(url: URL): string | null {
  if (url.pathname === "/watch") return url.searchParams.get("v");

  const [, kind, id] = url.pathname.split("/");

  return PATH_KINDS.has(kind) ? (id ?? null) : null;
}

export function parseYoutubeId(input: string): string | null {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase();

  const candidate = host === "youtu.be" ? url.pathname.split("/")[1] : YOUTUBE_HOSTS.has(host) ? fromYoutubePath(url) : null;

  return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}
