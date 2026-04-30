export type HireGiaMode = "guide" | "role";

export type EvidenceType = "direct" | "adjacent";
export type FitLabel = "Strong" | "Moderate" | "Selective";

export type MatchedTheme = {
  label: string;
  strength: 1 | 2 | 3 | 4 | 5;
  reason: string;
};

export type EvidenceCard = {
  title: string;
  url: string;
  description: string;
  evidenceType: EvidenceType;
};

export type NextPage = {
  title: string;
  url: string;
  why: string;
};

export type FitAxis = {
  key: string;
  label: string;
  value: number;
  note: string;
};

export type FitSnapshot = {
  kind: "spider";
  max: 100;
  axes: FitAxis[];
};

export type SnapshotAxisId =
  | "ai_relevance"
  | "workflow_complexity"
  | "systems_thinking"
  | "research_depth"
  | "product_strategy"
  | "leadership"
  | "ui_craft"
  | "domain_fluency";

export type SnapshotAxis = {
  id: SnapshotAxisId;
  label: string;
  score: number | null;
};

export type IntentSnapshot = {
  axes: SnapshotAxis[];
};

export type VisualSnapshot = {
  kind: "radar" | "bars";
  labels: string[];
  values: number[];
  max: 5;
};

export type KnowledgeItemType =
  | "about"
  | "page"
  | "case_study"
  | "article"
  | "design_system";

export type KnowledgeItem = {
  id: string;
  type: KnowledgeItemType;
  title: string;
  url: string;
  summary: string;
  tags: string[];
  themes: string[];
};

export type PageContentItem = {
  id: string;
  url: string;
  title: string;
  type: KnowledgeItemType;
  content: string;
};

export type BaseHireGiaResult = {
  mode: HireGiaMode;
  title: string;
  headline?: string;
  summary: string; // panel-safe short version
  detailSummary?: string; // fuller version for the full page
  worthKnowing?: string;
  matchedThemes?: MatchedTheme[];
  evidence: EvidenceCard[];
  nextPages: NextPage[];
  gaps?: string[];
  caveats?: string[];
  fitSnapshot?: FitSnapshot;
  intentSnapshot?: IntentSnapshot;
  baselineSnapshot?: IntentSnapshot;
  visualSnapshot?: VisualSnapshot; // deprecated compatibility fallback
  limits?: string;
};

export type GuideResult = BaseHireGiaResult & {
  mode: "guide";
};

export type RoleResult = BaseHireGiaResult & {
  mode: "role";
  fitLabel: FitLabel;
};

export type HireGiaResult = GuideResult | RoleResult;
