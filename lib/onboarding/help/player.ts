import type { HelpArticleDef } from "@/lib/onboarding/types";

export const PLAYER_ARTICLES: HelpArticleDef[] = [
  {
    slug: "player-quickstart",
    audience: "player",
    sections: [
      { blocks: [{ kind: "p" }, { kind: "link", href: "/campaigns" }] },
      { blocks: [{ kind: "p" }, { kind: "list", count: 3 }, { kind: "p" }] },
      { blocks: [{ kind: "p" }, { kind: "list", count: 5 }, { kind: "p" }] },
      { blocks: [{ kind: "p" }] },
    ],
  },
  {
    slug: "player-battle",
    audience: "player",
    sections: [
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "p" }, { kind: "list", count: 4 }] },
      { blocks: [{ kind: "p" }, { kind: "p" }] },
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "p" }] },
    ],
  },
  {
    slug: "player-world-map",
    audience: "player",
    sections: [
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "p" }] },
    ],
  },
  {
    slug: "player-acquaintances",
    audience: "player",
    sections: [
      { blocks: [{ kind: "p" }, { kind: "p" }] },
      { blocks: [{ kind: "p" }] },
    ],
  },
];
