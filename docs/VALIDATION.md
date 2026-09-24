# Validation record — 2026-09-25

Validated on the development Linux host, Chromium using software WebGL for browser automation. This does not establish frame rate or real-camera gesture recognition accuracy on every laptop.

- Synthetic hand sequences: two extended fingers / two distinct chest contacts; fists, open palms, left-hand matches, stationary holds and prolonged tracking loss rejected. Short retreat and relative-depth return retained. Esc triggers the frozen-frame sequence and a second Esc cancels it; camera tracks are released.
- Frame caching: in-flight deduplication, foreground priority, generation cancellation and bounded LRU; actual spatial frames keep exact particle counts across seeks and run changes. Warm replay wait measured ~0–0.1 ms in the tested case; scene rebuilding ~42 ms remains and depends on hardware / selection.
- Demo data: 61 original samples per system, exact times 0..60; compressed hashes; all minimal-cell particles and species-count sums; 24 MB compressed combined.
- Static hosting at `/3D_Interactive_Framework/`: both systems reach 60 s, selection works, experiment submission is disabled, all 61 minimal-cell frames finish background caching. No live solver is used.
- Local camera models and WASM load under the same project prefix; the standalone camera fixture performs real inference. A full-scene + camera run timed out under software rendering, so this combination still needs a hardware-accelerated laptop check. Camera behavior is not claimed to be universally validated by synthetic gestures.
- Non-biological Particle Lab: selection and custom procedural sound profiles work; visual screenshot inspected.
- Sonification: actual browser audio output and offline renders verify solo, mute/pause, spectral differences, stereo differences and bounded signal peaks.
- Full Zenodo archive import: checksum-guarded importer and existing conversion/pairing logic provided; a fresh multi-GB import on a clean third-party machine has not been completed here. Packaged demo installation does not require it.

Commands: `npm test`, `python3 scripts/verify_release.py`. Browser tests expect Chromium and Playwright, local API port 8766 for the original backend tests, or the static project-prefix server on 8770 for `static-framework.mjs` / `static-camera.mjs`. The default test command intentionally needs no running scientific backend.

For browser checks: `npm ci`, `npx playwright install chromium`, and `mkdir -p logs`. Set `CHROME_PATH` only if using a separately installed Chromium. `APP_URL` / `STATIC_URL` override the default test origins.
