export const FORBIDDEN_TERMS: readonly string[] = [
  "Warhammer", "Games Workshop", "Old World", "Empire", "Imperial", "Reikland", "Altdorf", "Middenheim", "Nuln", "Talabheim", "Marienburg", "Kislev", "Bretonnia", "Ostland", "Averland", "Stirland", "Wissenland", "Middenland", "Nordland", "Hochland", "Talabecland", "Ostermark", "Sylvania", "Athel Loren", "Ulthuan", "Karak",
  "Sigmar", "Sigmarite", "Ulric", "Ulrican", "Taal", "Rhya", "Manann", "Morr", "Myrmidia", "Shallya", "Ranald", "Verena", "Khaine", "Grungni", "Valaya", "Asuryan", "Morrslieb", "Mannslieb",
  "Chaos", "Nurgle", "Khorne", "Slaanesh", "Tzeentch", "Daemon", "Skaven", "Warpstone", "Ratcatcher", "Rat Catcher", "Witch Hunter", "Road Warden", "Roadwarden", "Riverwarden", "Bawd", "Pit Fighter", "Troll Slayer", "Giant Slayer", "Huffer", "Mudlark",
  "Reik", "Reikspiel", "Reiksguard", "Moot", "Mootland", "Khazalid", "Eltharin", "Dhar", "Ungor", "Gor", "Bestigor", "Snotling", "Squig", "Fimir", "Ubersreik", "Bögenhafen", "Averheim", "Winds of Magic", "Aqshy", "Azyr", "Chamon", "Ghur", "Ghyran", "Hysh", "Shyish", "Ulgu",
  "Beastman", "Beastmen", "Doombull", "Wargor", "Centigor", "Jabberslythe", "Cygor", "Ghorgon", "Razorgor", "Zoat", "Saurus", "Kroxigor", "Stegadon", "Clanrat", "Stormvermin", "Rat Ogre", "Plague Monk", "Gutter Runner", "Greenskin", "Night Goblin", "Black Orc", "Savage Orc", "Gnoblar", "Yhetee", "Rhinox", "Stonehorn", "Thundertusk", "Vargheist", "Varghulf", "Terrorgheist", "Crypt Ghoul", "Crypt Horror", "Grave Guard", "Blood Knight", "Necrarch", "Lahmia", "Lahmian", "Carstein", "Nehekhara", "Ushabti", "Liche Priest", "Bloodletter", "Plaguebearer", "Daemonette", "Flesh Hound", "Bloodthirster", "Great Unclean One", "Keeper of Secrets", "Lord of Change", "Mutalith", "Grobi", "Umgi", "Dawi", "Druchii", "Asur", "Asrai", "Waaagh", "Nagash", "Mannfred", "Ironjawz",
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SUFFIX = "(?:['\u2019]s|s['\u2019]?|e?rs?|ans?)?";

const PATTERNS = FORBIDDEN_TERMS.map((term) => ({ term, re: new RegExp(`(?<![\\p{L}\\p{N}])${term.split(/[\s-]+/).map(escape).join("[\\s-]+")}${SUFFIX}(?![\\p{L}\\p{N}])`, "iu") }));

/** Ordinary phrases that contain a short forbidden word ("moot point"); cut out before scanning. */
export const ALLOWED_PHRASES: readonly string[] = ["moot point", "moot question", "moot court"];

const ALLOWED = ALLOWED_PHRASES.map((p) => new RegExp(`(?<![\\p{L}\\p{N}])${p.split(/\s+/).map(escape).join("\\s+")}(?![\\p{L}\\p{N}])`, "giu"));

export const findForbiddenTerms = (text: string): string[] => {
  const clean = ALLOWED.reduce((s, re) => s.replace(re, " "), text);

  return PATTERNS.filter(({ re }) => re.test(clean)).map(({ term }) => term);
};
