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
