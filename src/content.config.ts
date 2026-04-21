import { z } from "astro/zod";
import { docsLoader, i18nLoader } from "@astrojs/starlight/loaders";
import { docsSchema, i18nSchema } from "@astrojs/starlight/schema";
import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { getTaxonomyIds } from "./lib/taxonomy";

const domainIds = getTaxonomyIds("domain");
const problemIds = getTaxonomyIds("problem");
const capabilityIds = getTaxonomyIds("capability");
const systemIds = getTaxonomyIds("system");
const impactIds = getTaxonomyIds("impact");

const caseStudyMetaSchema = z.object({
  role: z.string(),
  domain: z.array(z.enum(domainIds)),
  problem: z.array(z.enum(problemIds)),
  capability: z.array(z.enum(capabilityIds)),
  system: z.array(z.enum(systemIds)),
  impact: z.array(z.enum(impactIds)),
});

const ctaSection = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "src/content/sections",
  }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    enable: z.boolean().optional(),
    fill_button: z.object({
      label: z.string().optional(),
      link: z.string().optional(),
      enable: z.boolean().optional(),
    }),
    outline_button: z.object({
      label: z.string().optional(),
      link: z.string().optional(),
      enable: z.boolean().optional(),
    }),
  }),
});

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        meta: caseStudyMetaSchema.optional(),
      }),
    }),
  }),
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
  ctaSection,
};
