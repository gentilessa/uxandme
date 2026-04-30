import { hireGiaKnowledge } from "./hireGiaKnowledge";
import { hireGiaPageContent } from "./hireGiaPageContent";
import { getTaxonomyEntry } from "@/lib/taxonomy";
import type {
  EvidenceCard,
  GuideResult,
  HireGiaMode,
  FitAxis,
  FitSnapshot,
  IntentSnapshot,
  KnowledgeItem,
  MatchedTheme,
  NextPage,
  PageContentItem,
  RoleResult,
  SnapshotAxisId,
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
  genetics: ["genetics", "genetic", "breeding", "breed", "cattle", "mate selection"],
};

const THEME_REASON_MAP: Record<string, string> = {
  ai: "AI-assisted workflows and decision-support thinking show up meaningfully in the published work.",
  enterprise: "Much of the portfolio sits in complex SaaS and enterprise-style product environments.",
  systems: "There is a clear through-line of systems thinking across multiple projects.",
  workflow: "Workflow clarity and operational complexity show up repeatedly in the work.",
  research: "Research, discovery, and evidence-led design appear consistently across the portfolio.",
  "service-design": "The work often connects product decisions to broader service and organisational flow.",
  "design-systems": "Design systems and structured product consistency are visible themes in the portfolio.",
  "specialist-users": "A lot of the work is for expert users in technically dense or specialist domains.",
  strategy: "The portfolio shows strong product framing and strategic design thinking.",
  "data-visualization": "Data-heavy interfaces and decision-support surfaces appear in several projects.",
  "3d": "Spatial and 3D workflows are a distinctive part of the published work.",
  leadership: "There is clear evidence of design leadership, cross-functional influence, and direction-setting.",
  accessibility: "Accessibility appears more as good practice than as a standalone portfolio theme.",
  genetics: "The genetics and breeding work shows Gia’s ability to translate specialist models into usable tools.",
};

const FIT_AXES = [
  {
    key: "ai",
    label: "AI relevance",
    themes: ["ai"],
    keywords: THEME_KEYWORDS.ai,
  },
  {
    key: "workflow",
    label: "Workflow complexity",
    themes: ["workflow", "service-design"],
    keywords: [...THEME_KEYWORDS.workflow, ...THEME_KEYWORDS["service-design"]],
  },
  {
    key: "systems",
    label: "Systems thinking",
    themes: ["systems", "design-systems", "3d"],
    keywords: [
      ...THEME_KEYWORDS.systems,
      ...THEME_KEYWORDS["design-systems"],
      ...THEME_KEYWORDS["3d"],
    ],
  },
  {
    key: "specialist",
    label: "Specialist domain fluency",
    themes: ["specialist-users", "genetics", "data-visualization"],
    keywords: [
      ...THEME_KEYWORDS["specialist-users"],
      ...THEME_KEYWORDS.genetics,
      ...THEME_KEYWORDS["data-visualization"],
    ],
  },
  {
    key: "strategy",
    label: "Product strategy",
    themes: ["strategy", "leadership"],
    keywords: [...THEME_KEYWORDS.strategy, ...THEME_KEYWORDS.leadership],
  },
  {
    key: "leadership",
    label: "Leadership & teamwork",
    themes: ["leadership", "strategy"],
    keywords: [
      ...THEME_KEYWORDS.leadership,
      "collaboration",
      "teamwork",
      "cross functional",
      "cross-functional",
      "stakeholder",
      "partnership",
    ],
  },
  {
    key: "craft",
    label: "UI craft",
    themes: ["design-systems", "accessibility", "data-visualization"],
    keywords: [
      ...THEME_KEYWORDS["design-systems"],
      ...THEME_KEYWORDS.accessibility,
      ...THEME_KEYWORDS["data-visualization"],
    ],
  },
  {
    key: "research",
    label: "Research depth",
    themes: ["research", "accessibility"],
    keywords: [...THEME_KEYWORDS.research, ...THEME_KEYWORDS.accessibility],
  },
] as const;

const SNAPSHOT_AXES: Array<{
  id: SnapshotAxisId;
  label: string;
  keywords: string[];
}> = [
  {
    id: "ai_relevance",
    label: "AI relevance",
    keywords: ["ai", "agent", "agents", "llm", "llms", "ml", "machine learning", "automation", "copilot", "assistant"],
  },
  {
    id: "workflow_complexity",
    label: "Workflow complexity",
    keywords: ["workflow", "workflows", "operations", "process", "processes", "handoff", "handoffs", "journey", "orchestration", "multi-step"],
  },
  {
    id: "systems_thinking",
    label: "Systems thinking",
    keywords: ["system", "systems", "architecture", "architectural", "platform", "ecosystem", "information architecture", "service design"],
  },
  {
    id: "research_depth",
    label: "Research depth",
    keywords: ["research", "discovery", "interviews", "interview", "testing", "usability", "insight", "analysis", "synthesis"],
  },
  {
    id: "product_strategy",
    label: "Product strategy",
    keywords: ["strategy", "strategic", "product strategy", "roadmap", "vision", "prioritisation", "prioritization", "north star", "outcomes"],
  },
  {
    id: "leadership",
    label: "Leadership",
    keywords: ["lead", "leadership", "principal", "manager", "stakeholder", "stakeholders", "cross-functional", "cross functional", "mentor", "mentoring"],
  },
  {
    id: "ui_craft",
    label: "UI craft",
    keywords: ["ui", "visual design", "interaction design", "design system", "component", "components", "craft", "polish", "accessibility"],
  },
  {
    id: "domain_fluency",
    label: "Domain fluency",
    keywords: ["domain", "technical domain", "specialist", "specialized", "specialised", "industry", "health", "finance", "geoscience", "genetics", "b2b", "enterprise"],
  },
] as const;

const BASELINE_SCORES: Record<SnapshotAxisId, number> = {
  ai_relevance: 0.82,
  workflow_complexity: 0.92,
  systems_thinking: 0.9,
  research_depth: 0.84,
  product_strategy: 0.83,
  leadership: 0.76,
  ui_craft: 0.8,
  domain_fluency: 0.81,
};

function normalize(input: string) {
  return input.toLowerCase().trim();
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function isOffTopic(input: string) {
  const value = normalize(input);
  return OFF_TOPIC_PATTERNS.some((pattern) => value.includes(pattern));
}

function scoreItem(input: string, item: KnowledgeItem) {
  const value = normalize(input);
  let score = 0;
  const title = item.title.toLowerCase();
  const summary = item.summary.toLowerCase();

  if (
    value.includes("genetic") ||
    value.includes("genetics") ||
    value.includes("breeding") ||
    value.includes("cattle")
  ) {
    if (title.includes("breedlogic")) score += 20;
    if (summary.includes("mate selection") || summary.includes("cattle")) score += 12;
    if (item.themes.includes("specialist-users")) score += 4;
  }

  item.tags.forEach((tag) => {
    const taxonomyEntry = getTaxonomyEntry(tag);
    const tagVariants = taxonomyEntry
      ? [tag.toLowerCase(), taxonomyEntry.label.toLowerCase()]
      : [tag.toLowerCase()];

    tagVariants.forEach((variant) => {
      if (value.includes(variant)) score += 4;
    });
  });

  item.themes.forEach((theme) => {
    if (value.includes(theme.toLowerCase())) score += 5;
    const synonyms = THEME_KEYWORDS[theme] || [];
    synonyms.forEach((keyword) => {
      if (value.includes(keyword)) score += 3;
    });
  });

  if (value.includes(title)) score += 6;
  if (value.includes(summary)) score += 2;

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

export function buildIntentSnapshot(prompt: string): IntentSnapshot {
  const value = normalize(prompt);

  const axisScores = new Map<SnapshotAxisId, number>(
    SNAPSHOT_AXES.map((axis) => [axis.id, 0]),
  );

  const boostAxis = (axisId: SnapshotAxisId, amount: number) => {
    axisScores.set(axisId, Math.max(axisScores.get(axisId) || 0, amount));
  };

  const boostAxes = (boosts: Partial<Record<SnapshotAxisId, number>>) => {
    Object.entries(boosts).forEach(([axisId, amount]) => {
      if (typeof amount === "number") {
        boostAxis(axisId as SnapshotAxisId, amount);
      }
    });
  };

  SNAPSHOT_AXES.forEach((axis) => {
    const keywordHits = axis.keywords.reduce((count, keyword) => {
      return count + (value.includes(keyword) ? 1 : 0);
    }, 0);

    const exactPhraseHits = axis.keywords.filter(
      (keyword) => keyword.includes(" ") && value.includes(keyword),
    ).length;

    if (keywordHits > 0) {
      const directScore = Math.min(
        0.9,
        0.42 + Math.min(keywordHits, 3) * 0.14 + Math.min(exactPhraseHits, 2) * 0.08,
      );
      boostAxis(axis.id, directScore);
    }
  });

  if (value.includes("ai") || value.includes("agent") || value.includes("llm")) {
    boostAxes({
      ai_relevance: 0.9,
      systems_thinking: 0.58,
      workflow_complexity: 0.46,
    });
  }

  if (value.includes("workflow") || value.includes("operations") || value.includes("process")) {
    boostAxes({
      workflow_complexity: 0.9,
      systems_thinking: 0.6,
      product_strategy: 0.44,
    });
  }

  if (value.includes("saas") || value.includes("b2b") || value.includes("enterprise")) {
    boostAxes({
      product_strategy: 0.62,
      leadership: 0.52,
      domain_fluency: 0.56,
      systems_thinking: 0.42,
    });
  }

  if (value.includes("research") || value.includes("discovery") || value.includes("testing")) {
    boostAxes({
      research_depth: 0.82,
      systems_thinking: 0.46,
      product_strategy: 0.4,
    });
  }

  if (value.includes("design system") || value.includes("ui") || value.includes("accessibility")) {
    boostAxes({
      ui_craft: 0.8,
      systems_thinking: 0.52,
      workflow_complexity: 0.36,
    });
  }

  if (value.includes("lead") || value.includes("leadership") || value.includes("stakeholder")) {
    boostAxes({
      leadership: 0.82,
      product_strategy: 0.56,
      systems_thinking: 0.42,
    });
  }

  const rankedScores = [...axisScores.entries()].sort((a, b) => b[1] - a[1]);
  const strongAxisCount = rankedScores.filter(([, score]) => score >= 0.4).length;

  if (strongAxisCount < 3) {
    const spreadCandidates: SnapshotAxisId[] = [
      "systems_thinking",
      "product_strategy",
      "workflow_complexity",
      "research_depth",
      "domain_fluency",
    ];

    spreadCandidates.forEach((axisId) => {
      const current = axisScores.get(axisId) || 0;
      if (current === 0 && rankedScores.filter(([, score]) => score >= 0.35).length < 5) {
        boostAxis(axisId, 0.42);
      }
    });
  }

  const nonZeroScores = [...axisScores.values()].filter((score) => score > 0);
  const highestScore = nonZeroScores.length ? Math.max(...nonZeroScores) : 0;
  const normalizationFactor = highestScore > 0 ? 0.9 / highestScore : 1;

  const axes = SNAPSHOT_AXES.map((axis) => {
    const rawScore = axisScores.get(axis.id) || 0;
    const normalizedScore = rawScore > 0 ? clamp01(rawScore * normalizationFactor) : 0;
    const finalScore = normalizedScore > 0 ? Math.max(normalizedScore, 0.12) : null;

    return {
      id: axis.id,
      label: axis.label,
      score: finalScore,
    };
  });

  return { axes };
}

export function buildBaselineSnapshot(): IntentSnapshot {
  return {
    axes: SNAPSHOT_AXES.map((axis) => ({
      id: axis.id,
      label: axis.label,
      score: BASELINE_SCORES[axis.id],
    })),
  };
}

export function findRelevantKnowledge(input: string, limit = 4) {
  return topMatches(input, limit);
}

export function getPageContentForMatches(items: KnowledgeItem[], limit = 4): PageContentItem[] {
  const ids = items.slice(0, limit).map((item) => item.id);
  return ids
    .map((id) => hireGiaPageContent.find((page) => page.id === id))
    .filter(Boolean) as PageContentItem[];
}

function toEvidence(
  item: KnowledgeItem,
  evidenceType: "direct" | "adjacent" = "direct",
): EvidenceCard {
  return {
    title: item.title,
    url: item.url,
    description: item.summary,
    evidenceType,
  };
}

function inferEvidenceType(item: KnowledgeItem): "direct" | "adjacent" {
  if (item.type === "about") return "adjacent";
  return "direct";
}

function toExplore(items: KnowledgeItem[]): NextPage[] {
  return items.slice(0, 3).map((item) => {
    let why = "Useful if you want to see the work itself.";

    if (item.type === "case_study") {
      why = "Best if you want the product context, design thinking, and outcome story in one place.";
    } else if (item.type === "article") {
      why = "Useful if you want Gia’s point of view in her own words.";
    } else if (item.type === "design_system") {
      why = "Best if you want to see how Gia thinks about systems, consistency, and design structure.";
    } else if (item.url.includes("/about")) {
      why = "Best place for broader context on Gia’s background, focus areas, and working style.";
    }

    return {
      title: item.title,
      url: item.url,
      why,
    };
  });
}

function inferThemes(input: string, items: KnowledgeItem[]): MatchedTheme[] {
  const value = normalize(input);
  const collected = new Map<string, number>();

  Object.entries(THEME_KEYWORDS).forEach(([theme, keywords]) => {
    if (keywords.some((keyword) => value.includes(keyword))) {
      collected.set(theme, Math.max(collected.get(theme) || 0, 4));
    }
  });

  items.forEach((item) =>
    item.themes.forEach((theme) => {
      const current = collected.get(theme) || 0;
      collected.set(theme, Math.max(current, 3));
    }),
  );

  return [...collected.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme, strength]) => ({
      label: theme
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      strength: strength as 1 | 2 | 3 | 4 | 5,
      reason: THEME_REASON_MAP[theme] || "This theme shows up clearly in the published work.",
    }));
}

function buildFitSnapshot(
  input: string,
  matches: KnowledgeItem[],
  themes: MatchedTheme[],
): FitSnapshot | undefined {
  const value = normalize(input);

  const axes = FIT_AXES.map((axis) => {
    const supportingTitles = matches
      .filter((item) =>
        axis.themes.some((key) => item.themes.includes(key) || item.id.includes(key)),
      )
      .map((item) => item.title);

    const axisThemeHits = themes.filter((theme) =>
      axis.themes.some((key) => theme.label.toLowerCase().includes(key.replace(/-/g, " "))),
    ).length;

    const itemHits = matches.filter((item) =>
      axis.themes.some((key) => item.themes.includes(key) || item.id.includes(key)),
    ).length;

    const explicitKeywordHits = axis.keywords.filter((keyword) => value.includes(keyword)).length;
    const titleHits = matches.filter((item) =>
      axis.keywords.some((keyword) => item.title.toLowerCase().includes(keyword)),
    ).length;

    const raw =
      axisThemeHits * 24 +
      itemHits * 18 +
      explicitKeywordHits * 10 +
      titleHits * 12;
    const finalValue = raw > 0 ? Math.max(16, Math.min(96, 16 + raw)) : 12;
    const note =
      supportingTitles.length >= 2
        ? `Strongest supporting evidence: ${supportingTitles[0]} and ${supportingTitles[1]}.`
        : supportingTitles.length === 1
          ? `Strongest supporting evidence: ${supportingTitles[0]}.`
          : axisThemeHits > 0
            ? "Strongest supporting evidence: this theme is present across the public work, rather than one page."
            : explicitKeywordHits > 0 || titleHits > 0
              ? "Strongest supporting evidence: the prompt points this way, but the public proof is lighter."
              : "Strongest supporting evidence: this is a lighter public signal and may need direct discussion.";

    return {
      key: axis.key,
      label: axis.label,
      value: finalValue,
      note,
    } satisfies FitAxis;
  });

  if (!axes.length) return undefined;

  return {
    kind: "spider",
    max: 100,
    axes,
  };
}

function fitLabelForSnapshot(snapshot?: FitSnapshot) {
  if (!snapshot?.axes.length) return "Selective" as const;
  const average =
    snapshot.axes.reduce((sum, axis) => sum + axis.value, 0) / snapshot.axes.length;
  if (average >= 72) return "Strong" as const;
  if (average >= 55) return "Moderate" as const;
  return "Selective" as const;
}

function fallbackGuideResult(): GuideResult {
  return {
    mode: "guide",
    title: "Portfolio guidance",
    headline: "A specific question gives a cleaner read.",
    summary:
      "Try tying it to a project, article, systems theme, or capability thread from the site.",
    detailSummary:
      "That gives the assistant enough shape to point to the most relevant published proof without flattening everything into a generic answer.",
    evidence: [
      toEvidence(hireGiaKnowledge.find((item) => item.id === "about")!),
      toEvidence(hireGiaKnowledge.find((item) => item.id === "exosphere")!, "adjacent"),
    ],
    worthKnowing:
      "The sharper the question, the more useful the answer tends to be.",
    nextPages: [
      {
        title: "About Gia",
        url: "/about/",
        why: "Best starting point if you want the broad shape of Gia’s work.",
      },
      {
        title: "Case studies",
        url: "/case-studies/",
        why: "Best if you want to see the strongest published work directly.",
      },
      {
        title: "Articles",
        url: "/articles/",
        why: "Useful if you want Gia’s point of view, not just project summaries.",
      },
    ],
    intentSnapshot: buildIntentSnapshot(""),
    baselineSnapshot: buildBaselineSnapshot(),
    limits:
      "It only works from what is published on the site, so the sharper the question, the better the read.",
  };
}

function fallbackRoleResult(): RoleResult {
  return {
    mode: "role",
    title: "Fit review",
    headline: "This needs a real brief before it can say anything interesting.",
    fitLabel: "Selective",
    summary:
      "There’s not enough role-specific detail here to make a smart read.",
    detailSummary:
      "A pasted job description or a more concrete hiring brief will make this much more useful.",
    matchedThemes: [
      {
        label: "Strategy",
        strength: 3,
        reason: "The public work shows clear product and systems thinking.",
      },
      {
        label: "Complex Workflows",
        strength: 3,
        reason: "The strongest portfolio proof sits in technically dense product environments.",
      },
    ],
    evidence: [
      toEvidence(hireGiaKnowledge.find((item) => item.id === "about")!),
      toEvidence(hireGiaKnowledge.find((item) => item.id === "blocksync")!),
    ],
    worthKnowing:
      "The portfolio is selective by design, so a vague role brief usually tells you less than a direct conversation would.",
    nextPages: [
      {
        title: "About Gia",
        url: "/about/",
        why: "Best page for overall context on background, leadership, and focus.",
      },
      {
        title: "BlockSync",
        url: "/case-studies/seequent/blocksync/",
        why: "Useful if the role involves complex product systems and operational workflow design.",
      },
    ],
    intentSnapshot: buildIntentSnapshot(""),
    baselineSnapshot: buildBaselineSnapshot(),
    limits:
      "This is a quick first read, not a full hiring verdict.",
  };
}

export function matchGuidePrompt(input: string): GuideResult {
  const value = normalize(input);
  if (!value || value.length < 8) return fallbackGuideResult();

  if (isOffTopic(value)) {
    return {
      ...fallbackGuideResult(),
      summary:
        "This assistant is here to talk about Gia’s work, writing, and portfolio.",
      detailSummary:
        "It is not intended as a general-purpose assistant for the rest of the internet.",
    };
  }

  const matches = topMatches(value, 4);
  if (!matches.length) return fallbackGuideResult();

  const topTitles = matches.slice(0, 2).map((item) => item.title);
  const matchedThemes = inferThemes(value, matches).slice(0, 4);

  return {
    mode: "guide",
    title: "Portfolio guidance",
    headline: "This question is answered most clearly in the work itself.",
    summary:
      topTitles.length === 1
        ? `${topTitles[0]} is probably the strongest place to start.`
        : `${topTitles.join(" and ")} are the strongest places to start.`,
    detailSummary:
      topTitles.length === 1
        ? `${topTitles[0]} is most likely to answer this cleanly without too much interpretation.`
        : `${topTitles.join(" and ")} together give the clearest public read on this question.`,
    matchedThemes,
    evidence: matches.slice(0, 3).map((item) => toEvidence(item, inferEvidenceType(item))),
    worthKnowing:
      "The public site is selective, so some threads are shown more clearly than others.",
    nextPages: toExplore(matches),
    intentSnapshot: buildIntentSnapshot(value),
    baselineSnapshot: buildBaselineSnapshot(),
    fitSnapshot: buildFitSnapshot(value, matches, matchedThemes),
    limits:
      "This answer is anchored in the published site, so it’s strongest where the portfolio already shows a clear thread of evidence.",
  };
}

export function matchRolePrompt(input: string): RoleResult {
  const value = normalize(input);
  if (!value || value.length < 20) return fallbackRoleResult();

  if (isOffTopic(value)) {
    return {
      ...fallbackRoleResult(),
      summary:
        "This mode is for job descriptions, hiring briefs, and serious role-fit questions.",
      detailSummary:
        "It won’t do much with general off-topic prompts.",
    };
  }

  const matches = topMatches(value, 5);
  if (!matches.length) return fallbackRoleResult();

  const matchedThemes = inferThemes(value, matches);
  const fitSnapshot = buildFitSnapshot(value, matches, matchedThemes);
  const fitLabel = fitLabelForSnapshot(fitSnapshot);
  const evidence = matches.slice(0, 3).map((item) => toEvidence(item, inferEvidenceType(item)));

  const strongestThemes = matchedThemes.slice(0, 2).map((theme) => theme.label);

  let summary =
    "The public work points most clearly to strength in complex product and workflow-heavy environments.";

  let detailSummary =
    "That is where Gia looks most obviously convincing from the site alone.";

  if (strongestThemes.length === 1) {
    summary = `The public work reads most strongly in ${strongestThemes[0]}.`;
    detailSummary = `That is the clearest through-line in the published portfolio for this role.`;
  } else if (strongestThemes.length >= 2) {
    summary = `The public work reads most strongly where ${strongestThemes[0]} and ${strongestThemes[1]} matter.`;
    detailSummary = `That is where Gia looks most obviously convincing from the site alone.`;
  }

  return {
    mode: "role",
    title: "Fit review",
    headline:
      fitLabel === "Strong"
        ? "This is more in Gia’s lane than it first appears."
        : fitLabel === "Moderate"
          ? "There’s real overlap here, just not in a paint-by-numbers way."
          : "There’s something here, but the public proof is more selective.",
    fitLabel,
    summary,
    detailSummary,
    matchedThemes,
    evidence,
    worthKnowing:
      "The strongest published signal usually sits in complex systems, specialist-user products, and workflow-heavy SaaS rather than in generic category labels.",
    nextPages: toExplore(matches),
    intentSnapshot: buildIntentSnapshot(value),
    baselineSnapshot: buildBaselineSnapshot(),
    fitSnapshot,
    limits:
      "This is a first read from the published portfolio, not a substitute for an actual conversation.",
  };
}

export function matchPrompt(mode: HireGiaMode, input: string) {
  return mode === "role" ? matchRolePrompt(input) : matchGuidePrompt(input);
}
