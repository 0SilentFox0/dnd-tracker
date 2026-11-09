export const FORBIDDEN_TERMS: readonly string[] = [
  "Warhammer", "Games Workshop", "Old World", "Empire", "Imperial", "Reikland", "Altdorf", "Middenheim", "Nuln", "Talabheim", "Marienburg", "Kislev", "Bretonnia", "Ostland", "Averland", "Stirland", "Wissenland", "Middenland", "Nordland", "Hochland", "Talabecland", "Ostermark", "Sylvania", "Athel Loren", "Ulthuan", "Karak",
  "Sigmar", "Sigmarite", "Ulric", "Ulrican", "Taal", "Rhya", "Manann", "Morr", "Myrmidia", "Shallya", "Ranald", "Verena", "Khaine", "Grungni", "Valaya", "Asuryan", "Morrslieb", "Mannslieb",
  "Chaos", "Nurgle", "Khorne", "Slaanesh", "Tzeentch", "Daemon", "Skaven", "Warpstone", "Ratcatcher", "Rat Catcher", "Witch Hunter", "Road Warden", "Roadwarden", "Riverwarden", "Bawd", "Pit Fighter", "Troll Slayer", "Giant Slayer", "Huffer", "Mudlark",
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const PATTERNS = FORBIDDEN_TERMS.map((term) => ({ term, re: new RegExp(`\\b${term.split(/\s+/).map(escape).join("\\s+")}\\b`, "i") }));

export const findForbiddenTerms = (text: string): string[] => PATTERNS.filter(({ re }) => re.test(text)).map(({ term }) => term);
