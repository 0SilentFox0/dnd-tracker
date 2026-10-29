import type { HelpArticleDef } from "@/lib/onboarding/types";

export const DM_ARTICLES: HelpArticleDef[] = [
  {
    slug: "dm-quickstart",
    audience: "dm",
    sections: [
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "list", count: 6 }, { kind: "p" }] },
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "p" }, { kind: "p" }] },
    ],
  },
  {
    slug: "dm-world",
    audience: "dm",
    sections: [
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "p" }, { kind: "p" }] },
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "list", count: 3 }] },
      { blocks: [{ kind: "p" }] },
    ],
  },
  {
    slug: "dm-units-balance",
    audience: "dm",
    sections: [
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "p" }, { kind: "p" }] },
      { blocks: [{ kind: "p" }] },
    ],
  },
  {
    slug: "dm-battle",
    audience: "dm",
    sections: [
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "list", count: 3 }, { kind: "p" }, { kind: "p" }] },
      { blocks: [{ kind: "p" }] },
    ],
  },
  {
    slug: "dm-scenario-show",
    audience: "dm",
    sections: [
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "p" }, { kind: "list", count: 3 }] },
    ],
  },
  {
    slug: "dm-ai",
    audience: "dm",
    sections: [
      { blocks: [{ kind: "p" }, { kind: "link", href: "/settings/ai" }] },
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "p" }] },
    ],
  },
  {
    slug: "dm-world-map",
    audience: "dm",
    sections: [
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "p" }, { kind: "p" }] },
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "p" }] },
    ],
  },
  {
    slug: "compendium-import",
    audience: "dm",
    sections: [
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "list", count: 4 }] },
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "p" }, { kind: "p" }] },
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "p" }, { kind: "list", count: 3 }, { kind: "p" }] },
      { blocks: [{ kind: "p" }, { kind: "list", count: 3 }] },
    ],
  },
  {
    slug: "dm-acquaintances",
    audience: "dm",
    sections: [
      { blocks: [{ kind: "p" }, { kind: "p" }] },
      { blocks: [{ kind: "p" }] },
      { blocks: [{ kind: "p" }] },
    ],
  },
];
