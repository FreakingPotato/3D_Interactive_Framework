# Third-party notices and scientific credit

The framework's original code is Apache-2.0. It does **not** relicense the following dependencies, models, datasets or derived assets. Copyright and license texts accompany this distribution in `LICENSES/`.

| Material | Upstream / author | License and changes |
|---|---|---|
| `dist/vendor/three*`, `dist/vendor/addons/` | [Three.js contributors](https://github.com/mrdoob/three), 0.180.0 | MIT; `MarchingCubes.worker.js` changes the module import path for workers. Site build changes public asset prefixes. |
| `dist/vendor/lucide.js` | [Lucide contributors](https://github.com/lucide-icons/lucide), 0.468.0 | ISC, including original icon notices in the supplied license. |
| `dist/vendor/mediapipe/`, `dist/assets/hand-tracking/` | [Google MediaPipe](https://github.com/google-ai-edge/mediapipe); Tasks Vision 1.0.1, Hand Landmarker float16 and Pose Landmarker Lite float16 | Apache-2.0; local packaging, original model weights. Model sources and hashes: `ASSET_MANIFEST.json`. |
| vEcoli example output | [Covert Lab / vEcoli](https://github.com/CovertLab/vEcoli), commit `545a41f12cca92c479e1657779a0690c6d1d0fff` | Upstream software MIT. Demo is our execution's model output, all 0–2529 second mother-cell observations with the original 2530 second division event, losslessly serialized. No claim of authorship of the scientific model. No solver or parameter pickle is redistributed. |
| Minimal Cell example output | Zane Thornburg, Andrew Maytin; [Minimal Cell 4D Whole-Cell Model, Zenodo v1](https://doi.org/10.5281/zenodo.15579159) | **CC BY 4.0**. Selected replicate 1, 0–7200 s, sampled every 30 s with denser frames near binary fission; all original spatial particles in each sampled frame retained at voxel centers. JSON/gzip conversion; derived envelope surface and matching count-table summary. No invented particle identities or subvoxel coordinates. The data license does not automatically cover optional solver dependencies. |
| `dist/assets/structures/` | [AlphaFold DB](https://alphafold.ebi.ac.uk/), Google DeepMind / EMBL-EBI | **CC BY 4.0**. Sequence-matched predicted protein models converted to local coordinates, recolored and used to generate van der Waals surface meshes / LODs. Individual accessions, source species, URLs, sequence hashes and representation appear in `catalog.json` and per-structure data. Predictions are not experimental structures or time-varying cellular conformations. |
| `dist/assets/molecules.glb`, `assets/molecular-surfaces.blend` | This project | Apache-2.0 original procedural illustrative meshes, not copied atomic structures. [David Goodsell / RCSB PDB E. coli illustration](https://pdb101.rcsb.org/sci-art/goodsell-gallery/escherichia-coli-bacterium) was a visual reference; no reference image is redistributed. |
| Armor model and animation | This project | Original procedural fan-inspired artwork. Code Apache-2.0; no film mesh, film footage, character audio or logo assets are included. Software licensing grants no third-party trademark or character rights. Remove this optional Easter egg for applications that require entirely unassociated branding. |
| Procedural sound | This project | Apache-2.0; generated noise, no third-party instrument, voice, animal or music samples. |

## Scientific references

Please credit the framework separately from the scientific models:

1. **Covert Lab. Vivarium E. coli (vEcoli)**, version 1.1.0, pinned commit above. [Software](https://github.com/CovertLab/vEcoli), [official documentation](https://covertlab.github.io/vEcoli/). Its documentation points to the underlying E. coli whole-cell model publication: Macklin et al. (2020), *Simultaneous cross-evaluation of heterogeneous E. coli datasets via mechanistic simulation*, Science, [doi:10.1126/science.aav3751](https://doi.org/10.1126/science.aav3751).
2. **Thornburg, Z. R., Maytin, A., et al. (2026)**. *Bringing the genetically minimal cell to life on a computer in 4D*. Cell 189, 2582–2597.e27. [doi:10.1016/j.cell.2026.02.009](https://doi.org/10.1016/j.cell.2026.02.009). [Correction: doi:10.1016/j.cell.2026.04.003](https://doi.org/10.1016/j.cell.2026.04.003). Dataset: **Thornburg, Z. and Maytin, A. (2025)**, *Minimal Cell 4D Whole-Cell Model*, v1, [doi:10.5281/zenodo.15579159](https://doi.org/10.5281/zenodo.15579159).
3. **Varadi et al. (2024)**. *AlphaFold Protein Structure Database in 2024: providing structure coverage for over 214 million protein sequences*. Nucleic Acids Research. [doi:10.1093/nar/gkad1011](https://doi.org/10.1093/nar/gkad1011).

No paper figures, recordings, personal camera frames, private datasets or complete solver environments are included. This is an independent visualization project, not an official interface endorsed by these authors.
