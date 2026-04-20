import type { KnowledgeItem } from "./hireGiaTypes";

export const hireGiaKnowledge: KnowledgeItem[] = [
  {
    id: "about",
    type: "page",
    title: "About Gia",
    url: "/about/",
    summary:
      "Background across enterprise SaaS, specialist platforms, AI-assisted workflows, and technically dense systems.",
    tags: ["about", "background", "leadership", "enterprise", "systems", "ai"],
    themes: ["enterprise", "systems", "leadership", "ai", "strategy"],
  },
  {
    id: "exosphere",
    type: "case-study",
    title: "Exosphere",
    url: "/case-studies/exosphere/",
    summary:
      "Turning fragmented exploration data into actionable targeting workflows.",
    tags: ["ai targeting", "workflow", "geoscience", "decision support"],
    themes: ["ai", "workflow", "data-visualization", "specialist-users", "strategy"],
  },
  {
    id: "central-viewer",
    type: "case-study",
    title: "Central Viewer",
    url: "/case-studies/central-viewer/",
    summary:
      "A cloud-first 3D viewer that made geological collaboration easier and faster.",
    tags: ["3d", "viewer", "collaboration", "geoscience"],
    themes: ["3d", "specialist-users", "workflow", "enterprise"],
  },
  {
    id: "blocksync",
    type: "case-study",
    title: "BlockSync",
    url: "/case-studies/blocksync/",
    summary:
      "Turning spreadsheet-heavy grade control into a cloud-native system of record.",
    tags: ["enterprise", "workflow", "operations", "mining"],
    themes: ["enterprise", "workflow", "systems", "service-design", "specialist-users"],
  },
  {
    id: "assure-plus",
    type: "case-study",
    title: "Assure+",
    url: "/case-studies/assure-plus/",
    summary:
      "A unified design system across field, admin, and public-facing experiences.",
    tags: ["design systems", "cross-platform", "components", "consistency"],
    themes: ["design-systems", "enterprise", "systems", "workflow"],
  },
  {
    id: "tradewindow",
    type: "case-study",
    title: "Cube",
    url: "/case-studies/tradewindow/",
    summary:
      "Designing for the messy handoffs, dependencies, and onboarding paths of global trade.",
    tags: ["trade", "saas", "onboarding", "workflow", "operations"],
    themes: ["workflow", "enterprise", "service-design", "systems", "research"],
  },
  {
    id: "breedlogic",
    type: "case-study",
    title: "BreedLogic",
    url: "/case-studies/breedlogic/",
    summary:
      "Designing AI-assisted mate selection for cattle breeders and decision support.",
    tags: ["ai", "decision support", "genetics", "comparison"],
    themes: ["ai", "specialist-users", "data-visualization", "workflow"],
  },
  {
    id: "evo",
    type: "case-study",
    title: "Evo",
    url: "/case-studies/evo/",
    summary:
      "Foundational platform strategy for a next-generation geoscience ecosystem.",
    tags: ["platform strategy", "research", "ecosystem", "geoscience"],
    themes: ["strategy", "research", "systems", "enterprise"],
  },
  {
    id: "crm",
    type: "case-study",
    title: "CRM lead management",
    url: "/case-studies/crm-lead-management/",
    summary:
      "Using UX research and service design to reshape how leads were captured, qualified, and measured globally.",
    tags: ["crm", "service design", "workflow", "salesforce", "global"],
    themes: ["service-design", "research", "workflow", "enterprise", "strategy"],
  },
  {
    id: "north-star",
    type: "case-study",
    title: "North Star constellation",
    url: "/case-studies/north-star/",
    summary:
      "Aligning product, marketing, sales, and customer success around more meaningful customer journey metrics.",
    tags: ["cx strategy", "metrics", "journey", "alignment"],
    themes: ["strategy", "service-design", "research", "enterprise"],
  },
  {
    id: "article-systems",
    type: "article",
    title: "What design systems actually enable",
    url: "/articles/what-design-systems-actually-enable/",
    summary:
      "Essay on design systems as product infrastructure and collaboration tools.",
    tags: ["design systems", "components", "documentation", "infrastructure"],
    themes: ["design-systems", "systems", "strategy"],
  },
  {
    id: "article-specialist",
    type: "article",
    title: "Designing for specialist users",
    url: "/articles/designing-for-specialist-users/",
    summary:
      "Specialist products demand respect for domain depth, confidence, and real working context.",
    tags: ["specialist users", "complexity", "domain expertise"],
    themes: ["specialist-users", "research", "workflow"],
  },
  {
    id: "article-ai-helps",
    type: "article",
    title: "Where AI actually helps product teams",
    url: "/articles/where-ai-actually-helps-product-teams/",
    summary:
      "A practical view of where AI strengthens product work and where it does not.",
    tags: ["ai", "product thinking", "workflow"],
    themes: ["ai", "strategy", "workflow"],
  },
  {
    id: "article-ai-thinking",
    type: "article",
    title: "AI doesn’t fix bad product thinking",
    url: "/articles/ai-doesnt-fix-bad-product-thinking/",
    summary:
      "AI can accelerate workflows, but it does not rescue weak strategy or shallow UX.",
    tags: ["ai", "strategy", "product thinking"],
    themes: ["ai", "strategy", "systems"],
  },
  {
    id: "article-ia",
    type: "article",
    title: "Information architecture is how complex products stay usable",
    url: "/articles/information-architecture-is-how-complex-products-stay-usable/",
    summary:
      "Information architecture shapes comprehension, trust, and how users move through complex products.",
    tags: ["information architecture", "complex systems", "navigation"],
    themes: ["systems", "workflow", "strategy", "specialist-users"],
  },
  {
    id: "article-agile",
    type: "article",
    title: "Agile and UX do not clash nearly as much as bad planning does",
    url: "/articles/agile-and-ux-do-not-clash-nearly-as-much-as-bad-planning-does/",
    summary:
      "The real tension is often weak planning, unclear ownership, and design arriving too late.",
    tags: ["agile", "delivery", "collaboration"],
    themes: ["leadership", "strategy", "workflow"],
  },
  {
    id: "article-prototypes",
    type: "article",
    title: "Prototypes are not polish, they are thinking tools",
    url: "/articles/prototypes-are-not-polish-they-are-thinking-tools/",
    summary:
      "Prototypes help teams think, test, and reduce risk before committing to detail.",
    tags: ["prototyping", "testing", "ux methods"],
    themes: ["research", "workflow", "strategy"],
  },
  {
    id: "article-surveys",
    type: "article",
    title: "Surveys won’t tell you where the product is breaking",
    url: "/articles/surveys-wont-tell-you-where-the-product-is-breaking/",
    summary:
      "Research quality depends on using the right method for the question, not defaulting to broad surveys.",
    tags: ["research", "surveys", "interviews"],
    themes: ["research", "strategy", "specialist-users"],
  },
];
