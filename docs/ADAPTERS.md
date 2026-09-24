# Adapting the framework

Start with the executable non-cell example `examples/particle-lab/app.js`. It uses synthetic data so you can inspect every integration point without downloading a model.

## Scene contract

`createGestureScene({scene, camera, cell, controls, canvas, pick, selectHit, invalidate, cancelMotion})` in `dist/gesture-scene.js` accepts ordinary Three.js objects. `cell` is simply the root group to rotate; it need not represent a cell. `pick({clientX,clientY})` returns a Three.js intersection, or nothing. Selected meshes should have `userData.component`, a material color and optional clipping planes. Instanced meshes are supported. `invalidate()` requests a redraw; `cancelMotion()` stops competing camera animation.

The bridge exposes `rotate(dx,dy,roll)`, `zoom(delta)`, `hover(x,y)`, `click(x,y)`, `clear()` and `reset()`. Rotation uses camera-relative axes and can overturn the root group. It is independent of the domain's data source.

## Controller contract

`initHandControl(() => app)` expects:

```js
const app = {
  state: {
    run: 'my-dataset', ready: true, selected: null,
    time: 0, speed: 1, playing: false,
    rows: [{time: 0}, {time: 60}]
  },
  select(componentIdOrNull) { /* update state and scene */ },
  setTime(seconds) { /* display nearest recorded state; may return a Promise */ },
  view: { gestures: sceneBridge }
};
```

A spatial adapter can expose `state.rep` and `state.meta.times` instead of `run` / `rows`. Never infer stable molecule identity from adjacent frame slots unless your data actually provides it.

The UI controller currently expects `.header-right`, `#scene`, `#play`, `#context-opacity` and `#cutaway`. Range inputs should dispatch `input` to apply changes. It automatically supports buttons, details/summary and modal controls via dwell. The particle example supplies these elements. For a completely different UI, use the pure `HandGestures` and `DwellSelection` classes directly and write your own routing layer. This DOM dependency is explicit; we do not yet claim a stable headless SDK.

## Sound without cell assumptions

`CellSoundEngine` is a procedural engine despite its historical class name. Supply custom profiles and a quantity snapshot:

```js
const engine = new CellSoundEngine(audioContext, {profiles: {
  dust: {hz: 240, q: .6, grain: .12, rate: 20, ref: 1000}
}});
engine.update({ready: true, selected: null, counts: {dust: 450}, activity: {}},
              {audible: true, speed: 1, volume: .25});
```

`hz` / `q` shape a broad noise band; `grain` and `rate` define procedural microtexture, not biological reaction rates; `ref` sets a logarithmic density reference. `activity` optionally contains active population counts. A selected group mutes all others with a short fade. Dispose the engine and close the AudioContext when leaving your application. `sampleSound()` and `cell-sound-control.js` are specifically the cell adapters and UI, not required for a new domain.

## Data / frames

`data-source.js` selects the real API or static route manifest. Static payloads are lossless JSON/gzip; `runtime-config.js` controls the build's base URL and immutable dataset version. The builder preserves API identifiers while relocating public assets for GitHub project paths.

For the existing minimal-cell adapter, frames contain `index`, `time`, `dimensions`, `spacing_nm`, flat `[x,y,z,speciesId,...]` particles, species `counts`, region voxel lists and envelope vertices/faces. Metadata defines species-to-component mapping. See an exported frame using `gzip -dc demo-data/minimal-frame-000.json.gz` and its provenance. Units and voxel semantics must remain explicit.

`FrameCache` is a domain-independent bounded decoded-data LRU. `frame-store.js` stores compressed raw JSON; `frame-worker.js` adds the cell-specific DNA surface preparation. Replace that preparation stage for a different application; don't pretend a cell mesh schema is universal.

## Responsibilities

Adapters own scientific/physical units, component classification, state sampling, source credit and missing-data behavior. The framework owns interaction mechanics and display. Do not attach a solver's name or logo to an unrelated simulation, imply upstream endorsement, or present illustrative shapes, stereo placement or sounds as measurements.
