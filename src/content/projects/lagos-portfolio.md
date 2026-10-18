---
title: "Lagos, in little shapes"
description: "An interactive portfolio built around the coastline of Lagos. A quiet map that responds to you."
date: 2026-10-17
tags: [Astro, TypeScript, Canvas]
featured: true
repository: "https://github.com/nosabecom/portfolio"
---
A map of Lagos made from pluses, triangles, crosses, and dots. The coastline and
lagoon come from OpenStreetMap; the texture is an artistic interpretation of the terrain.

## A map you can touch

Moving the pointer leaves a fading trail. Dragging stirs the shapes, and releasing
sends a small pulse across the map. The motion settles back into the coastline.

## Keeping it quiet

The background makes room for the content. Geographic labels stay faint, the
palette switches between dark green and paper, and motion respects the device’s
reduced-motion preference.

## Built to stay light

The map is drawn on a canvas. A cached resting image and a spatial grid limit how
much needs to be redrawn, and animation stops once the shapes settle.

Writings and project pages are generated from Markdown, keeping the content easy
to update alongside the code.
