export const taxonomy = {
  domain: {
    "subsurface-and-infrastructure": {
      label: "Subsurface & infrastructure",
      assistant: true,
    },
    "logistics-and-trade": { label: "Logistics & trade", assistant: true },
    telecommunications: { label: "Telecommunications", assistant: true },
    ecommerce: { label: "Ecommerce", assistant: true },
    "data-platforms": { label: "Data platforms", assistant: true },
  },
  problem: {
    "decision-support": { label: "Decision support", assistant: true },
    "resource-optimisation": { label: "Resource optimisation", assistant: true },
    "planning-and-forecasting": {
      label: "Planning & forecasting",
      assistant: true,
    },
    "operational-efficiency": {
      label: "Operational efficiency",
      assistant: true,
    },
    "data-quality-and-trust": { label: "Data quality & trust", assistant: true },
    "workflow-fragmentation": {
      label: "Workflow fragmentation",
      assistant: true,
    },
    "system-integration": { label: "System integration", assistant: true },
  },
  capability: {
    "data-visualisation": { label: "Data visualisation", assistant: true },
    "ai-workflows": { label: "AI-assisted workflows", assistant: true },
    "design-systems": { label: "Design systems", assistant: true },
    "complex-workflows": { label: "Complex workflows", assistant: true },
    "service-design": { label: "Service design", assistant: true },
    "information-architecture": {
      label: "Information architecture",
      assistant: true,
    },
    "product-strategy": { label: "Product strategy", assistant: true },
  },
  system: {
    "enterprise-saas": { label: "Enterprise SaaS", assistant: true },
    "data-platform": { label: "Data platform", assistant: true },
    "ai-assisted-system": { label: "AI system", assistant: true },
    "3d-visualisation": { label: "3D visualisation", assistant: true },
    "operational-tooling": { label: "Operational tooling", assistant: true },
  },
  impact: {
    "improved-decision-making": {
      label: "Improved decision-making",
      assistant: false,
    },
    "increased-operational-efficiency": {
      label: "Increased operational efficiency",
      assistant: false,
    },
    "reduced-risk": { label: "Reduced risk", assistant: false },
    "improved-data-trust": { label: "Improved data trust", assistant: false },
  },
} as const;

export type TaxonomyDimension = keyof typeof taxonomy;

type RegistryFor<T extends TaxonomyDimension> = (typeof taxonomy)[T];
export type TaxonomyId<T extends TaxonomyDimension = TaxonomyDimension> =
  T extends TaxonomyDimension ? keyof RegistryFor<T> & string : never;

export type CaseStudyTaxonomyMeta = {
  role: string;
  domain: TaxonomyId<"domain">[];
  problem: TaxonomyId<"problem">[];
  capability: TaxonomyId<"capability">[];
  system: TaxonomyId<"system">[];
  impact: TaxonomyId<"impact">[];
};

export const taxonomyDimensions = Object.keys(taxonomy) as TaxonomyDimension[];

export function getTaxonomyIds<T extends TaxonomyDimension>(dimension: T) {
  return Object.keys(taxonomy[dimension]) as TaxonomyId<T>[];
}

export function getTaxonomyLabel<T extends TaxonomyDimension>(
  dimension: T,
  id: TaxonomyId<T>
) {
  return taxonomy[dimension][id].label;
}

export function getTaxonomyLabels<T extends TaxonomyDimension>(
  dimension: T,
  ids: TaxonomyId<T>[]
) {
  return ids.map((id) => getTaxonomyLabel(dimension, id));
}

export function getAssistantTaxonomyItems<T extends TaxonomyDimension>(
  dimension: T
) {
  return getTaxonomyIds(dimension)
    .filter((id) => taxonomy[dimension][id].assistant)
    .map((id) => ({
      id,
      label: taxonomy[dimension][id].label,
    }));
}

export function getAssistantPromptLabels(
  dimensions: TaxonomyDimension[]
) {
  return dimensions.flatMap((dimension) =>
    getAssistantTaxonomyItems(dimension).map((item) => item.label)
  );
}

export function findTaxonomyByLabel(label: string) {
  const normalized = label.trim().toLowerCase();

  for (const dimension of taxonomyDimensions) {
    for (const id of getTaxonomyIds(dimension)) {
      const entry = taxonomy[dimension][id];
      if (entry.label.toLowerCase() === normalized) {
        return { dimension, id, label: entry.label };
      }
    }
  }

  return null;
}

export function getTaxonomyEntry(id: string) {
  for (const dimension of taxonomyDimensions) {
    if (id in taxonomy[dimension]) {
      const typedId = id as TaxonomyId<typeof dimension>;
      return {
        dimension,
        id: typedId,
        label: taxonomy[dimension][typedId].label,
        assistant: taxonomy[dimension][typedId].assistant,
      };
    }
  }
  return null;
}
