# uxandme Site Restore Checklist

## Current State
- Astro/Starlight portfolio website (uxandme.com)
- Custom purple theme with Tailwind CSS
- Custom component overrides for layout

## TOC Troubleshooting Checklist

### 1. TOC Not Appearing
- [ ] Verify `astro.config.mjs` has component overrides configured
- [ ] Check `TwoColumnContent.astro` includes `toc` slot or passes TOC via `starlightRoute.toc`
- [ ] Ensure `PageSidebar.astro` renders `TableOfContents` component

### 2. TOC Scroll Tracking (aria-current="true")
- [ ] DO NOT override `TableOfContents.astro` - Starlight has built-in IntersectionObserver
- [ ] DO NOT override `TableOfContentsList.astro` - breaks scroll tracking
- [ ] DO NOT override `starlight-toc.ts` script - breaks scroll detection
- [ ] Use Starlight's default TOC components

### 3. Content in Scroll Container
- [ ] Sidebar needs `position: sticky` with proper `inset-block` values
- [ ] TOC needs `position: sticky` with proper offset
- [ ] Main content should scroll normally under fixed header

### 4. CSS Styling (DO NOT TOUCH TEMPLATES)
- [ ] Edit only `.astro` files in `src/styles/`
- [ ] Edit only CSS in `@layer starlight.core` blocks
- [ ] DO NOT add/remove HTML structure in overrides

## Override Components That WORK

```javascript
// astro.config.mjs - SAFE TO USE
components: {
  Head: "./src/components/override-components/Head.astro",
  Header: "./src/components/override-components/Header.astro",
  Hero: "./src/components/override-components/Hero.astro",
  PageFrame: "./src/components/override-components/PageFrame.astro",
  PageSidebar: "./src/components/override-components/PageSidebar.astro",
  TwoColumnContent: "./src/components/override-components/TwoColumnContent.astro",
  ContentPanel: "./src/components/override-components/ContentPanel.astro",
  Pagination: "./src/components/override-components/Pagination.astro",
  Sidebar: "./src/components/override-components/Sidebar.astro",
}
```

## DO NOT OVERRIDE (breaks TOC)
- ❌ `TableOfContents.astro` - Has IntersectionObserver for scroll
- ❌ `TableOfContentsList.astro` - Handles aria-current
- ❌ `MobileTableOfContents.astro` - Has scroll tracking
- ❌ `starlight-toc.ts` - Script for TOC scroll detection

## Current Override Components (SAFE)
- ContentPanel.astro - CSS styling only
- Footer.astro - CSS styling only
- Head.astro - Add custom head elements
- Header.astro - Custom header styling
- Hero.astro - Custom hero section
- PageFrame.astro - Page layout structure
- PageSidebar.astro - Uses Starlight TOC components (NOT custom)
- TwoColumnContent.astro - Layout structure
- Sidebar.astro - Sidebar structure
- SidebarSublist.astro - Sidebar items

## Content Files
- MDX files go in `src/content/docs/case-studies/`
- Frontmatter must include `sidebar.label` for short names
- Images go in `public/images/projects/[project-name]/`

## If Build Fails
1. Run `npm run build` to see errors
2. Check for import errors (missing components)
3. DO NOT delete Starlight's default TOC files

## Recovery Steps if TOC Breaks
1. Check browser console for JavaScript errors
2. Verify `starlight-toc` web component exists in HTML
3. Check if IntersectionObserver is being used
4. Revert any custom TOC/starlight-toc overrides

## Testing Checklist
- [ ] Build passes: `npm run build`
- [ ] Dev server: `npm run dev`
- [ ] TOC "On this page" appears on case study pages
- [ ] Scroll triggers aria-current="true" on TOC links
- [ ] Sidebar is sticky
- [ ] Content scrolls under fixed header
- [ ] Mobile menu works
