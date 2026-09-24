"""Validate packaged assets and the exact 60-second demo; no external dependencies."""
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
assert frames==list(range(61))
data=json.loads(gzip.decompress((root/'demo-data/vecoli-data.json.gz').read_bytes()));assert [r['time'] for r in data['rows']]==list(range(61));assert data['manifest']['computed_until']==60;assert not data['manifest']['divided']
manifest=json.loads((root/'ASSET_MANIFEST.json').read_text())
for item in manifest['files']:
 p=root/item['path'];assert p.is_file(),p;assert hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256'],p
for p in root.rglob('*'):
 if any(x in p.parts for x in ['.git','node_modules','_site','.venv']):continue
 if p.is_file():assert p.stat().st_size<100*1024**2,p
for required in ['dist/vendor/three.module.js','dist/vendor/three.core.js','dist/vendor/lucide.js','dist/vendor/mediapipe/vision_bundle.mjs','dist/vendor/mediapipe/wasm/vision_wasm_internal.wasm','NOTICE','LICENSE','LICENSES/CC-BY-4.0.txt']:
 assert (root/required).is_file(),required
print('PASS 61 exact frames per system, particle/count invariants, demo checksums, asset checksums and Git file sizes')
