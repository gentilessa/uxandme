export type HireGiaMode = "guide" | "role";

export type KnowledgeItem = {
  id: string;
  type: "page" | "case-study" | "article";
  title: string;
  url: string;
  summary: string;
  tags: string[];
  themes: string[];
};

export type EvidenceItem = {
  title: string;
  url: string;
  description: string;
};

export type ExploreItem = {
  title: string;
  url: string;
};

export type GuideResult = {
  mode: "guide";
  title: string;
  intro: string;
  evidence: EvidenceItem[];
  nextPages: ExploreItem[];
  limits?: string;
};

export type RoleFit = "Strong" | "Moderate" | "Selective";

export type RoleResult = {
  mode: "role";
  title: string;
  fitLabel: RoleFit;
  intro: string;
  matchedThemes: string[];
  evidence: EvidenceItem[];
  gaps?: string[];
  nextPages: ExploreItem[];
  limits?: string;
};

export type HireGiaResult = GuideResult | RoleResult;
