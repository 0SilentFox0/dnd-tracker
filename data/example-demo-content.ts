import type { RichDoc, RichNode,ScenarioContent } from "@/types/scenario";

const doc = (...content: RichNode[]): RichDoc => ({ type: "doc", content: content.length ? content : [{ type: "paragraph" }] });

const p = (...content: RichNode[]): RichNode => ({ type: "paragraph", content });

const text = (value: string, ...marks: { type: "bold" | "italic" | "secret" }[]): RichNode => ({ type: "text", text: value, ...(marks.length && { marks }) });

const mention = (id: string, label: string): RichNode => ({ type: "mention", attrs: { type: "acquaintance", id, label } });

const callout = (kind: string, title: string, body: string): RichNode => ({ type: "callout", attrs: { kind, title }, content: [p(text(body))] });

export const DEMO_IDS = {
  campaign: "example-demo-5e",
  pages: { scene: "demo-bell-scene", notes: "demo-gm-notes" },
  sections: { village: "demo-village", puzzle: "demo-puzzle", grove: "demo-grove", finale: "demo-finale", dialogue: "demo-dialogue", rest: "demo-rest", secret: "demo-secret", prep: "demo-prep", notes: "demo-notes" },
  rows: { village: "demo-row-village", puzzle: "demo-row-puzzle", grove: "demo-row-grove", battle: "demo-row-battle", maze: "demo-row-maze" },
  battles: { grove: "demo-battle-grove", maze: "demo-battle-maze" },
  tracks: { ambience: "demo-track-ambience" },
  deck: "demo-deck-listening-grove",
  acquaintances: { mara: "demo-npc-mara", ivo: "demo-npc-ivo", tamsin: "demo-npc-tamsin" },
  characters: { scout: "demo-character-scout" },
  maps: { world: "demo-world-root", alderwake: "demo-map-alderwake", grove: "demo-map-grove", vault: "demo-map-vault" },
  markers: { village: "demo-marker-village", grove: "demo-marker-grove", zoneNorth: "demo-zone-north", zoneSouth: "demo-zone-south", vault: "demo-marker-vault" },
} as const;

export const DEMO_CAMPAIGN = {
  name: "Example Demo · The Bell Beneath Briarwood",
  description: "A read-only 5e adventure. Try the scenes, world map, music and two temporary encounters.",
  credits: "Adventure hook inspired by Divine Golem Expedition (https://www.worldanvil.com/w/one-shot-adventures-kefkejaco/a/divine-golem-expedition-article); original adventure text. Maps: global map sourced from https://vttrpgmanager.com/wp-content/uploads/2026/08/20240703_MAP-social-media-SMALL-dnd-village-map-2.jpg; Alderwake map sourced from https://i.pinimg.com/736x/7b/b9/06/7bb9061c0431c447c7f8f848f695a4ae.jpg; Listening Grove map sourced from https://i.redd.it/yb590r6t8ff81.jpg; Root Vault map sourced from https://www.worldanvil.com/uploads/maps/29c3383c7d2742232edc4ed0863ed57a.jpg; battle map sourced from https://i.redd.it/xe89fenv5orf1.jpeg. Music: Enchanted Forest by Celestial Aeon Project (https://www.youtube.com/watch?v=uHD_AnjCRtc); all rights reserved, linked stream only; source https://mattipaalanen.bandcamp.com/track/enchanted-forest.",
} as const;

export const DEMO_SCENE_CONTENT: ScenarioContent = {
  legend: [
    { kind: "read", label: "Read aloud", color: "#d8c99e" },
    { kind: "choice", label: "Player choice", color: "#7ca995" },
    { kind: "shadow", label: "GM secret", color: "#a85a4b" },
  ],
  sections: [
    {
      id: DEMO_IDS.sections.village, title: "A bell that cannot ring", played: false, icon: "scene", marker: { mapId: DEMO_IDS.maps.world, markerId: DEMO_IDS.markers.village }, reveal: { mode: "manual" },
      rows: [{ id: DEMO_IDS.rows.village, story: doc(
        { type: "readAloud", content: [p(text("Alderwake's mill wheel turns in a dry creek. Three empty bell ropes sway above the square."))] },
        { type: "image", attrs: { mediaId: "000000000000000000000001", src: "/example-demo/maps/alderwake.jpg", alt: "Map of Alderwake and the surrounding wood", caption: "Alderwake sits where the old creek enters Briarwood." } },
        p(text("Bellmaker Ivo Pell keeps a brass tuning pin in his apron. " ), mention(DEMO_IDS.acquaintances.ivo, "Ivo Pell"), text(" says the old tones name spring, branch, then stone.")),
        p(text("Courier Tamsin heard a fourth note from beyond the creek. " ), mention(DEMO_IDS.acquaintances.tamsin, "Tamsin Reed"), text(" points toward the listening grove.")),
        callout("choice", "Ask around", "Persuasion or a kind offer earns a map of the safe creek crossing."),
      ), notes: doc(p(text("Mara Venn vanished before dawn. Ivo's tuning pin can silence the Warden later.", { type: "secret" }))) }],
    },
    {
      id: DEMO_IDS.sections.puzzle, title: "The three listening bowls", played: false, icon: "choice", marker: { mapId: DEMO_IDS.maps.world, markerId: DEMO_IDS.markers.grove },
      rows: [{ id: DEMO_IDS.rows.puzzle, story: doc(
        p(text("Three bowls stand before a root-bound gate: a droplet, a leaf, and a mountain.")),
        { type: "bulletList", content: [{ type: "listItem", content: [p(text("Droplet: the spring's clear note"))] }, { type: "listItem", content: [p(text("Leaf: the branch's hollow note"))] }, { type: "listItem", content: [p(text("Mountain: the stone's low note"))] }] },
        callout("check", "Listen first", "A successful DC 12 Wisdom (Perception) check hears the intended sequence in the creek: droplet, leaf, mountain."),
        { type: "table", content: [{ type: "tableRow", content: [{ type: "tableHeader", content: [p(text("Symbol"))] }, { type: "tableHeader", content: [p(text("Clue"))] }] }, { type: "tableRow", content: [{ type: "tableCell", content: [p(text("Droplet"))] }, { type: "tableCell", content: [p(text("The spring comes first"))] }] }, { type: "tableRow", content: [{ type: "tableCell", content: [p(text("Leaf"))] }, { type: "tableCell", content: [p(text("The branch follows water"))] }] }] },
      ), notes: doc(callout("shadow", "No wrong answer hurts", "A wrong sequence chimes gently and makes the correct bowl glow for a heartbeat.")) }],
    },
    {
      id: DEMO_IDS.sections.grove, title: "The Warden stirs", played: false, icon: "battle", reveal: { mode: "afterSection", pageId: DEMO_IDS.pages.scene, sectionId: DEMO_IDS.sections.puzzle },
      rows: [{ id: DEMO_IDS.rows.battle, battleId: DEMO_IDS.battles.grove, slide: { deckId: DEMO_IDS.deck, slideId: "grove-slide" }, story: doc(
        p(text("The roots part. " ), mention(DEMO_IDS.acquaintances.mara, "Mara Venn"), text(" is bound inside a silver-glass clearing while the Briar Warden guards the broken fork.")),
        callout("event", "Combat or repair", "Run the prepared Briar Warden encounter, or offer Ivo's pin and call Mara by name."),
      ), notes: doc(p(text("A repaired fork makes a clear triad. A damaged one hums only the lowest note."))), marker: { mapId: DEMO_IDS.maps.world, markerId: DEMO_IDS.markers.grove } }],
    },
    {
      id: DEMO_IDS.sections.finale, title: "Through the root maze", played: false, icon: "journey", marker: { mapId: DEMO_IDS.maps.world, markerId: DEMO_IDS.markers.vault },
      rows: [{ id: DEMO_IDS.rows.maze, battleId: DEMO_IDS.battles.maze, story: doc(
        p(text("An echo repeats each footstep a second late. The center dais lies beyond the shifting corridors.")),
        { type: "orderedList", content: [{ type: "listItem", content: [p(text("Follow the echo that returns once."))] }, { type: "listItem", content: [p(text("Turn toward the colder stone."))] }, { type: "listItem", content: [p(text("Meet the Warden at the heart."))] }] },
        callout("choice", "Choose your approach", "The maze encounter can be fought, bypassed with the tone sequence, or negotiated with the names of the keepers."),
      ), notes: doc(p(text("The labyrinth mode keeps its own maze map and escape markers."))) }],
    },
    {
      id: DEMO_IDS.sections.dialogue, title: "Tamsin's lantern tale", played: false, icon: "dialogue",
      rows: [{ id: "demo-row-dialogue", story: doc(p(text("Tamsin explains how a lantern crossed the creek without making a reflection. She offers to guide the party to the grove."))), notes: doc(p(text("Let the players ask questions; this is a chance to make the route feel safe and lived in."))) }],
    },
    {
      id: DEMO_IDS.sections.rest, title: "A pause by Silver Creek", played: false, icon: "rest",
      rows: [{ id: "demo-row-rest", story: doc(p(text("A short rest beside the creek lets the party hear the three notes in the water."))), notes: doc(p(text("Use the pause to recap clues and invite plans before the final approach."))) }],
    },
    {
      id: DEMO_IDS.sections.secret, title: "Mara's hidden warning", played: false, icon: "secret",
      rows: [{ id: "demo-row-secret", story: doc(p(text("The silver moss grows toward the fork, not toward the Warden. The guardian is reacting to the broken instrument."))), notes: doc(p(text("Secret: Mara knows the Warden was built by the first bellmakers to protect the spring."))) }],
    },
    {
      id: DEMO_IDS.sections.prep, title: "Before the trail", played: false, icon: "prep",
      rows: [{ id: "demo-row-prep", story: doc(p(text("The party can stock up in Alderwake and choose whether to follow the creek or the marked north trail."))), notes: doc(p(text("Keep the opening flexible; let player choices determine whether the dialogue or puzzle scene comes first."))) }],
    },
  ],
};

export const DEMO_GM_NOTES: ScenarioContent = {
  legend: [], sections: [{ id: DEMO_IDS.sections.notes, title: "Running the one-shot", played: false, icon: "prep", rows: [
    { id: "demo-note-structure", story: doc(p(text("Aim for two hours. Let Alderwake establish the missing bell, use the grove puzzle to reward listening, and make the vault a brief climax."))), notes: doc() },
    { id: "demo-note-npcs", story: doc(p(text("Mara is observant and calm; Ivo is blunt but generous; Tamsin is eager to prove she can guide the party."))), notes: doc() },
    { id: "demo-note-outcomes", story: doc(p(text("The Warden can be defeated, repaired, or befriended. Any ending restores the spring and returns the bell's three notes."))), notes: doc() },
    { id: "demo-note-editor", story: doc(
      { type: "heading", content: [text("Editor examples")] },
      { type: "say", content: [text("The grove answers in three notes.", { type: "bold" }, { type: "italic" })] },
      p(text("Pause for the reply."), { type: "hardBreak" }, text("Then offer the players a choice.")),
      p(text("The keeper's mark: "), { type: "token", attrs: { color: "green" } }, text("a living leaf")),
      callout("artifact", "Tuning pin", "A small brass tool, carried by Ivo."),
      callout("token", "Keeper's mark", "The silver leaf token opens the gate."),
      callout("hero", "Mara's promise", "She will guide the party safely home."),
      callout("goal", "Restore the bell", "Repair the tuning fork or quiet the Warden."),
      callout("confide", "Secret", "Mara knows the Warden's name.")
    ), notes: doc(p(text("Secret: let a patient party meet the Warden without combat.", { type: "secret" }))) },
  ] }],
};
