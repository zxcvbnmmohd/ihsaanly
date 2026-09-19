# Images

## `world-equirectangular.png`

A land mask in equirectangular projection, covering the whole globe exactly:
longitude −180 to 180 across the width, latitude 90 to −90 down the height. So

    x = (lon + 180) / 360 × width
    y = (90 − lat) / 180 × height

is the entire transform, with no crop or inset to correct for. 1440 × 720.

Rasterised from **Natural Earth** `ne_110m_land` (public domain, no attribution
required, naturalearthdata.com) by `scripts/build-world-map.ts`. Grayscale with
alpha, land opaque and sea transparent, so it is tinted at render time and works
in either theme.

Used by the onboarding place card. Nothing on Today draws a map; the spec keeps
the home screen undecorated.

## Unused

`logo.png` and `background-grid.png` came from the project template and are not
referenced anywhere.
