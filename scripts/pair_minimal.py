"""Match spatial trajectories to count traces by exact full-time-series equality."""
from pathlib import Path
import json,h5py,numpy as np
ROOT=Path(__file__).resolve().parents[1];DATA=ROOT/'data/minimal';result={}
for path in sorted((DATA/'source').glob('MinCell_*.lm')):
 with h5py.File(path,'r') as f:
  names=[x.decode() for x in f['Parameters/SpeciesNames'][:].reshape(-1)];s=f['Simulations/0000001'];times=s['SpeciesCountTimes'][:];values=s['SpeciesCounts'][:,sorted([names.index('RNAP'),names.index('ribosomeP')])];checks={name:s['SpeciesCounts'][:,names.index(name)] for name in ['RNAP','ribosomeP']}
 hits=[]
 for csv in (DATA/'counts').glob('*.npz'):
  with np.load(csv) as c:
   idx=np.searchsorted(c['time'],times)
   if np.any(idx>=len(c['time'])) or not np.array_equal(c['time'][idx],times):continue
   if all(np.array_equal(c[key][idx],v) for key,v in checks.items()):hits.append(csv.stem)
 assert len(hits)==1,(path.name,hits)
 result[path.stem.split('_')[-1]]={'counts_replicate':hits[0],'verified_species':['RNAP','ribosomeP'],'samples':len(times),'match':'exact, every recorded time'}
 print(path.name,hits[0],len(times),flush=True)
tmp=DATA/'pairing.tmp';tmp.write_text(json.dumps(result,indent=2));tmp.replace(DATA/'pairing.json')
