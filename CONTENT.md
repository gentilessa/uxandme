# Content Guide

This guide explains how to update content on uxandme.com.

## Site Structure

```
src/content/docs/
├── index.mdx              # Homepage
├── about.mdx              # About page
├── case-studies/         # Case study pages
│   ├── index.mdx         # Case studies overview
│   └── *.mdx             # Individual case studies
├── articles/             # Article pages
│   ├── index.mdx        # Articles overview
│   └── *.mdx            # Individual articles
└── design-systems/      # Design systems page
```

## Adding a New Case Study

1. Create a new `.mdx` file in `src/content/docs/case-studies/`:
   ```
   src/content/docs/case-studies/my-project.mdx
   ```

2. Add the required frontmatter:
   ```mdx
   ---
   title: "My Project"
   sidebar:
     label: "My Project"
   ---
   ```

3. Add content using standard Markdown + MDX:
   ```mdx
   import CaseStudyMeta from "../../../components/user-components/CaseStudyMeta.astro";

   Brief introduction paragraph.

   <CaseStudyMeta
     role="Lead Product Designer"
     platform="Web / Desktop App"
     domain="SaaS, B2B"
   />

   ## Section Heading

   Content goes here...

   ![image](/images/projects/my-project/hero.png)
   ```

4. Add the case study card to `src/content/docs/case-studies/index.mdx`:
   ```mdx
   <PortfolioCard
     href="/case-studies/my-project/"
     image="/images/projects/my-project/hero.png"
     alt="My Project preview"
     title="My Project"
     description="Brief description."
     meta="Category • Tags"
   />
   ```

## Adding a New Article

1. Create a new `.mdx` file in `src/content/docs/articles/`:
   ```
   src/content/docs/articles/my-article-title.mdx
   ```

2. Add frontmatter:
   ```mdx
   ---
   title: "My Article Title"
   description: "Brief description for SEO."
   ---
   ```

3. Write content using standard Markdown:
   ```mdx
   Article content in plain text with **bold**, *italic*, and [links](url).

   ## Section Heading

   More content...
   ```

## Adding Images

1. Place images in the appropriate folder:
   ```
   public/images/projects/my-project/
   ```

2. Reference them in MDX:
   ```mdx
   ![Alt text](/images/projects/my-project/filename.png)
   ```

## Component Reference

### CaseStudyMeta
Used in case studies to display role details:
```mdx
<CaseStudyMeta
  role="Lead Product Designer"
  platform="Web / Desktop App"
  domain="SaaS, B2B"
/>
```

### PortfolioCard
Used on overview pages to link to case studies:
```mdx
<PortfolioCard
  href="/case-studies/my-project/"
  image="/images/projects/my-project/hero.png"
  alt="Preview description"
  title="Project Name"
  description="Brief description."
  meta="Category • Tags"
/>
```

### Grid
Wraps multiple cards in a grid layout:
```mdx
<Grid columns={2} maxWidth="1600px">
  <!-- cards go here -->
</Grid>
```

## Frontmatter Reference

### Case Study Frontmatter
```yaml
title: "Project Name"           # Page title
sidebar:
  label: "Project Name"          # Sidebar label
```

### Article Frontmatter
```yaml
title: "Article Title"           # Page title
description: "SEO description" # Meta description
```

## Local Development

Run the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Tips

- Keep filenames lowercase with hyphens: `my-project.mdx`
- Images should be optimized and in PNG or WebP format
- Frontmatter values must be in double quotes
- MDX supports standard Markdown plus Astro components
