---
title: "Lagos, in little shapes"
description: "Turning a familiar coastline into a small, playable corner of the internet."
date: 2026-10-17
featured: true
repository: "https://github.com/nosabecom/portfolio"
---
*Sample case study for testing this layout. The screenshots show the actual portfolio; the copy is ready to replace.*

<figure>
  <img src="/images/lagos/dark-desktop.png" alt="The dark portfolio homepage, with Nosa Omokaro’s circular purple avatar centered over a map of Lagos drawn in tiny geometric shapes." width="1280" height="800" loading="lazy" decoding="async" />
  <figcaption>The starting point: a familiar place, drawn a little differently.</figcaption>
</figure>

## A place, not just a backdrop

A portfolio starts with a simple question: what should someone feel before they read a word?

For this one, the answer is a little curiosity. The coastline of Lagos gives the page a sense of place. Pluses, triangles, crosses, and dots give it a texture that rewards a closer look. The map stays quiet until the pointer moves across it.

The shape of the land and lagoon comes from OpenStreetMap. The contour-like texture is an artistic interpretation, **not measured elevation**.

## Making the map feel alive

The interaction has three small gestures:

1. **Move** to leave a fine, fading trail.
2. **Hold and drag** to stir a wider patch of shapes.
3. **Release** to send a pulse through the field.

The shapes eventually return to their starting positions. That return matters: interaction can change the mood of the map without losing the place it represents.

> The background should invite you to play, then give the page back to you.

## Two ways to see the same place

The dark palette lets the purple avatar and pale lettering lead. The light palette gives the same geometry a softer, paper-like setting. Both use the same coastline and interactions.

<figure>
  <img src="/images/lagos/light-desktop.png" alt="The same Lagos portfolio in light mode, with a warm paper background and green geometric map." width="1280" height="800" loading="lazy" decoding="async" />
  <figcaption>A change of light, with the same underlying geography.</figcaption>
</figure>

### Small decisions that make room for the content

- Geographic labels are faint enough to discover rather than read first.
- The profile has a quiet area behind it so the name stays clear.
- Reading pages soften the map further and put their controls after the article.
- Reduced-motion preferences turn off animated effects and page transitions.

## What sits underneath

The map is drawn on a canvas. Its resting image is cached, and a spatial grid finds the shapes near the pointer. Only the affected areas need to be redrawn. Once the shapes settle, the animation loop stops.

The content takes a different approach: ordinary Markdown files become static pages. Adding a project means adding a file with a title, a summary, and the story behind it.

| Part | What it does |
| --- | --- |
| Geographic data | Defines the coastline and lagoon |
| Canvas field | Draws the shapes and pointer effects |
| Markdown collections | Supply writings and project stories |
| Page transitions | Connect the homepage, lists, and reading views |

## Still taking shape

This is a foundation for a portfolio that can grow one piece at a time. The next test is simple: add real writing, add real projects, and see whether the background still knows when to be quiet.

Read the companion sample, [A little room for curiosity](/writings/a-little-room-for-curiosity/), or [return to the map](/).
