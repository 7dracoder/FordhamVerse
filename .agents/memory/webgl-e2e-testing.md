---
name: WebGL e2e testing limitation
description: Why 3D (React Three Fiber / WebGL) scenes can't be visually verified with the runTest testing subagent.
---

The `runTest` Playwright testing subagent runs in a headless browser with no GPU. Any
page that needs a WebGL context (React Three Fiber `<Canvas>`, Three.js, raw WebGL)
fails with `Error creating WebGL context` / `VENDOR/DEVICE disabled` /
`BindToCurrentSequence failed`, which shows up as a Vite runtime-error overlay covering
the canvas.

**Why:** This is an environment limitation of the test harness, NOT an app bug. The
real Replit preview iframe (and real user browsers) have WebGL and render fine.

**How to apply:** For 3D artifacts, verify with `pnpm --filter <pkg> run typecheck` and
by checking browser console logs for real errors in the actual preview. `runTest` can
still validate non-WebGL UI (HTML overlays, buttons, modals, top bars) on the same page —
just expect the canvas itself to error out under test.
