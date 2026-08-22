# Harjoitteet MVP — design QA

- Visual reference: user-supplied dark full-screen tactics editor (`codex-clipboard-40d5fb03-84bf-4f3f-a305-142c9f436b77.png`)
- Verification viewport: desktop browser at 1280 × 720
- State: dark full-screen editor, populated exercise, 3D view, two animated pass routes

## Full-view comparison evidence

- The field now owns the full viewport, matching the reference's canvas-first hierarchy. Header, tool rail, inspector and playback are compact floating overlays instead of permanent page columns.
- Peluutin branding is retained through the navy panels, blue selected states, orange playback action, Manrope typography and existing logo assets.
- The pitch uses a dark alternating stripe surface. Outer boundary, halfway line, centre circle and spot, both penalty and goal areas, penalty spots and arcs, corner arcs, goals and perimeter advertising boards are visible.
- Player tokens are smaller and taller, with bright team colours and a light top rim. 2D tokens do not cast shadows.
- Routes use a thicker bright line, destination arrow and three visible moving pulses.

## Required fidelity surfaces

- Layout: compact floating controls preserve the reference's field-dominant workspace without copying its branding.
- Tools: cursor, two player colours, ball, pass, run, free draw, straight line, rectangle, circle, text and eraser are present as real outline icons with accessible labels.
- Tablet and mobile: the editor remains available from 721 px upward and is intentionally replaced by the existing larger-screen notice on phones.
- Persistence: existing local drafts remain compatible; missing annotation data is migrated to an empty list and new work continues to autosave locally.

## Interaction evidence

- Production typecheck and all 20 repository tests pass.
- Production build succeeds; the exercise editor remains a separately loaded chunk.
- The live browser render was inspected after HMR at the current local preview.
- The new tool data flow supports click-to-add markers/text, drag-to-draw lines and shapes, object deletion, marker movement and path playback.

## Remaining intentional deviation

- Timeline/phase authoring is deliberately deferred. It will be a separate explicit mode rather than silently recording every canvas edit.
- Camera presets, templates, equipment libraries and print/export are not part of this iteration.

final result: passed

---

# Design QA — Harjoitteet: pelaajat ja maalit

## Evidence

- Reference: `C:\Users\petsk\AppData\Local\Temp\codex-clipboard-4d47ffda-739e-4208-aa75-9c2d07b9619e.png`
- Implementation: `C:\Users\petsk\AppData\Local\Temp\peluutin-harjoitteet-goal-full.png`
- Focused comparison: `C:\Users\petsk\AppData\Local\Temp\peluutin-goal-comparison.png`
- Viewport: 1280 × 720, Harjoitteet, light theme, 3D, junior goal

## Comparison

- The reference goal's readable white front frame and net volume are preserved.
- The implementation intentionally keeps Peluutin's stylized pitch and restrained palette instead of copying the reference's photorealistic grass and stadium.
- Extra freestanding support poles from the reference were omitted as requested.
- The goal front is aligned just outside the end line so the frame no longer sits inside the playing area.

## QA results

- P0: none
- P1: none
- P2: none
- P3: net opacity and density may be tuned after user testing, but the geometry is readable in both themes and both 2D/3D views.
- Name visibility: passed; player names hide while exercise annotations remain visible.
- Player roles: passed; own-player roles use distinct colors and opponents remain neutral gray.
- Goal sizes: passed; small, junior, and full-size presets update the scene and persist in the exercise draft.
- Automated checks: TypeScript, 38 tests, and production build passed.

## Result

Passed for the requested MVP scope.

---

# Design QA — Harjoitteet: elementit ja aikajanan rajat

## Evidence

- Source visual truth: `C:\Users\petsk\AppData\Local\Temp\codex-clipboard-8eb5bbfe-b6fc-46b6-8008-554a32293fc5.png`
- Browser-rendered implementation: `C:\Users\petsk\AppData\Local\Temp\peluutin-elements-full.png`
- Focused comparison: `C:\Users\petsk\AppData\Local\Temp\peluutin-elements-comparison.png`
- Source pixels: 1000 × 1000. Implementation pixels/CSS viewport: 1280 × 720 at 1× density. Focus comparison uses an implementation crop from the same viewport.
- State: Harjoitteet, light theme, 3D, names hidden, Lisää elementtejä open, exercise mannequin on the field.

## Full-view comparison evidence

- The new element menu stays inside the existing floating tool-rail system and does not increase toolbar density.
- Ball, cone, and mannequin are presented as three clearly named choices with short usage hints.
- The mannequin remains legible at normal field scale and uses the reference's loop, torso, legs, bright training color, and dark base without copying photorealistic material noise into the diagram style.

## Focused comparison evidence

- The source and implementation were combined in one comparison image. The simplified 3D model preserves the source object's identifying silhouette while matching Peluutin's low-detail field markers.
- The source's perforated torso is intentionally omitted at this scale because it would shimmer and reduce clarity in the zoomable 3D scene.

## Interaction and accessibility checks

- Lisää elementtejä opens from the tool rail; mannequin placement and deletion work in the rendered browser.
- The mannequin has separate readable 2D and 3D representations.
- The timeline playhead exposes a larger visible handle and uses grab/grabbing cursors instead of a resize cursor.
- Clip trim handles expose `aria-valuemax="5000"`; duration logic also clamps natural and edited clips to 5000 ms.
- Ball remains limited to one and equipment cannot be used as a pass endpoint.
- TypeScript, 38 automated tests, and the production build pass. The rendered view showed no visible runtime error state.

## Findings

- P0: none.
- P1: none.
- P2: none.
- P3: the mannequin torso could receive a very subtle punched-hole material later if testing shows the detail remains stable at ordinary zoom levels.

## Comparison history

- Initial state had no equipment library, used a direct ball toolbar action, allowed clip durations beyond the intended limit, and showed an east-west resize cursor on the playhead.
- The final state groups equipment, adds cone/mannequin models, clamps all clips to five seconds, and gives the playhead a dedicated grab affordance.

final result: passed
