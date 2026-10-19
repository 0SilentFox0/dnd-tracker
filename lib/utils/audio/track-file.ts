import { API_ERRORS } from "@/lib/constants/api-errors";
import { MAX_TRACK_BYTES, TRACK_FORMATS } from "@/lib/constants/music";

export type TrackFormat = keyof typeof TRACK_FORMATS;

const BY_MIME: Record<string, TrackFormat> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
};

// Safari/Windows інколи не дають MIME для .m4a — тоді вирішує розширення
const UNTYPED = new Set(["", "application/octet-stream"]);

export function detectTrackFormat(file: { name: string; type: string }): TrackFormat | null {
  const type = file.type.toLowerCase();

  if (BY_MIME[type]) return BY_MIME[type];

  if (!UNTYPED.has(type)) return null;

  const ext = file.name.toLowerCase().split(".").pop();

  return ext === "mp3" || ext === "m4a" ? ext : null;
}

export function validateTrackFile(file: { name: string; type: string; size: number }): { ok: true; format: TrackFormat } | { ok: false; message: string } {
  const format = detectTrackFormat(file);

  if (!format || file.size <= 0 || file.size > MAX_TRACK_BYTES) return { ok: false, message: API_ERRORS.TRACK_FILE_INVALID };

  return { ok: true, format };
}
