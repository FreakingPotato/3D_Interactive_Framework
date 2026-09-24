# Publishing on GitHub Pages

The repository's original code uses Apache-2.0; third-party datasets keep their original licenses. Check `NOTICE`, `THIRD_PARTY_NOTICES.md`, the asset hashes and citation metadata before publishing.

## Owner setup (once)

1. Review the prepared changes and merge into `main`.
2. If you want a publicly cloneable open-source repository, set repository visibility to **Public** under Settings → General → Danger Zone. Review the contents first; this project intentionally excludes solver environments, raw full datasets, logs, secrets and camera frames.
3. Open Settings → Pages → Build and deployment → Source → **GitHub Actions**.
4. Run **Build and deploy interactive demo** in Actions, or push a change to `main`.
5. The workflow's `github-pages` environment provides the actual published URL. The expected default is `https://freakingpotato.github.io/3D_Interactive_Framework/`.

Do not describe the expected URL as live until the workflow succeeds and the page has been opened and verified. Private repositories may require a paid GitHub plan for Pages; public Pages is available on GitHub Free.

The workflow validates hashes and counts, builds with GitHub's base path, uploads a static artifact and deploys with `pages:write` / OIDC. No external hosting service, server credential, solver or microphone is required. It uses prebuilt files in Git, not Git LFS pointers. It does not automatically change repository visibility or enable Pages settings.

## Contents and size

- Two full recorded cycles: ~163 MB compressed together. Default 60×; the 7200 s minimal-cell trajectory takes about two minutes, or one minute at 120×.
- Scientific view assets, predicted structure meshes, browser libraries and optional hand models are bundled. First view loads only necessary files; the minimal-cell clip downloads progressively in the background, protein and hand assets are demand-loaded.
- Each regular Git file is below 100 MiB. The build asserts the complete site is below 1 GiB; exact size is printed by `build_site.py`.
- GitHub documents a **1 GB published-site limit**, **100 GB/month soft bandwidth limit**, and a **10-minute deployment timeout**. These are limits, not a guarantee of unlimited visitors. See [official Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

Don't preload both complete examples and all optional structures before first interaction. This would waste visitor bandwidth. The selected short clip can be cached completely while the other system remains available on switch.

## Launch presentation

Keep the README about the reusable framework, with the cell examples as demonstrations. Show a short screen recording or screenshot of rotation, selecting a component and the sound panel; never upload a personal camera feed accidentally. Link to the non-biological Particle Lab and adapter guide. Invite users to share new adapters and star the project if useful; don't claim scientific model authorship or guaranteed performance.

Suggested repository description: “Browser-based 3D exploration with local hand gestures, timelines and procedural sonification. Whole-cell demos included; bring your own data.”

Suggested topics: `threejs`, `webgl`, `data-visualization`, `hand-tracking`, `mediapipe`, `sonification`, `scientific-visualization`, `interactive-3d`.

## Local preflight at the project prefix

```sh
python3 scripts/verify_release.py
python3 scripts/build_site.py --base /3D_Interactive_Framework --out /tmp/site-preview/3D_Interactive_Framework
python3 -m http.server 8770 --bind 127.0.0.1 --directory /tmp/site-preview
```

Open `http://localhost:8770/3D_Interactive_Framework/`. Check both systems, time 0 and 60, component selection, sound, camera permission, worker requests and the Particle Lab. The served site needs only static HTTP; no `/api` server should be contacted in demo mode.
