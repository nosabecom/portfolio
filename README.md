# Nosa's portfolio

An Astro site for nosa.dev with an interactive, canvas-rendered map of Lagos.
Pluses, crosses, triangles, and dots replace conventional map fills and contour lines.

## Development

Requires Node 22.22+ and pnpm 12.14.0 (pinned in `package.json`). Install the locked dependencies with
`pnpm install --frozen-lockfile`, then run `pnpm dev`. `pnpm build` produces
the static site in `dist/`; `pnpm preview` serves that build locally.
Run `pnpm check` for Astro and TypeScript diagnostics. Commit `pnpm-lock.yaml`
with dependency changes; pnpm is the package manager for this repository.

Vercel Web Analytics and Speed Insights use their Astro components in the shared
layout, including client-side page transitions. Enable both in the Vercel project's
dashboard and redeploy to collect data. Their collection endpoints are provided by
Vercel; the local preview does not collect production metrics. The Vercel project
has `ENABLE_EXPERIMENTAL_COREPACK=1` in production, preview, and development so
builds use the pinned pnpm version. `vercel.json` selects Astro, the pnpm install
and build commands, and the `dist` output directory. TypeScript is pinned to the
latest 6.x release supported by `@astrojs/check`; its peer range excludes 7.x.

## Background

- `src/components/LagosBackground.astro`: page framing and subtle geographic labels.
- `src/lib/lagos-field.ts`: batched vector glyphs, procedural relief, shoreline emphasis,
  spring-driven pointer wakes, fading traces, and click/tap pulses. The canvas ignores pointer events, so foreground links and
  controls remain usable. Add `data-no-terrain` to other foreground interaction areas.
- `src/lib/lagos-geography.ts`: bundled OpenStreetMap shoreline and lagoon geometry.
  See `src/lib/lagos-geography.sources.md` for data provenance and licensing.

The geographic land/water boundaries are sourced from OpenStreetMap; the
contour-like texture is generative art, not measured elevation. No map API,
external font service, or runtime network request is required for the background.

Move to leave a fine trail; hold and drag for a wider brush with stronger motion.
Release to send out a pulse. Touch drawing is confined to the map surface, leaving
the surrounding page available for scrolling.

Motion respects the device's reduced-motion preference and suspends while the page is hidden.
The resting field is cached. A spatial grid limits interaction queries, and only
changed canvas tiles are restored. Vector paths are grouped by color and opacity;
frames stop when the bounded particles and pulses settle. No animation framework
or runtime dependency is needed.
The bottom-right theme button switches between dark green and paper palettes.
OpenStreetMap attribution stays at the top right, opposite the coordinates. Decorative labels do not select while drawing; foreground links and controls remain interactive.

## Homepage introduction

Edit `src/content/profile-intros.md`: each top-level Markdown bullet is one possible
line below the name. Add as many as you like (100+ are supported). Each browser
remembers which intros it has seen in local storage. Every distinct,
non-empty line is shown once before a new random round starts, including visits
through site navigation. The last intro of a round cannot immediately repeat at
the start of the next (unless only one intro exists). The selected line stays
still while you read. New lines join the unseen pool; reordering and removing
lines preserve progress. Duplicate text and empty bullets are ignored.

History is local to the browser and origin, so different browsers/devices start
independently. Clearing site storage resets progress. If storage is blocked,
rotation still works during client navigation but cannot persist across reloads.
Markdown emphasis and links work. Without JavaScript, the first
line is shown. Keep options short (one or two lines on a phone) and rebuild/deploy
to publish changes. The current batch is the owner’s writing; add more bullets
to grow the collection.

The name uses a locally bundled Inter variable font on the homepage and section
headers so its glyphs and weight do not depend on fonts installed on the device.

## Writing and projects

The section headings, introductory sentences, and empty-state messages are in
`src/components/CollectionIndex.astro`. Edit `description` near the top to change
“Notes, ideas, and things worth writing down.” or the Projects introduction.
The same description is used for the page metadata. Rebuild/redeploy after editing.

Edit Markdown files in `src/content/writings/` and `src/content/projects/`.
Each filename becomes a URL: `my-note.md` becomes `/writings/my-note/`.
Nested folders work too. Keep filenames stable to keep published links working.
Astro reads these files at build time, so commit your changes and rebuild/redeploy
the site to publish them. No CMS or runtime fetch is needed.

```yaml
---
title: "A title"
description: "A short summary used in the listing and page metadata."
date: 2026-10-17
draft: true
tags: [Design, Development]
---
```

Write the body below the frontmatter using normal Markdown. Headings, lists,
links, images, quotes, tables, and code blocks are styled automatically. Put
images in `public/images/` and reference them as `![Description](/images/name.webp)`.
For a caption, use an HTML `<figure>` with `<img>` and `<figcaption>` inside
the Markdown file; the sample case study demonstrates this. Include descriptive
alt text and image dimensions. The page already supplies the title, so start body
headings at `##`.

Set `draft: false` (or omit it) to publish. Drafts have **no public route** and do
not appear in lists, including in development. The two sample fixtures are
`src/content/writings/test.md` and `src/content/projects/test.md`, both marked
`draft: true`. The public sections remain empty until you publish real content.
To inspect a sample, temporarily set its draft flag to false and rebuild, then
open `/writings/test/` or `/projects/test/`. Restore `draft: true` afterward.
The samples include images, captions, lists, quotes, code, and a table; local
screenshots live in `public/images/lagos/`. Copy a sample to a descriptive filename
and replace its title and content when publishing your own work.
There is a designed empty state when a collection has no published entries.

Projects accept these additional optional frontmatter fields:

```yaml
featured: true
preview:
  src: "/images/lagos/dark-desktop.png"
  alt: "The Lagos portfolio homepage with its geometric map."
url: "https://example.com"
repository: "https://github.com/your-name/your-project"
```

The preview image appears beside the project summary, with a compact thumbnail
and smaller typography on mobile.
Use an image under `public/` and its site path, with descriptive alt text. Images
are displayed at an 8:5 aspect ratio on desktop and cropped to 4:3 on mobile. Without a preview, the summary uses the row;
no number or placeholder is shown. `featured` controls sorting without a visible badge.

Omit links you do not have. Writings are sorted newest first; featured projects
appear first, then newest first. Invalid metadata fails the build with a file-specific
error. Draft dates do not schedule publication: use `draft` explicitly.

## Résumé

Set `resumeUrl` in `src/site.config.ts` to the stable URL of your GitHub PDF.
The same Résumé link appears on the homepage and section navigation, and opens
in a new tab. Updating the PDF at that URL does not require editing the site;
changing the URL requires a rebuild. Until a URL is supplied, Résumé remains a
non-clickable placeholder.

## Navigation and themes

Writings and Projects have shareable index and detail URLs. Astro's client router
adds short fade/movement transitions and browser back/forward navigation while
ordinary links also work without JavaScript. Reduced-motion preferences disable
transitions. The selected theme carries across client navigation; a fresh load
starts in dark mode. Reading pages allow normal document scrolling and text
selection, with footer controls after the content so they never cover the text.

Social icons sit separately in the bottom left on the homepage and in the footer
on reading pages. Email opens `mailto:nosa@nosa.dev`; LinkedIn, Twitter/X, and
GitHub link to the owner’s profiles. Edit these destinations in `socialLinks`
in `src/components/PortfolioUtilities.astro`.

The compass has two small Easter eggs: clicking its arrow spins it once, and
clicking N reveals Nosa for 1.8 seconds. Both controls support keyboard activation;
reduced-motion preferences disable the spin. Navigation clears pending effects.
