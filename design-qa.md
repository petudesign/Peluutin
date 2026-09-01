# Design QA — kenttätyylit

- Source visual truth: `C:\Users\petsk\AppData\Local\Temp\codex-clipboard-d9a6a046-96a3-4f83-9f80-a1e499ad6216.png`
- Implementation screenshot: `C:\Users\petsk\.codex\visualizations\2026\08\23\01a02e43-f178-7f00-a141-c6697426a068\peluutin-pitch-grass-qa.png`
- Comparison image: `C:\Users\petsk\.codex\visualizations\2026\08\23\01a02e43-f178-7f00-a141-c6697426a068\peluutin-pitch-style-comparison-final.png`
- Viewport: 1440 × 900 CSS px, device density 1
- Source pixels: 1087 × 403
- Implementation pixels: 1440 × 900
- State: Harjoitteet, 3D, iso kenttä, pystysuunta, Nurmi-tyyli, kenttäasetukset avoinna

## Full-view comparison

The implementation preserves Peluutin's existing editor composition while matching the selected reference only where requested: a deep natural-green field, broad alternating mowing stripes, restrained contrast and clear white markings. The reference's stadium, character models and surrounding water are intentionally outside this iteration.

## Focused comparison

The comparison image places the reference field and Peluutin's field in one normalized review canvas. A separate detail crop was unnecessary because the requested fidelity target is the large field surface rather than typography or a small control.

## Required fidelity surfaces

- Fonts and typography: existing Peluutin typography is unchanged; the source offers no applicable UI typography target.
- Spacing and layout rhythm: existing editor layout is preserved. The new two-option style control follows the same spacing and button grid as field size and orientation.
- Colors and visual tokens: grass colors use muted forest greens with a small stripe delta; dark style preserves the existing charcoal palette.
- Image quality and asset fidelity: no raster asset is required for the procedural pitch surface. No stadium or player-character asset was substituted.
- Copy and content: controls are named `Tumma` and `Nurmi`; no reference-only options were added.

## Comparison history

1. Initial grass pass was too saturated and the stripes had overly strong contrast (P2).
2. Grass colors were muted and stripe materials were changed to rough, light-reactive materials.
3. Post-fix comparison shows the requested natural-green balance and lower stripe contrast with no remaining P0/P1/P2 mismatch.

## Interaction checks

- Tumma → Nurmi and Nurmi → Tumma update the field without changing exercise content.
- Existing field size, orientation and goal-size controls remain available.
- Browser console: no errors.

## Follow-up polish

- P3: subtle procedural turf variation could add realism later, but it is not necessary for the current two-style MVP.

final result: passed
