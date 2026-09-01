**Source visual truth**

- `C:\Users\petsk\AppData\Local\Temp\codex-clipboard-30911371-5beb-4853-aa42-c56f72a49647.png`
- Source pixels: 482 × 295.

**Implementation evidence**

- `C:\Users\petsk\Documents\Vaihto\design-qa-implementation.png`
- Header crop: `C:\Users\petsk\Documents\Vaihto\design-qa-implementation-header.png`
- Side-by-side comparison: `C:\Users\petsk\Documents\Vaihto\design-qa-comparison.png`
- Browser viewport and implementation pixels: 482 × 800 at 1× density; comparison crop 482 × 96.
- State: existing match, mobile breakpoint, dark theme, sport menu closed.

**Findings**

- No actionable P0–P2 mismatches for the requested change. The sport selector now shares the score-and-clock row and remains separated from the home score control.
- Fonts and typography: existing application typography is preserved; content differs from the reference because live local match data is used.
- Spacing and layout rhythm: the selector, team scores, and clock are vertically centered on one row. The compact spacing remains usable at the tested 482 px width.
- Colors and visual tokens: the implementation uses the currently selected dark theme; the reference is light. No theme tokens were changed for this layout-only request.
- Image quality and asset fidelity: the existing vector Peluutin favicon remains sharp and correctly scaled.
- Copy and content: existing labels and match state are preserved.

**Interaction and technical checks**

- Sport selector opens the Jalkapallo/Futsal menu and closes again.
- Browser console errors checked: none.
- Focused comparison used the 96 px header crop because the requested change affects only the mobile header.

**Comparison history**

- Initial implementation moved `.mobile-brand-sport` from the separate upper position to vertical center with `top: 50%` and `translateY(-50%)`.
- Post-fix evidence confirms the control sits on the same level as the score and clock controls without overlap at 482 px.

**Follow-up polish**

- None required for this experiment. Narrower mobile widths can be revisited only if real-device testing exposes crowding.

final result: passed
