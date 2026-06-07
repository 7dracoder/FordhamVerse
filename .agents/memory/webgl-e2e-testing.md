---
name: WebGL e2e testing limitation
description: Why 3D (React Three Fiber / WebGL) scenes can't be visually verified with the runTest testing subagent.
---

This whole agent environment has NO GPU. Any page that needs a WebGL context (React
Three Fiber `<Canvas>`, Three.js, raw WebGL) fails with `Error creating WebGL context` /
`Could not create a WebGL context, VENDOR=0xffff DEVICE=0xffff` / `BindToCurrentSequence
failed`, shown as a Vite runtime-error overlay covering the canvas. This affects BOTH the
`runTest` Playwright subagent AND the `screenshot`/`app_preview` tool — neither can render
3D here. (Non-WebGL pages like the landing screen DO screenshot fine.)

**Why:** Environment limitation, NOT an app bug. The real Replit preview iframe in the
user's own browser (and real phones via QR) have WebGL and render fine.

**How to apply:** For 3D artifacts, verify with `pnpm --filter <pkg> run typecheck` +
browser console logs + architect review of the scene code. Do NOT expect a rendered
screenshot of the 3D scene. Both `runTest` and the screenshot tool CAN still validate
non-WebGL DOM (HUD overlays, buttons, modals) drawn on top of the canvas — the error
overlay is centered and leaves the screen corners visible, so bottom-corner HUD/controls
are still inspectable. To reach a state-gated in-game overlay (no URL route), add a
temporary dev-only auto-enter via a `?query` param, screenshot, then revert.
