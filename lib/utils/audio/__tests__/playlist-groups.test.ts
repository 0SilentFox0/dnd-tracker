import { describe, expect, it } from "vitest";

import { filterTracks, groupTracks, listTrackGroups, OTHER_TRACK_GROUP, trackGroupName, trackLabelInGroup } from "@/lib/utils/audio/playlist-groups";

const t = (title: string, kind: "file" | "youtube" = "youtube") => ({ title, kind });

const library = [t("Люди - Битва"), t("Ельфи - Місто"), t("Бій у таверні", "file"), t("Люди - Місто (бета-версія)"), t("Ельфи - Битва", "file")];

describe("trackGroupName", () => {
  it("бере частину до « - », без роздільника — «Інше»", () => {
    expect(trackGroupName("Темні ельфи - Тема Шадвін та Ілайї")).toBe("Темні ельфи");
    expect(trackGroupName("Бій у таверні")).toBe(OTHER_TRACK_GROUP);
    expect(trackGroupName(" - Без раси")).toBe(OTHER_TRACK_GROUP);
    expect(trackGroupName("Битва-2")).toBe(OTHER_TRACK_GROUP);
  });
});

describe("trackLabelInGroup", () => {
  it("без префікса групи; трек «Інше» — як є", () => {
    expect(trackLabelInGroup("Люди - Місто (бета-версія)")).toBe("Місто (бета-версія)");
    expect(trackLabelInGroup("Нейтральні - Місцевість: лава")).toBe("Місцевість: лава");
    expect(trackLabelInGroup("Бій у таверні")).toBe("Бій у таверні");
  });
});

describe("listTrackGroups / groupTracks", () => {
  it("порядок першої появи, «Інше» в кінці, треки груп у порядку бібліотеки", () => {
    expect(listTrackGroups(library)).toEqual(["Люди", "Ельфи", OTHER_TRACK_GROUP]);
    expect(groupTracks(library).map((g) => [g.name, g.tracks.map((x) => x.title)])).toEqual([
      ["Люди", ["Люди - Битва", "Люди - Місто (бета-версія)"]],
      ["Ельфи", ["Ельфи - Місто", "Ельфи - Битва"]],
      [OTHER_TRACK_GROUP, ["Бій у таверні"]],
    ]);
  });
});

describe("filterTracks", () => {
  const none = { query: "", group: null, kind: null };

  it("без фільтрів — усі", () => {
    expect(filterTracks(library, none)).toHaveLength(5);
  });

  it("пошук без регістру, усі слова в будь-якому порядку", () => {
    expect(filterTracks(library, { ...none, query: "  битва  ЕЛЬФИ " }).map((x) => x.title)).toEqual(["Ельфи - Битва"]);
    expect(filterTracks(library, { ...none, query: "місто" })).toHaveLength(2);
  });

  it("група і тип звужують разом", () => {
    expect(filterTracks(library, { ...none, group: "Ельфи", kind: "file" }).map((x) => x.title)).toEqual(["Ельфи - Битва"]);
    expect(filterTracks(library, { ...none, group: OTHER_TRACK_GROUP }).map((x) => x.title)).toEqual(["Бій у таверні"]);
  });
});
