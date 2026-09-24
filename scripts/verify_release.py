"""Validate packaged assets and the full-cycle demo; no external dependencies."""
import gzip,hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
provenance=json.loads((root/'demo-data/provenance.json').read_text())
for name,item in provenance['files'].items():
 data=(root/'demo-data'/name).read_bytes();assert hashlib.sha256(data).hexdigest()==item['sha256'],name
 assert len(data)==item['bytes'];json.loads(gzip.decompress(data))
frames=[]
for path in sorted((root/'demo-data').glob('minimal-frame-*.json.gz')):
 f=json.loads(gzip.decompress(path.read_bytes()));assert len(f['particles'])==f['particle_count']*4;assert sum(f['counts'])==f['particle_count'];assert len(f['dna_voxels'])==f['dna_voxel_count']*3;frames.append(f['time'])
meta=json.loads(gzip.decompress((root/'demo-data/minimal-meta.json.gz').read_bytes()))
assert frames==meta['times'] and frames[0]==0 and frames[-1]==7200
assert len(frames)==provenance['spatial_frames'];assert max(b-a for a,b in zip(frames,frames[1:]))<=30
division=meta['demo_cycle']['division_time'];assert division==provenance['minimal_division_time']
assert all(t in frames for t in [division-1,division,division+1])
for i,t in enumerate(frames):
 f=json.loads(gzip.decompress((root/f'demo-data/minimal-frame-{i:03}.json.gz').read_bytes()))
 assert f['index']==i and f['source_index']==t and f['time']==t
routes=json.loads((root/'demo-data/routes.json').read_text());assert len([r for r in routes if '/frames/' in r])==len(frames)
data=json.loads(gzip.decompress((root/'demo-data/vecoli-data.json.gz').read_bytes()));assert [r['time'] for r in data['rows']]==list(range(2530));assert data['manifest']['computed_until']==2529;assert data['manifest']['divided'];assert data['events'][0]['time']==2530
manifest=json.loads((root/'ASSET_MANIFEST.json').read_text())
for item in manifest['files']:
 p=root/item['path'];assert p.is_file(),p;assert hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256'],p
for p in root.rglob('*'):
 if any(x in p.parts for x in ['.git','node_modules','_site','.venv']):continue
 if p.is_file():assert p.stat().st_size<100*1024**2,p
for required in ['dist/vendor/three.module.js','dist/vendor/three.core.js','dist/vendor/lucide.js','dist/vendor/mediapipe/vision_bundle.mjs','dist/vendor/mediapipe/wasm/vision_wasm_internal.wasm','NOTICE','LICENSE','LICENSES/CC-BY-4.0.txt']:
 assert (root/required).is_file(),required
print(f'PASS full cycles: {len(frames)} native spatial snapshots through 7200 s, division-adjacent frames, 2530 vEcoli observations + event; counts, hashes and Git size limits')
