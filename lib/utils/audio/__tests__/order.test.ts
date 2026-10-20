import { describe, expect, it } from "vitest";

import { moveTrack, moveTrackInGroup } from "../order";

describe("moveTrack", () => {
  it("міняє місцями з сусідом; за межами — той самий масив", () => {
    const ids = ["a", "b", "c"];

    expect(moveTrack(ids, 0, 1)).toEqual(["b", "a", "c"]);
    expect(moveTrack(ids, 2, -1)).toEqual(["a", "c", "b"]);
    expect(moveTrack(ids, 0, -1)).toBe(ids);
    expect(moveTrack(ids, 2, 1)).toBe(ids);
  });
});

describe("moveTrackInGroup", () => {
  const tracks = [
    { id: "a", title: "Люди - Тема" },
    { id: "b", title: "Ельфи - Місто" },
    { id: "c", title: "Люди - Битва 1" },
    { id: "d", title: "Ельфи - Битва" },
    { id: "e", title: "Люди - Місто" },
  ];

  it("міняє з найближчим сусідом тієї ж групи, минаючи чужі", () => {
    expect(moveTrackInGroup(tracks, "a", 1)).toEqual(["e", "b", "c", "d", "a"]);
    expect(moveTrackInGroup(tracks, "e", -1)).toEqual(["e", "b", "c", "d", "a"]);
    expect(moveTrackInGroup(tracks, "d", -1)).toEqual(["a", "b", "d", "c", "e"]);
  });

  it("без сусіда в групі чи для невідомого id — null", () => {
    expect(moveTrackInGroup(tracks, "a", -1)).toBeNull();
    expect(moveTrackInGroup(tracks, "b", 1)).toBeNull();
    expect(moveTrackInGroup(tracks, "zzz", 1)).toBeNull();
  });
});
