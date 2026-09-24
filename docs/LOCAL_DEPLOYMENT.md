# Local installation and deployment

## 1. Packaged framework and examples (recommended first)

Requirements: Python 3.10+, a current desktop browser with WebGL2 and hardware acceleration, disk space for about 200 MB of files. Camera and audio are optional. There is no account or API key requirement. No Node, Python packages, Blender or scientific solver is needed to view the included examples.

```sh
python3 scripts/verify_release.py
python3 scripts/build_site.py --out _site
python3 -m http.server 8766 --bind 127.0.0.1 --directory _site
```

Visit `http://localhost:8766/`, `?system=minimal`, or `examples/particle-lab/`. On Windows use `py -3`. Stop with Ctrl+C. Keep the terminal running. Refresh after code changes and rebuild `_site`.

The prebuilt files are local: molecular GLB, predicted structure JSON/meshes, MediaPipe WASM and model weights. Sound is generated from bundled code at runtime. `.blend` sources and generation scripts are optional editing materials; ordinary users never have to regenerate them.

A remote GPU host is unnecessary for these examples. If using a remote host, bind to loopback and forward with `ssh -N -L 8766:127.0.0.1:8766 USER@HOST`; then open localhost on the laptop. The **laptop GPU** renders the browser scene. Plain LAN HTTP is not a secure context for camera access; use HTTPS or localhost forwarding.

## 2. Your own data

Use `examples/particle-lab` and the [adapter contract](ADAPTERS.md). Keep your data's units and provenance explicit. Provide finite frame ranges or a bounded stream; do not preload an arbitrarily large decoded dataset. You can build a static site with a different URL prefix:

```sh
python3 scripts/build_site.py --base /my-project --out _site
```

The output must be served at `/my-project/`; the default empty base is for a server root. Do not open the HTML with `file://` because modules, fetch, workers and camera permissions require HTTP(S).

## 3. Optional full WCM backend (advanced, separate from the framework)

`server/` and selected `scripts/` preserve the original adapters for reference. They are **not** a bundled solver distribution and do not automatically install their heavy dependencies. The packaged static demo never calls them.

For a live backend, use an isolated Python environment and install the server dependencies:

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements-server.txt
```

To replay a full minimal-cell trajectory without running a solver, download the original archive from Zenodo and import it:

```sh
.venv/bin/python scripts/import_reference.py --archive /PATH/TO/Minimal_Cell_4DWCM.zip --replicate 1
.venv/bin/uvicorn server.app:app --host 127.0.0.1 --port 8766
```

Open `http://localhost:8766/?system=minimal`. The importer checks the published archive checksum, extracts only selected trajectory files, prepares and exactly pairs scalar count tables, and seeds the short vEcoli example for the home page. It requires substantial extra disk space; it does not run a model. Pass `--replicate all` for all four spatial trajectories. The complete archive import is an advanced path; the ordinary packaged-demo installation above is independent of it.

To run new simulations, provision one or both upstream models following their own documentation:

- **vEcoli:** clone [CovertLab/vEcoli](https://github.com/CovertLab/vEcoli) to `vendor/vEcoli`, checkout `545a41f12cca92c479e1657779a0690c6d1d0fff`, and follow its installation / parameter-calculator instructions. The adapter expects the model Python at `vendor/vEcoli/.venv/bin/python`, a trusted locally produced parameter pickle at `data/parca/kb/simData.cPickle`, and baseline observations / manifests under `data/runs/baseline`. `scripts/run_model.py` is the adapter execution entry; read its arguments and upstream configuration before use. Never load parameter pickles from untrusted sources.
- **Minimal-cell reference replay:** download the original [Zenodo v1 archive](https://doi.org/10.5281/zenodo.15579159) (~12 GB compressed). Existing extraction / count preparation / pairing scripts show the required `data/minimal/source`, `counts`, `annotations.json` and `pairing.json` layout. Trajectory and count-table replica numbers are not interchangeable; exact matching is required. These scripts depend on NumPy, h5py and scientific Python. Ensure enough free disk space for extraction.
- **Minimal-cell live simulation:** the original integration used Linux, NVIDIA CUDA 13 / Blackwell, Lattice Microbes, CVODES / odecell and a customized LAMMPS/Kokkos stack. `scripts/run_minimal.py` is reference integration code with environment assumptions. Use the upstream installation instructions; this package does **not** ship a tested cross-platform solver installer. A Mac can render the UI but this particular solver setup is not supported as a native Mac installation. See upstream requirements and validate your port separately.

If using only one adapter, verify that its endpoints and fallback handling work before enabling the second. For already generated data you can implement the documented API without installing a solver.

Once data/model paths are provisioned, serve the **source `dist/`** with the API:

```sh
.venv/bin/uvicorn server.app:app --host 127.0.0.1 --port 8766
```

This serves `dist/runtime-config.js` with `staticDemo:false`, unlike the packaged `_site` output. Do not expose this experimental job-launching service directly to the Internet. The static GitHub Pages build contains no backend and cannot start model jobs.

## Troubleshooting

- Blank 3D view: inspect WebGL2 support / browser hardware acceleration; try a smaller window or ECO quality.
- Camera unavailable: localhost / HTTPS, site permission, and whether another app owns the camera. It is never needed for mouse interaction.
- Silence: click Enable sound with the mouse, check OS volume, play the timeline or preview the paused state.
- Slow first load: structure and hand assets are loaded on demand; subsequent immutable frames can use the browser cache.
- Low frame rate after caching: reduce quality or scene density in your adapter; caching removes network wait, not GPU work.
- Stale data: change `runtime.dataVersion` for a changed dataset. Cache keys include dataset version and route. Browser site-data controls can remove persistent caches.
