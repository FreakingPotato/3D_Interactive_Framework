"""Read-only adapter for the authors' unmodified JCVI-syn3A RDME trajectories."""
from pathlib import Path
from functools import lru_cache
import re,json,threading
import numpy as np
import h5py
from skimage.measure import marching_cubes
from fastapi import APIRouter,HTTPException
ROOT=Path(__file__).resolve().parents[1];DATA=ROOT/'data/minimal';SOURCE=DATA/'source';router=APIRouter(prefix='/api/minimal');io_lock=threading.RLock()
DOI='https://doi.org/10.5281/zenodo.15579159'

def trajectory(rep):
 if not re.fullmatch(r'[1-9][0-9]?',rep):raise HTTPException(404,'Unknown replicate')
 p=SOURCE/f'MinCell_{rep}.lm'
 if not p.exists():raise HTTPException(404,'Spatial trajectory is not available')
 return p

@lru_cache(maxsize=1)
def annotations_catalog():
 p=DATA/'annotations.json';return json.loads(p.read_text()) if p.exists() else {}

@lru_cache(maxsize=10000)
def describe_species(i,name):
 annotations=annotations_catalog();match=re.search(r'_(\d{4})(?:_|$)',name);annotation=annotations.get(match.group(1),{}) if match else {}
 return {'id':i+1,'name':name,'component':category(name),**annotation}

def category(name):
 if name=='ribosomeP' or name.startswith('RB_'):return 'ribosome'
 if name=='RNAP' or re.fullmatch(r'RP_\d+_C\d+',name):return 'rnap'
 if re.fullmatch(r'R_\d+(?:_d)?',name):return 'rna'
 if re.fullmatch(r'(?:C_)?P_\d+',name):return 'protein'
 if name.startswith('G_') or name in ['oriC','chromosome','replisome']:return 'dna'
 return 'state'

@lru_cache(maxsize=8)
def metadata(rep):
 with io_lock,h5py.File(trajectory(rep),'r') as f:
  p=f['Parameters'];sim=f['Simulations/0000001'];d=f['Model/Diffusion'];names=[(x.decode() if isinstance(x,bytes) else str(x)) for x in p['SpeciesNames'][:].reshape(-1)]
  times=sim['LatticeTimes'][:];site_times=sim['SiteTimes'][:];keys=sorted(sim['Lattice'].keys());site_keys=sorted(sim['Sites'].keys())
  assert len(times)==len(keys) and len(site_times)==len(site_keys)
  assert np.all(np.diff(times)>=0) and np.all(np.diff(site_times)>=0)
  spacing=float(np.asarray(d.attrs['latticeSpacing']).reshape(-1)[0])*1e9;dims=list(d['LatticeSites'].shape)
  return {'id':rep,'name':f'JCVI-syn3A · {rep}','times':times.tolist(),'site_times':site_times.tolist(),'keys':keys,'site_keys':site_keys,'dimensions':dims,'spacing_nm':spacing,'species':[describe_species(i,name) for i,name in enumerate(names)],'source':DOI,'position_semantics':'Voxel centers; co-located copies retained; no invented subvoxel positions or particle identities.'}

@router.get('/catalog')
def catalog():
 runs=[]
 paired=json.loads((DATA/'pairing.json').read_text()) if (DATA/'pairing.json').exists() else {}
 for p in sorted(SOURCE.glob('MinCell_*.lm')):
  rep=p.stem.split('_')[-1]
  if rep not in paired:continue
  m=metadata(rep);runs.append({'id':rep,'name':m['name'],'start':m['times'][0],'end':m['times'][-1],'frames':len(m['times']),'spacing_nm':m['spacing_nm']})
 return {'system':'minimal','organism':'JCVI-syn3A','mode':'official-spatial-replay','runs':runs,'source':DOI,'ready':bool(runs)}

@router.get('/runs/{rep}')
def info(rep:str):return {k:v for k,v in metadata(rep).items() if k not in ('keys','site_keys')}

@lru_cache(maxsize=8)
def summary(rep):
 m=metadata(rep);groups={c:np.array([s['id']-1 for s in m['species'] if s['component']==c],dtype=int) for c in ['rna','ribosome','rnap','protein','state','dna']}
 with io_lock,h5py.File(trajectory(rep),'r') as f:
  sim=f['Simulations/0000001'];times=sim['SpeciesCountTimes'][:];counts=sim['SpeciesCounts'][:];sums={k:counts[:,idx].sum(axis=1) for k,idx in groups.items()};names=[x['name'] for x in m['species']];active=counts[:,[i for i,n in enumerate(names) if n.startswith('RB_')]].sum(axis=1)
 pairings=json.loads((DATA/'pairing.json').read_text()) if (DATA/'pairing.json').exists() else {};paired=pairings.get(rep,{}).get('counts_replicate');csv=DATA/'counts'/f'{paired}.npz';extras=dict(np.load(csv)) if csv.exists() else {};extra_times=extras.get('time',np.array([]));rows=[]
 for i,t in enumerate(times):
  row={'time':float(t),**{k:int(v[i]) for k,v in sums.items()},'active_ribosomes':int(active[i]),'atp':None,'adp':None,'chromosome':None,'volume':None,'dna_kbp':None}
  j=np.searchsorted(extra_times,t,side='right')-1
  if j>=0 and extra_times[j]==t:
   for key,source in [('atp','M_atp_c'),('adp','M_adp_c'),('chromosome','chromosome')]:
    if source in extras:row[key]=float(extras[source][j])
   if 'Volume' in extras:row['volume']=float(extras['Volume'][j])*m['spacing_nm']**3/1e9
   if row['chromosome'] is not None:row['dna_kbp']=row['chromosome']*.01
  rows.append(row)
 return {'rows':rows,'counts_replicate':paired,'pairing':pairings.get(rep),'source':DOI,'semantics':{'rna':'Unbound/transient R_#### and R_####_d lattice species; excludes ribosome-bound RB_####','ribosome':'ribosomeP + RB_####, not total ribosomal protein subunits','protein':'P_#### + C_P_#### lattice species; excludes assembled complexes and accounting counters','atp':'M_atp_c from the exactly matched official counts_and_fluxes CSV; not spatially localized','chromosome':'10-bp chromosome beads in the authors count table; not chromosome copies'}}

@router.get('/runs/{rep}/summary')
def get_summary(rep:str):return summary(rep)

def surface(mask):
 if not mask.any():return {'vertices':[],'faces':[]}
 v,f,_,_=marching_cubes(mask.astype(np.float32),.5,allow_degenerate=False)
 return {'vertices':np.round(v+.5,3).reshape(-1).tolist(),'faces':f.reshape(-1).tolist()}

@lru_cache(maxsize=12)
def frame(rep,index):
 m=metadata(rep)
 if not 0<=index<len(m['times']):raise HTTPException(422,'Frame outside recorded range')
 t=m['times'][index];si=int(np.searchsorted(m['site_times'],t,side='right')-1)
 with io_lock,h5py.File(trajectory(rep),'r') as f:
  sim=f['Simulations/0000001'];lattice=sim['Lattice'][m['keys'][index]][:];sites=sim['Sites'][m['site_keys'][si]][:] if si>=0 else f['Model/Diffusion/LatticeSites'][:]
  assert lattice.shape[:3]==tuple(m['dimensions'])==sites.shape
  coords=np.nonzero(lattice);ids=lattice[coords].astype(np.int32);particles=np.column_stack([*coords[:3],ids]).astype(np.int32)
  counts=np.bincount(ids,minlength=len(m['species'])+1)[1:]
  # Every nonzero lattice slot is retained, including multiple copies in one voxel.
  return {'index':index,'time':t,'site_time':m['site_times'][si] if si>=0 else 0,'dimensions':m['dimensions'],'spacing_nm':m['spacing_nm'],'particles':particles.reshape(-1).tolist(),'counts':counts.tolist(),'particle_count':int(len(ids)),'dna_voxels':np.argwhere(sites==5).reshape(-1).tolist(),'ribosome_voxels':np.argwhere((sites==3)|(sites==4)).reshape(-1).tolist(),'membrane':surface(sites!=0),'volume':float(np.count_nonzero(sites)*m['spacing_nm']**3/1e9),'dna_voxel_count':int(np.count_nonzero(sites==5)),'source':DOI}

@router.get('/runs/{rep}/frames/{index}')
def get_frame(rep:str,index:int):return frame(rep,index)
