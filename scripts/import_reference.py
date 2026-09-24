"""Import full reference trajectories from an already downloaded official archive.
No model computation. Never extracts archive paths or executable model code.
"""
import argparse,hashlib,json,shutil,subprocess,sys,tarfile,zipfile,gzip
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--archive',type=Path,required=True);p.add_argument('--replicate',choices=['1','2','3','4','all'],default='1');args=p.parse_args()
archive=args.archive.resolve();h=hashlib.md5()
with archive.open('rb') as f:
 while chunk:=f.read(8*1024*1024):h.update(chunk)
if h.hexdigest()!='2d46a18ba3cd51922c8082a6c655aa66':raise SystemExit('Archive checksum differs from Zenodo v1. Import stopped.')
source=ROOT/'data/minimal/source';source.mkdir(parents=True,exist_ok=True)
# Existing preparation script expects this well-known filename.
link=source/'Minimal_Cell_4DWCM.zip'
if link.resolve()!=archive:
 if link.exists():raise SystemExit('A different archive already exists in data/minimal/source')
 try:link.symlink_to(archive)
 except OSError:shutil.copyfile(archive,link)
with zipfile.ZipFile(archive) as z,z.open('Minimal_Cell_4DWCM/DATA/MinCell_lm_trajectories.tar.gz') as f,tarfile.open(fileobj=f,mode='r|gz') as tar:
 for info in tar:
  name=Path(info.name).name
  if not info.isfile() or name not in ['MinCell_'+r+'.lm' for r in (['1','2','3','4'] if args.replicate=='all' else [args.replicate])]:continue
  target=source/name
  if target.exists():print('Keeping existing',name);continue
  partial=target.with_suffix('.partial')
  with partial.open('wb') as out:shutil.copyfileobj(tar.extractfile(info),out,1024*1024)
  if partial.stat().st_size!=info.size:raise SystemExit('Incomplete trajectory')
  partial.replace(target);print('Imported',name,flush=True)
for script in ['prepare_minimal_counts.py','pair_minimal.py']:subprocess.run([sys.executable,str(ROOT/'scripts'/script)],check=True)
# Preserve display annotations from the licensed compact metadata, not model code.
meta=json.loads(gzip.decompress((ROOT/'demo-data/minimal-meta.json.gz').read_bytes()));annotations={}
for s in meta['species']:
 locus=s.get('locus_tag')
 if locus:annotations[locus.split('_')[-1]]={k:s[k] for k in ['locus_tag','gene','product','type'] if k in s}
(ROOT/'data/minimal/annotations.json').write_text(json.dumps(annotations))
# Seed the read-only vEcoli clip so the default home page also works without a solver.
demo=json.loads(gzip.decompress((ROOT/'demo-data/vecoli-data.json.gz').read_bytes()));baseline=ROOT/'data/runs/baseline';baseline.mkdir(parents=True,exist_ok=True)
if not (baseline/'manifest.json').exists():
 (baseline/'manifest.json').write_text(json.dumps(demo['manifest']));(baseline/'observations.jsonl').write_text(''.join(json.dumps(r)+'\n' for r in demo['rows']));(baseline/'events.json').write_text('[]')
(ROOT/'logs').mkdir(exist_ok=True)
print('Reference data ready. Start: .venv/bin/uvicorn server.app:app --host 127.0.0.1 --port 8766')
