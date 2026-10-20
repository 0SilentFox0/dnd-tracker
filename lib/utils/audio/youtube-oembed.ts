import { TRACK_TITLE_MAX } from "@/lib/constants/music";
import { safeFetchBuffer } from "@/lib/utils/api/safe-fetch";

const OEMBED_MAX_BYTES = 64 * 1024;

export async function fetchYoutubeTitle(youtubeId: string): Promise<string | null> {
  const watch = `https://www.youtube.com/watch?v=${youtubeId}`;

  try {
    const res = await safeFetchBuffer(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`, { maxBytes: OEMBED_MAX_BYTES });

    if (res.status !== 200) return null;

    const title = (JSON.parse(res.body.toString("utf8")) as { title?: unknown }).title;

    return typeof title === "string" && title.trim() ? title.trim().slice(0, TRACK_TITLE_MAX) : null;
  } catch {
    return null;
  }
}
