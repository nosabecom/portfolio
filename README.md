# Nosa's portfolio

An Astro site for nosa.dev with an interactive, canvas-rendered map of Lagos.
Pluses, crosses, triangles, and dots replace conventional map fills and contour lines.

## Development

Requires Node 22.12+ and Bun. Install the locked dependencies with
`bun install --frozen-lockfile`, then run `bun run dev`. `bun run build` produces
the static site in `dist/`; `bun run preview` serves that build locally.

## Background

- `src/components/LagosBackground.astro`: page framing and subtle geographic labels.
- `src/lib/lagos-field.ts`: batched vector glyphs, procedural relief, shoreline emphasis,
  spring-driven pointer wakes, fading traces, and click/tap pulses. The canvas ignores pointer events, so foreground links and
  controls remain usable. Add `data-no-terrain` to other foreground interaction areas.
- `src/lib/lagos-geography.ts`: bundled OpenStreetMap shoreline and lagoon geometry.
  See `src/lib/lagos-geography.sources.md` for data provenance and licensing.

The geographic land/water boundaries are sourced from OpenStreetMap; the
contour-like texture is generative art, not measured elevation. No map API,
external font, or runtime network request is required for the background.

Move to leave a fine trail; hold and drag for a wider brush with stronger motion.
Release to send out a pulse. Touch drawing is confined to the map surface, leaving
the surrounding page available for scrolling.

Motion respects the device's reduced-motion preference and suspends while the page is hidden.
The resting field is cached. A spatial grid limits interaction queries, and only
changed canvas tiles are restored. Vector paths are grouped by color and opacity;
frames stop when the bounded particles and pulses settle. No animation framework
or runtime dependency is needed.
The bottom-right theme button switches between dark green and paper palettes. Decorative labels do not select while drawing; foreground links and controls remain interactive.

The profile navigation reserves Writings, Résumé, and Projects. Set their `href` values
in `profileLinks` in `LagosBackground.astro` when destinations are ready. Until then,
they render as non-clickable placeholders; no blog or showcase routes are published yet.
