# Third-party software, map data and services

Oriel Placement Desk is an independently maintained decision-support application.
It is not an official Oriel, NHS England, OpenStreetMap, OpenFreeMap, MapTiler, MapLibre,
Leaflet or Supabase service. References to vendors and data sources below
acknowledge dependencies; they do not imply endorsement or affiliation.

## Software used in the deployed site

- **Leaflet 1.9.4** — interactive markers, controls and fallback map layers.
  Its BSD-2-Clause license and copyright notice are retained in the
  distributed library. https://github.com/Leaflet/Leaflet
- **MapLibre GL JS** — WebGL vector-map rendering. BSD-3-Clause.
  https://github.com/maplibre/maplibre-gl-js
- **MapLibre GL Leaflet adapter** — bridges the Leaflet and MapLibre layers.
  Check and retain the adapter's notices and terms:
  https://github.com/maplibre/maplibre-gl-leaflet
- **Supabase JavaScript client** — optional signed-in workspace persistence.
  https://github.com/supabase/supabase-js

Using these software libraries does not make the app dependent on any other
Oriel placement explorer. Third-party licence terms still apply.

## Basemap and geospatial data

- **MapTiler** hosts the custom Editorial Light vector-map style used as the
  default light-mode basemap. Browser API access is restricted by allowed HTTP
  origins; attribution remains visible when this style is active.
  https://www.maptiler.com/copyright/
- **OpenFreeMap** provides key-free hosted vector basemaps. The on-map
  credits identify OpenFreeMap and OpenMapTiles.
  https://openfreemap.org/
- **OpenMapTiles / OpenStreetMap** provide map schema and map data.
  Map attribution must remain visible, including the credit to
  OpenStreetMap contributors. https://www.openstreetmap.org/copyright
- **OpenStreetMap Standard tile service** is used as a limited fallback when
  WebGL rendering fails, subject to its tile usage policy.
  https://operations.osmfoundation.org/policies/tiles/
- **postcodes.io** is used to resolve UK programme postcodes:
  https://postcodes.io/

A map-provider migration must preserve relevant map-data attribution and
respect tile/service usage conditions.

## Programme catalogue

Programme entries come from an exported Oriel pharmacy programme CSV
provided by the project maintainer, not from the former explorer's embedded
snapshot. It is an historical export and not an official live availability
feed. Publication, reuse and any future commercial use should be reviewed
against the applicable source-data terms.

## Historical development

This project originally started from a GitHub fork. Its active bundled legacy
explorer was removed on 7 November 2026 as the deployed application shifted to
its own programme dataset, interface and map integration. Historical Git
commits may still preserve earlier versions. A detached GitHub repository
does not automatically rewrite or extinguish pre-existing copyright rights.
