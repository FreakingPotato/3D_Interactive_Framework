"""Run the authors' coupled 4DWCM; publish immutable snapshots after native hooks.
The adapter never alters rates, equations, particle positions or model time steps.
"""
from pathlib import Path
import os,sys,json,time,runpy,random,traceback,shutil
ROOT=Path(__file__).resolve().parents[1]
run=Path(sys.argv[1]).resolve();manifest=json.loads((run/'manifest.json').read_text());spec=manifest['spec']
MODEL=ROOT/'vendor/Minimal_Cell_4DWCM';started=time.time()
os.environ['XDG_CACHE_HOME']=str(ROOT/'vendor/cache')
sys.path.insert(0,str(MODEL));os.chdir(run)
import numpy as np
random.seed(spec['seed']);np.random.seed(spec['seed'])
def atomic(path,value):
 temp=path.with_suffix('.tmp');temp.write_text(json.dumps(value,ensure_ascii=False));temp.replace(path)
def status(**kw):
 manifest.update(kw,wall_seconds=time.time()-started);atomic(run/'manifest.json',manifest)
status(status='initializing',pid=os.getpid())
try:
 import Hook
 import jLM.RDME
 original_run=jLM.RDME.Sim.run
 def seeded_run(self,*args,**kwargs):
  # jLM 2.5's seed convenience path has a class-name typo; use its native file API.
  import lm
  f=lm.SimulationFile(self.filename);f.setParameter('seed',str(spec['seed']));f.close()
  return original_run(self,*args,**kwargs)
 jLM.RDME.Sim.run=seeded_run
 original_hook=Hook.MyOwnSolver.hookSimulation
 last=-1;times=[];names=[];compute_start=None
 def stream(self,t,lattice):
  global last,names,compute_start
  result=original_hook(self,t,lattice)
  if t+1e-6<last+1:return result
  if shutil.disk_usage(run).free<2e9:raise RuntimeError('Insufficient disk space; saved frames remain available')
  p=self.sim_properties
  assert all(isinstance(k,str) for k in p['counts']), 'Non-text species key in coupled state'
  if compute_start is None:compute_start=time.time()
  raw=np.asarray(lattice.getParticleLatticeView());sites=np.asarray(lattice.getSiteLatticeView())
  assert raw.ndim==5 and raw.shape[1:4]==sites.shape,(raw.shape,sites.shape)
  w,z,y,x,slot=np.nonzero(raw);ids=raw[w,z,y,x,slot]
  # jLM exposes XYZ views while the official HDF5 trajectory uses ZYX.
  particles=np.column_stack((x,y,z,ids)).astype(np.uint32)
  sites=sites.transpose(2,1,0)
  if not names:
   mapping=p['name_to_index'];names=[n for n,i in sorted(mapping.items(),key=lambda v:v[1])]
   assert sorted(mapping.values())==list(range(1,len(names)+1))
   atomic(run/'metadata.json',{'id':manifest['id'],'name':manifest['name'],'dimensions':list(sites.shape),'spacing_nm':p['lattice_spacing']*1e9,'species_names':names,'mode':'local-computation','axis_order':'zyx','source':'local:official-4DWCM','position_semantics':'Native solver voxel centers; all occupied slots retained; no interpolated particle identities.'})
  counts=np.bincount(ids,minlength=len(names)+1)[1:];index=len(times)
  tmp=run/'frames'/f'{index}.tmp'
  with tmp.open('wb') as f:np.savez_compressed(f,particles=particles,counts=counts,sites=sites,time=float(t))
  tmp.replace(run/'frames'/f'{index}.npz')
  c=p['counts'];row={'time':float(t),'atp':float(c.get('M_atp_c',0)),'adp':float(c.get('M_adp_c',0)),'chromosome':float(c.get('chromosome',0)),'volume':float(c['Volume'])*p['lattice_spacing']**3*1e18,'dna_kbp':float(c.get('chromosome',0))*.01}
  # The backend aggregates spatial categories from this exact published snapshot.
  atomic(run/'frames'/f'{index}.json',row)
  times.append(float(t));atomic(run/'times.json',times)
  elapsed=time.time()-compute_start
  status(status='running',latest_time=float(t),frames=len(times),compute_seconds=elapsed,biological_seconds_per_wall_second=float(t)/elapsed if elapsed>0 else 0)
  last=float(t)
  print(f'OBSERVATORY_FRAME {index} {t:.6f}',flush=True)
  return result
 Hook.MyOwnSolver.hookSimulation=stream
 # Keep the original working-directory convention, including CME subprocess scripts.
 (run/'input_data').symlink_to(MODEL/'input_data',target_is_directory=True)
 (run/'Run_CME.py').symlink_to(MODEL/'Run_CME.py')
 sys.argv=[str(MODEL/'Whole_Cell_Minimal_Cell.py'),'-od','simulation','-t',str(spec['duration']),'-cd','0','-drs',str(spec['seed']),'-dsd',str(ROOT/'vendor')+'/','-wd',str(run)]
 runpy.run_path(sys.argv[0],run_name='__main__')
 if not times or times[-1]<spec['duration']-1.01:raise RuntimeError('Solver returned before requested time; see solver.log')
 status(status='completed',completed_at=time.time())
except BaseException as exc:
 status(status='failed',error=str(exc)[-1200:]);traceback.print_exc();sys.exit(1)
