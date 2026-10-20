import { describe, expect, it } from "vitest";

import { parseYoutubeId } from "../youtube-id";

describe("parseYoutubeId", () => {
  it.each([
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=42", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://music.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["  https://youtu.be/dQw4w9WgXcQ  ", "dQw4w9WgXcQ"],
  ])("%s → %s", (input, id) => {
    expect(parseYoutubeId(input)).toBe(id);
  });

  it.each(["dQw4w9WgXcQ", "https://vimeo.com/123", "https://youtu.be/short", "https://www.youtube.com/watch?v=", "javascript:alert(1)", "https://www.youtube.com/channel/UC123"])("%s → null", (input) => {
    expect(parseYoutubeId(input)).toBeNull();
  });
});
