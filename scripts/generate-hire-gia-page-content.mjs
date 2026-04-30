import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "src/content/docs");
const OUTPUT_FILE = path.join(ROOT, "src/lib/ai/hireGiaPageContent.ts");

const SOURCE_MAP = [
  {
    id: "about",
    type: "page",
    title: "About Gia",
    url: "/about/",
    content: `
Gia Romano is a Lead Product Designer focused on complex SaaS, specialist platforms, data-rich systems, and AI-assisted workflows.

Her work spans geoscience, logistics, trade, genetics, and other technically dense product environments where clarity, trust, and workflow design matter more than surface polish alone.

Across the portfolio, the strongest recurring themes are complex operational workflows, specialist and expert users, design systems and systems thinking, product strategy, AI-assisted workflow design, and decision-support products.
    `,
  },
  {
    id: "exocore",
    type: "case_study",
    title: "Exocore",
    url: "/case-studies/fleet/exocore/",
    file: "case-studies/fleet/exocore.mdx",
  },
  {
    id: "exosphere",
    type: "case_study",
    title: "Exosphere",
    url: "/case-studies/fleet/exosphere/",
    file: "case-studies/fleet/exosphere.mdx",
  },
  {
    id: "blocksync",
    type: "case_study",
    title: "BlockSync",
    url: "/case-studies/seequent/blocksync/",
    file: "case-studies/seequent/blocksync.mdx",
  },
  {
    id: "central-viewer",
    type: "case_study",
    title: "Central Viewer",
    url: "/case-studies/seequent/central-viewer/",
    file: "case-studies/seequent/central-viewer.mdx",
  },
  {
    id: "assure-plus",
    type: "case_study",
    title: "Assure+",
    url: "/case-studies/tradewindow/assure-plus/",
    file: "case-studies/tradewindow/assure-plus.mdx",
  },
  {
    id: "cube",
    type: "case_study",
    title: "Cube",
    url: "/case-studies/tradewindow/cube/",
    file: "case-studies/tradewindow/cube.mdx",
  },
  {
    id: "breedlogic",
    type: "case_study",
    title: "BreedLogic",
    url: "/case-studies/abri/breedlogic/",
    file: "case-studies/abri/breedlogic.mdx",
  },
  {
    id: "evo",
    type: "case_study",
    title: "Evo",
    url: "/case-studies/seequent/evo/",
    file: "case-studies/seequent/evo.mdx",
  },
  {
    id: "crm",
    type: "case_study",
    title: "CRM lead management",
    url: "/case-studies/seequent/crm-lead-management/",
    file: "case-studies/seequent/crm-lead-management.mdx",
  },
  {
    id: "north-star",
    type: "case_study",
    title: "North Star constellation",
    url: "/case-studies/seequent/north-star/",
    file: "case-studies/seequent/north-star.mdx",
  },
  {
    id: "article-systems",
    type: "article",
    title: "What design systems actually enable",
    url: "/articles/what-design-systems-actually-enable/",
    file: "articles/what-design-systems-actually-enable.mdx",
  },
  {
    id: "article-specialist",
    type: "article",
    title: "Designing for specialist users",
    url: "/articles/designing-for-specialist-users/",
    file: "articles/designing-for-specialist-users.mdx",
  },
  {
    id: "article-ai-helps",
    type: "article",
    title: "Where AI actually helps product teams",
    url: "/articles/where-ai-actually-helps-product-teams/",
    file: "articles/where-ai-actually-helps-product-teams.mdx",
  },
  {
    id: "article-ai-thinking",
    type: "article",
    title: "AI doesn’t fix bad product thinking",
    url: "/articles/ai-doesnt-fix-bad-product-thinking/",
    file: "articles/ai-doesnt-fix-bad-product-thinking.mdx",
  },
  {
    id: "article-ia",
    type: "article",
    title: "Information architecture is how complex products stay usable",
    url: "/articles/information-architecture-is-how-complex-products-stay-usable/",
    file: "articles/information-architecture-is-how-complex-products-stay-usable.mdx",
  },
  {
    id: "design-systems",
    type: "design_system",
    title: "Design systems",
    url: "/design-systems/",
    file: "design-systems/index.mdx",
  },
];

function parseFrontmatterAndBody(source) {
  const match = source.match(/^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/);
  if (!match) {
    return { frontmatter: "", body: source.trim() };
  }

  return {
    frontmatter: match[1].trim(),
    body: match[2].trim(),
  };
}

function stripMarkdown(value) {
  return value
    .replace(/\r/g, "")
    .replace(/^import\s+.*$/gm, "")
    .replace(/^export\s+.*$/gm, "")
    .replace(/^<[^>]+\/?>$/gm, "")
    .replace(/^<[^>]+>$/gm, "")
    .replace(/^<\/[^>]+>$/gm, "")
    .replace(/^:::+[\s\S]*?:::+$/gm, "")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/[`*_>#]/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function pickExcerpt(body, maxLength = 1200) {
  const cleaned = stripMarkdown(body);
  const paragraphs = cleaned
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^<.*>$/.test(part))
    .filter((part) => !part.startsWith("Image "))
    .filter((part) => part.length > 40);

  return paragraphs.join("\n\n").slice(0, maxLength).trim();
}

function excerptLengthForEntry(entry) {
  if (entry.type === "case_study") return 6000;
  if (entry.type === "page") return 2500;
  if (entry.type === "design_system") return 3000;
  return 2200;
}

async function readSourceEntry(entry) {
  if (entry.content) {
    return {
      ...entry,
      content: pickExcerpt(entry.content),
    };
  }

  const filePath = path.join(SOURCE_DIR, entry.file);
  const raw = await fs.readFile(filePath, "utf8");
  const { body } = parseFrontmatterAndBody(raw);
  const excerpt = pickExcerpt(body, excerptLengthForEntry(entry));

  return {
    ...entry,
    content: excerpt,
  };
}

async function main() {
  const entries = [];

  for (const entry of SOURCE_MAP) {
    try {
      entries.push(await readSourceEntry(entry));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      entries.push({
        ...entry,
        content: entry.content
          ? pickExcerpt(entry.content)
          : `TODO: review source page manually. Could not read ${entry.file}: ${message}`,
      });
    }
  }

  const output = `import type { PageContentItem } from "./hireGiaTypes";

export const hireGiaPageContent: PageContentItem[] = ${JSON.stringify(
    entries.map(({ id, type, title, url, content }) => ({ id, type, title, url, content })),
    null,
    2,
  )} as PageContentItem[];
`;

  await fs.writeFile(OUTPUT_FILE, output);
  console.log(`Wrote ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
