# Harjoitteet MVP — design QA

- Source visual truth: `C:\Users\petsk\Documents\Vaihto\.qa\exercise-reference.png`
- Implementation screenshot: `C:\Users\petsk\Documents\Vaihto\.qa\exercise-implementation-desktop.png`
- Side-by-side comparison: `C:\Users\petsk\Documents\Vaihto\.qa\exercise-design-comparison.png`
- Source pixels: 1851 × 1000
- Implementation pixels and CSS viewport: 1440 × 900 at device scale factor 1
- Comparison normalization: both images scaled to 720 px width and placed side by side without cropping
- State: dark theme, populated exercise, 3D view, two animated paths available

## Full-view comparison evidence

- The reference's editor skeleton is preserved: compact command header, central field, left tool rail, right inspector and bottom playback controls.
- Peluutin's existing navy/green palette, Manrope/DM Sans typography, border radii and button hierarchy intentionally replace the reference product's orange/blue branding.
- The 3D field remains the dominant focal surface while tool panels stay visually secondary.
- Player markers, ball, labels and directional paths are clearly distinguishable against the pitch.
- The implementation is intentionally less control-dense than the reference because this is the first usable MVP, not a full tactics-animation suite.

## Focused region evidence

No separate crop was required. The original 1440 × 900 implementation screenshot was inspected at full resolution, where header controls, tool labels, marker labels, inspector text and playback controls remain readable. The field and chrome were also tested separately in the browser at 834 × 1112 and 390 × 844.

## Required fidelity surfaces

- Fonts and typography: existing Peluutin Manrope and DM Sans hierarchy is consistently applied to the header, tools, inspector, marker labels and playback controls. No browser-default control typography remains.
- Spacing and layout rhythm: three-column editor structure matches the reference. Desktop spacing is balanced; tablet panels use compact padding and a bounded stage height.
- Colors and visual tokens: all application chrome uses Peluutin theme tokens. The pitch and two team colors remain semantically clear in dark mode.
- Image and asset quality: the supplied Peluutin logo assets are reused. The pitch, markers and paths are real Three.js editor geometry rather than a static screenshot or placeholder asset.
- Copy and content: reference-specific Arsenal and scouting copy was intentionally replaced with Finnish Peluutin exercise controls. Above-the-fold labels are limited to the requested editor workflow.

## Interaction evidence

- Opened Harjoitteet from the desktop/tablet Peluutin header.
- Switched between 2D and 3D views using the same exercise data.
- Added a blue player by choosing the tool and clicking the field.
- Selected a marker and created a second pass route to another marker.
- Started and stopped the route pulse animation.
- Verified autosave state and direct `#harjoitteet` reload.
- Verified that the Harjoitteet entry is absent at 390 px and a direct mobile exercise link shows the larger-screen notice.
- Browser console contained only Vite HMR connection noise and upstream Three.js deprecation warnings; no application runtime exception was observed.

## Comparison history

1. P2 — portrait tablet canvas stretched to the full viewport height, leaving excessive empty 3D space. Fixed by bounding the tablet stage and side-panel height to the available editor width.
2. P2 — narrow tablet perspective clipped edge markers. Fixed with aspect-aware 3D camera distance and compact tablet grid tracks.
3. Post-fix evidence — 834 × 1112 tablet capture retained all three editor columns, field controls and visible edge markers without horizontal overflow.

## Remaining intentional deviations

- The reference has a full timeline, camera presets, drawing palette and many equipment tools. These are intentionally excluded from the MVP.
- The MVP uses readable text tool buttons instead of the reference's icon-only rails.
- 3D printing/export is not included.

final result: passed
