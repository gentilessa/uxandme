import { hireGiaKnowledge } from "./hireGiaKnowledge";
import type {
  EvidenceItem,
  ExploreItem,
  GuideResult,
  HireGiaMode,
  KnowledgeItem,
  RoleFit,
  RoleResult,
} from "./hireGiaTypes";

const OFF_TOPIC_PATTERNS = [
  "weather",
  "recipe",
  "crypto price",
  "sports score",
  "movie times",
  "horoscope",
];

const THEME_KEYWORDS: Record<string, string[]> = {
  ai: ["ai", "agent", "llm", "machine learning", "artificial intelligence"],
  enterprise: ["enterprise", "b2b", "saas", "platform", "internal tools"],
  systems: ["system", "systems", "architecture", "information architecture"],
  workflow: ["workflow", "operations", "process", "handoff", "journey"],
  research: ["research", "interviews", "testing", "discovery", "usability"],
  "service-design": ["service design", "service blueprint", "cx", "handoff"],
  "design-systems": ["design system", "component", "library", "tokens", "documentation"],
  "specialist-users": ["specialist", "technical users", "expert users", "complex domain"],
  strategy: ["strategy", "vision", "roadmap", "north star", "prioritisation"],
  "data-visualization": ["data visualisation", "data visualization", "charts", "dashboard", "insight"],
  "3d": ["3d", "viewer", "spatial"],
  leadership: ["lead", "leadership", "cross-functional", "stakeholder", "manager"],
  accessibility: ["accessibility", "a11y", "inclusive"],
};

function normalize(input: string) {
  return input.toLowerCase().trim();
}

function isOffTopic(input: string) {
  const value = normalize(input);
  return OFF_TOPIC_PATTERNS.some((pattern) => value.includes(pattern));
}

function scoreItem(input: string, item: KnowledgeItem) {
  const value = normalize(input);
  let score = 0;

  item.tags.forEach((tag) => {
    if (value.includes(tag.toLowerCase())) score += 4;
  });

  item.themes.forEach((theme) => {
    if (value.includes(theme.toLowerCase())) score += 5;
    const synonyms = THEME_KEYWORDS[theme] || [];
    synonyms.forEach((keyword) => {
      if (value.includes(keyword)) score += 3;
    });
  });

  if (value.includes(item.title.toLowerCase())) score += 6;
  if (value.includes(item.summary.toLowerCase())) score += 2;

  return score;
}

function topMatches(input: string, limit = 4) {
  return [...hireGiaKnowledge]
    .map((item) => ({ item, score: scoreItem(input, item) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}

function toEvidence(item: KnowledgeItem): EvidenceItem {
  return {
    title: item.title,
    url: item.url,
    description: item.summary,
  };
}

function toExplore(items: KnowledgeItem[]): ExploreItem[] {
  return items.slice(0, 3).map((item) => ({
    title: item.title,
    url: item.url,
  }));
}

function inferThemes(input: string, items: KnowledgeItem[]) {
  const value = normalize(input);
  const collected = new Set<string>();

  Object.entries(THEME_KEYWORDS).forEach(([theme, keywords]) => {
    if (keywords.some((keyword) => value.includes(keyword))) {
      collected.add(theme);
    }
  });

  items.forEach((item) => item.themes.forEach((theme) => collected.add(theme)));

  return [...collected]
    .map((theme) =>
      theme
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    )
    .slice(0, 5);
}

function fallbackGuideResult(): GuideResult {
  return {
    mode: "guide",
    title: "A narrower question will give you a better answer",
    intro:
      "I can help with Gia’s projects, writing, background, and design strengths, but I’m most useful when the question is specific to published portfolio work.",
    evidence: [
      toEvidence(hireGiaKnowledge.find((item) => item.id === "about")!),
      toEvidence(hireGiaKnowledge.find((item) => item.id === "exosphere")!),
    ],
    nextPages: [
      { title: "About Gia", url: "/about/" },
      { title: "Case studies", url: "/case-studies/" },
      { title: "Articles", url: "/articles/" },
    ],
    limits:
      "This assistant only draws from published portfolio content and won’t infer experience that is not visible on the site.",
  };
}

function fallbackRoleResult(): RoleResult {
  return {
    mode: "role",
    title: "Selective fit based on limited role detail",
    fitLabel: "Selective",
    intro:
      "There isn’t enough role-specific detail here to make a strong match. A pasted job description or clearer hiring brief will let me map the portfolio more usefully.",
    matchedThemes: ["Strategy", "Enterprise", "Complex Workflows"],
    evidence: [
      toEvidence(hireGiaKnowledge.find((item) => item.id === "about")!),
      toEvidence(hireGiaKnowledge.find((item) => item.id === "blocksync")!),
    ],
    gaps: ["The role requirements are too broad or underspecified to assess credibly."],
    nextPages: [
      { title: "About Gia", url: "/about/" },
      { title: "BlockSync", url: "/case-studies/blocksync/" },
    ],
    limits:
      "This fit assessment is intentionally cautious and only uses evidence from the published portfolio.",
  };
}

export function matchGuidePrompt(input: string): GuideResult {
  const value = normalize(input);
  if (!value || value.length < 8) return fallbackGuideResult();
  if (isOffTopic(value)) {
    return {
      ...fallbackGuideResult(),
      intro:
        "I can help with Gia’s projects, writing, background, and published design experience. I’m not a general-purpose assistant.",
    };
  }

  const matches = topMatches(value, 4);
  if (!matches.length) return fallbackGuideResult();

  const evidence = matches.slice(0, 3).map(toEvidence);
  const nextPages = toExplore(matches);

  return {
    mode: "guide",
    title: "Here’s the strongest published evidence I’d start with",
    intro: `The clearest direct evidence is in ${matches
      .slice(0, 2)
      .map((item) => item.title)
      .join(" and ")}. Those pages are the strongest starting point for this question.`,
    evidence,
    nextPages,
    limits:
      "Where the portfolio is less direct, the evidence should be treated as adjacent rather than definitive.",
  };
}

function fitLabelFor(matches: KnowledgeItem[], themes: string[]): RoleFit {
  const themeCount = themes.length;
  if (matches.length >= 3 && themeCount >= 3) return "Strong";
  if (matches.length >= 2 && themeCount >= 2) return "Moderate";
  return "Selective";
}

export function matchRolePrompt(input: string): RoleResult {
  const value = normalize(input);
  if (!value || value.length < 20) return fallbackRoleResult();
  if (isOffTopic(value)) {
    return {
      ...fallbackRoleResult(),
      intro:
        "This assistant is built for role briefs, product challenges, and questions about Gia’s published work. It won’t assess unrelated requests.",
    };
  }

  const matches = topMatches(value, 5);
  if (!matches.length) return fallbackRoleResult();

  const matchedThemes = inferThemes(value, matches);
  const fitLabel = fitLabelFor(matches, matchedThemes);
  const evidence = matches.slice(0, 3).map(toEvidence);
  const gaps: string[] = [];

  if (!value.includes("manager") && !value.includes("people management")) {
    // no-op, avoid inventing gaps
  } else {
    gaps.push(
      "The published portfolio shows design leadership and cross-functional influence, but less explicit evidence of large-scale people management."
    );
  }

  if (value.includes("accessibility")) {
    gaps.push(
      "Accessibility awareness may appear as adjacent practice here, but there is limited direct published evidence of accessibility-led delivery."
    );
  }

  return {
    mode: "role",
    title: "Evidence-backed fit assessment",
    fitLabel,
    intro: `Gia looks ${fitLabel.toLowerCase()}est where the role combines ${
      matchedThemes.slice(0, 2).join(" and ") || "complex product work"
    } with evidence-led design decision making.`,
    matchedThemes,
    evidence,
    gaps: gaps.length ? gaps : undefined,
    nextPages: toExplore(matches),
    limits:
      "This assessment only uses published portfolio content and is intentionally explicit about indirect evidence.",
  };
}

export function matchPrompt(mode: HireGiaMode, input: string) {
  return mode === "role" ? matchRolePrompt(input) : matchGuidePrompt(input);
}
