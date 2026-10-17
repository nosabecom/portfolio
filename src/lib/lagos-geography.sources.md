# Lagos shoreline data

`lagos-geography.ts` contains a simplified, north-up land/water mask of Lagos,
Nigeria, covering 3.18–3.65° E and 6.36–6.67° N. It preserves the Lagos Lagoon,
Lagos Island and Ikoyi, Victoria Island, the Lekki peninsula, the harbour,
Badagry Creek, and the Atlantic coastline. This is a geographic foundation for
an artistic background. Symbol density, animation, and any contour-like bands
are not measured elevation, bathymetry, or navigational information.

## Source and license

Geographic data **© OpenStreetMap contributors**, licensed under the
[Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
The derived coordinate dataset in this module is provided under the same
license. Display the attribution with a link to
[OpenStreetMap copyright](https://www.openstreetmap.org/copyright) when rendering it.

The data was retrieved through
[`overpass.private.coffee`](https://overpass.private.coffee/api/interpreter).
The returned dataset's `timestamp_osm_base` is `2026-07-28T02:16:18Z`.

Source ways: 13762061, 13762125, 1391420888 (`natural=coastline`).
Source relations: 2116060 (Badagry Creek), 2116203 (Lagos Lagoon), 2116206
(Five Cowries Creek), 17721809 (Commodore Channel), and the unnamed water bodies
10183775, 10272204, 10929549, 10929555, 10952460.

The two source queries were:

```overpass
[out:json][timeout:25];
way["natural"="coastline"](6.36,3.18,6.67,3.65);
out geom;
```

```overpass
[out:json][timeout:25];
rel["natural"="water"](6.36,3.18,6.67,3.65);
out geom;
```

## Processing

1. Join the coastline ways and close the ocean polygon south of the viewport.
2. Polygonize each relation's outer and inner ways and subtract its inner rings.
3. Union the water polygons and intersect them with the viewport bounds.
4. Simplify with a topology-preserving tolerance of 0.0005 degrees (approximately
   55 metres locally). Remove disconnected water polygons smaller than 0.000001
   square degrees. Tiny standalone ponds not represented by these relations
   are omitted.
5. Normalize longitude to x and inverted latitude to y, round to five decimals,
   and remove duplicate closing vertices. The result has three polygons and
   1,238 vertices, including island holes.

This preprocessing used Shapely 2.2.0 outside the project. There are no added
runtime dependencies or map API requests. `LAGOS_ASPECT_RATIO` compensates for
longitude scale at the midpoint latitude when the unit square is displayed.
