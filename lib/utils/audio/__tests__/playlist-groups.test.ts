import { describe, expect, it } from "vitest";

import { BATTLE_TRACK_GROUP, filterTracks, groupTracks, joinTrackTitle, listGroupPrefixes, listTrackGroups, OTHER_TRACK_GROUP, splitTrackTitle, trackGroupLabelKey, trackGroupName, trackLabelInGroup } from "@/lib/utils/audio/playlist-groups";

const t = (title: string, kind: "file" | "youtube" = "youtube") => ({ title, kind });

const library = [t("Люди - Тема"), t("Ельфи - Місто"), t("Бій у таверні", "file"), t("Люди - Місто (бета-версія)"), t("Ельфи - Битва", "file"), t("Люди - Битва 1")];

describe("trackGroupName", () => {
  it("бере частину до « - », без роздільника — «Інше»", () => {
    expect(trackGroupName("Темні ельфи - Тема Шадвін та Ілайї")).toBe("Темні ельфи");
    expect(trackGroupName("Бій у таверні")).toBe(OTHER_TRACK_GROUP);
    expect(trackGroupName(" - Без раси")).toBe(OTHER_TRACK_GROUP);
    expect(trackGroupName("Битва-2")).toBe(OTHER_TRACK_GROUP);
  });

  it("усі «<раса> - Битва N» — група «Битва»; «Битвище» і інші треки раси — ні", () => {
    expect(trackGroupName("Люди - Битва")).toBe(BATTLE_TRACK_GROUP);
    expect(trackGroupName("Ельфи - Битва 2")).toBe(BATTLE_TRACK_GROUP);
    expect(trackGroupName("Нейтральні - Битва 3 (HoMM III)")).toBe(BATTLE_TRACK_GROUP);
    expect(trackGroupName("Люди - Битвище")).toBe("Люди");
    expect(trackGroupName("Люди - Облога після Битва")).toBe("Люди");
  });
});

describe("trackLabelInGroup", () => {
  it("без префікса групи; трек «Інше» і «Битва» — як є", () => {
    expect(trackLabelInGroup("Люди - Місто (бета-версія)")).toBe("Місто (бета-версія)");
    expect(trackLabelInGroup("Нейтральні - Місцевість: лава")).toBe("Місцевість: лава");
    expect(trackLabelInGroup("Бій у таверні")).toBe("Бій у таверні");
    expect(trackLabelInGroup("Люди - Битва 1")).toBe("Люди - Битва 1");
  });
});

describe("listTrackGroups / groupTracks", () => {
  it("порядок першої появи, «Інше» в кінці, треки груп у порядку бібліотеки", () => {
    expect(listTrackGroups(library)).toEqual(["Люди", "Ельфи", BATTLE_TRACK_GROUP, OTHER_TRACK_GROUP]);
    expect(groupTracks(library).map((g) => [g.name, g.tracks.map((x) => x.title)])).toEqual([
      ["Люди", ["Люди - Тема", "Люди - Місто (бета-версія)"]],
      ["Ельфи", ["Ельфи - Місто"]],
      [BATTLE_TRACK_GROUP, ["Ельфи - Битва", "Люди - Битва 1"]],
      [OTHER_TRACK_GROUP, ["Бій у таверні"]],
    ]);
  });
});

describe("filterTracks", () => {
  const none = { query: "", group: null, kind: null };

  it("без фільтрів — усі", () => {
    expect(filterTracks(library, none)).toHaveLength(6);
  });

  it("пошук без регістру, усі слова в будь-якому порядку", () => {
    expect(filterTracks(library, { ...none, query: "  битва  ЕЛЬФИ " }).map((x) => x.title)).toEqual(["Ельфи - Битва"]);
    expect(filterTracks(library, { ...none, query: "місто" })).toHaveLength(2);
  });

  it("група і тип звужують разом", () => {
    expect(filterTracks(library, { ...none, group: BATTLE_TRACK_GROUP, kind: "file" }).map((x) => x.title)).toEqual(["Ельфи - Битва"]);
    expect(filterTracks(library, { ...none, group: OTHER_TRACK_GROUP }).map((x) => x.title)).toEqual(["Бій у таверні"]);
  });
});

describe("splitTrackTitle / joinTrackTitle", () => {
  it("розбиває по першому « - » і збирає назад без втрат", () => {
    expect(splitTrackTitle("Люди - Битва 1")).toEqual({ group: "Люди", name: "Битва 1" });
    expect(splitTrackTitle("Бій у таверні")).toEqual({ group: "", name: "Бій у таверні" });
    expect(joinTrackTitle("Люди", "Битва 1")).toBe("Люди - Битва 1");
  });

  it("порожня група чи «Інше» — назва без префікса; порожня назва — порожньо", () => {
    expect(joinTrackTitle(" ", "Бій")).toBe("Бій");
    expect(joinTrackTitle(OTHER_TRACK_GROUP, "Бій")).toBe("Бій");
    expect(joinTrackTitle("Люди", " ")).toBe("");
  });

  it("підказки груп — унікальні префікси, включно з расами битв", () => {
    expect(listGroupPrefixes(library)).toEqual(["Люди", "Ельфи"]);
  });
});

describe("trackGroupLabelKey", () => {
  it("маркери «Інше» і «Битва» мають ключі, решта груп — ні", () => {
    expect(trackGroupLabelKey(OTHER_TRACK_GROUP)).toBe("music.groups.other");
    expect(trackGroupLabelKey(BATTLE_TRACK_GROUP)).toBe("music.groups.battle");
    expect(trackGroupLabelKey("Люди")).toBeNull();
  });
});
