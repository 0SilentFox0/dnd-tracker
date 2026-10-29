import type { BackstoryTable } from "./backstory-table";

const origin: BackstoryTable["origin"] = [
  (c) => `${c.name} was born ${c.place}, to a poor family where no one ever dreamed of a great destiny.`,
  (c) => `${c.name} grew up ${c.place}, under an old mentor who taught how to read the omens of Ashan.`,
  (c) => `${c.name}'s childhood passed ${c.place}, among merchants, wanderers and rumours of war.`,
  (c) => `${c.name} came into the world ${c.place} at the height of the feuds, and peace became a rare luxury.`,
  (c) => `The house of ${c.name} ${c.place} was once honoured, until an old scandal ruined its good name.`,
];

const turn: BackstoryTable["turn"] = {
  warrior: [
    "When an enemy band burned his home village, he took up a sword and never let it go again.",
    "Years in the militia hardened him, and the first great battle changed his view of life for good.",
    "He saved his commander from certain death and earned the right to bear arms as a true warrior.",
    "After his company was routed, he swore never to retreat again.",
  ],
  paladin: [
    "A vision of the Light drew him away from a quiet life and into the service of righteousness.",
    "Rescued by a wandering knight, he devoted himself to protecting the weak.",
    "A desecrated shrine became his calling to take up shield and oath.",
    "When darkness fell on his land, only faith kept him standing, and he vowed to carry it onward.",
  ],
  ranger: [
    "Years of hunting in the deep forests taught him to hear what others cannot.",
    "His family's disappearance in the wilds drove him to learn tracking and pursuit.",
    "An old huntsman passed him a bow and the secrets of trails known to only a few.",
    "He became a caravan guide, until one day he saw what he was never meant to see.",
  ],
  rogue: [
    "Years on the streets taught him speed, silence and the art of vanishing into a crowd.",
    "A botched robbery brought him to a person who showed him the true craft of the shadows.",
    "He slipped out from under guard and has lived by his wits alone ever since.",
    "A secret letter fell into his hands and pulled him into a game far larger than himself.",
  ],
  mage: [
    "As a teenager he found an ancient scroll that awakened a longing for magic.",
    "Years in his teacher's library revealed forbidden knowledge and its price.",
    "A flash of magic during a thunderstorm showed that a gift slept in his blood.",
    "A failed ritual changed him forever, and now he seeks answers in ancient books.",
  ],
};

const drive = [
  "Now he sets out on the road to prove that even an ordinary person can change the course of history.",
  "He is driven by the need to find answers to questions that burn him from within.",
  "He seeks friends who can be trusted and enemies worthy of the fight.",
  "Every step brings him closer to a destiny he does not yet fully understand.",
];

const mainGoals = [
  "Stop the threat looming over his homeland.",
  "Win a glory that will be sung about in every kingdom.",
  "Find an ancient artifact that could change the fate of Ashan.",
  "Take revenge on those who destroyed his home.",
  "Unite the scattered companies before the great war.",
];

const personalGoals = [
  "Restore the good name of his family.",
  "Find a missing relative who has long been without word.",
  "Repay an old debt to an honest benefactor.",
  "Learn the truth about his origins.",
  "Find a place he can call home.",
];

export const BACKSTORY_EN: BackstoryTable = {
  origin,
  turn,
  drive,
  mainGoals,
  personalGoals,
  place: (raceName) => (raceName ? `among the ${raceName}` : "in distant lands"),
};
