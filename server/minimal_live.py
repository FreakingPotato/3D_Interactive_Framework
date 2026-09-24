"""Local coupled 4DWCM jobs and immutable hook snapshots, separate from references."""
from pathlib import Path
from functools import lru_cache
import json,os,re,signal,subprocess,threading,time,uuid,shutil
import numpy as np
from fastapi import APIRouter,HTTPException
from pydantic import BaseModel,ConfigDict,Field
from .minimal import describe_species,surface
ROOT=Path(__file__).resolve().parents[1];RUNS=ROOT/'data/minimal/live';RUNS.mkdir(parents=True,exist_ok=True)
ENV=ROOT/'vendor/minimal-env';router=APIRouter(prefix='/api/minimal/live');lock=threading.Lock();processes={}
def read(p,default=None):
 try:return json.loads(p.read_text())
 except (OSError,ValueError):return default
def atomic(p,obj):
 tmp=p.with_suffix('.tmp');tmp.write_text(json.dumps(obj,ensure_ascii=False));tmp.replace(p)
def folder(rid):
 if not re.fullmatch(r'local-[a-f0-9]{12}',rid):raise HTTPException(404,'Unknown local run')
 p=RUNS/rid
 if not (p/'manifest.json').exists():raise HTTPException(404,'Unknown local run')
 return p
def manifest(p):
 m=read(p/'manifest.json',{})
 if m.get('status') in ('initializing','running','queued') and m['id'] not in processes:
  pid=m.get('pid')
  try:
   cmd=Path(f'/proc/{pid}/cmdline').read_bytes()
   alive=b'run_minimal.py' in cmd and str(p).encode() in cmd
  except OSError:alive=False
  if not alive:m.update(status='interrupted',error='计算进程已停止；已保存的空间帧可以继续查看。')
 return m
@router.get('/capabilities')
def capabilities():
 validation=read(ROOT/'data/minimal/local-validation.json',{})
 return {'ready':validation.get('passed',False),'validation':validation,'durations':[8,60,600,1800,7200],'max_concurrent':1,'mode':'local-coupled-4DWCM','spatial_resolution_nm':10,'output_interval_seconds':1,'parameters':['seed','duration'],'disk_free_gb':round(shutil.disk_usage(RUNS).free/1e9,1)}
@router.get('/runs')
def listing():return sorted([m for p in RUNS.glob('*/manifest.json') if (m:=manifest(p.parent)) and (not m.get('validation_probe') or m.get('validated'))],key=lambda m:m.get('created_at',0),reverse=True)
class Spec(BaseModel):
 model_config=ConfigDict(extra='forbid')
 seed:int=Field(default=1,ge=1,le=9999)
 duration:int=Field(default=60,ge=1,le=7200)
@router.post('/runs')
def create(spec:Spec):
 if not capabilities()['ready']:raise HTTPException(503,'本地求解器正在验证，暂不能启动新实验。')
 with lock:
  if any(m['status'] in ('running','initializing','queued') for m in listing()):raise HTTPException(409,'已有一个最小细胞正在计算，请先停止或等待完成。')
  if shutil.disk_usage(RUNS).free<max(5e9,spec.duration*3e6):raise HTTPException(409,'可用磁盘不足以保存此长度的空间轨迹，请选择更短的实验。')
  rid='local-'+uuid.uuid4().hex[:12];p=RUNS/rid;p.mkdir();(p/'frames').mkdir()
  m={'id':rid,'name':f'JCVI-syn3A · seed {spec.seed}','spec':spec.model_dump(),'status':'queued','created_at':time.time(),'latest_time':0,'frames':0,'mode':'local-computation','source':'local:official-4DWCM'};atomic(p/'manifest.json',m)
  env=os.environ.copy();env.update(PATH=str(ENV/'bin')+':'+env.get('PATH',''),LD_LIBRARY_PATH=str(ENV/'lib')+':'+env.get('LD_LIBRARY_PATH',''),XDG_CACHE_HOME=str(ROOT/'vendor/cache'),OMP_NUM_THREADS='8',OPENBLAS_NUM_THREADS='1',CUDA_VISIBLE_DEVICES='0',PYTHONUNBUFFERED='1')
  with (p/'solver.log').open('w') as log:proc=subprocess.Popen([str(ENV/'bin/python'),str(ROOT/'scripts/run_minimal.py'),str(p)],cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
  processes[rid]=proc;m['pid']=proc.pid;atomic(p/'manifest.json',m)
  def finish():
   code=proc.wait()
   try:os.killpg(proc.pid,signal.SIGTERM)
   except ProcessLookupError:pass
   with lock:
    current=read(p/'manifest.json',m)
    if current['status'] not in ('completed','failed','cancelled'):current.update(status='failed',error=f'Solver exited ({code})');atomic(p/'manifest.json',current)
    processes.pop(rid,None)
  threading.Thread(target=finish,daemon=True).start();return m
@router.post('/runs/{rid}/cancel')
def cancel(rid:str):
 p=folder(rid)
 with lock:
  m=manifest(p)
  if m['status'] not in ('queued','initializing','running'):return m
  try:os.killpg(int(m['pid']),signal.SIGTERM)
  except ProcessLookupError:pass
  m.update(status='cancelled');atomic(p/'manifest.json',m);return m
@router.get('/runs/{rid}')
def info(rid:str):
 p=folder(rid);m=read(p/'metadata.json',{});times=read(p/'times.json',[])
 if m:
  m['species']=[describe_species(i,n) for i,n in enumerate(m.pop('species_names'))]
 return {**m,'id':rid,'times':times,'manifest':manifest(p)}
@lru_cache(maxsize=16)
def snapshot(rid,index):
 p=folder(rid);path=p/'frames'/f'{index}.npz'
 if index<0 or not path.exists():raise HTTPException(422,'Frame not computed yet')
 with np.load(path) as a:
  particles=a['particles'];sites=a['sites'];counts=a['counts'];t=float(a['time'])
  return {'index':index,'time':t,'site_time':t,'dimensions':list(sites.shape),'spacing_nm':10,'particles':particles.reshape(-1).tolist(),'counts':counts.tolist(),'particle_count':int(len(particles)),'dna_voxels':np.argwhere(sites==5).reshape(-1).tolist(),'ribosome_voxels':np.argwhere((sites==3)|(sites==4)).reshape(-1).tolist(),'membrane':surface(sites!=0),'volume':float(np.count_nonzero(sites)*1e-6),'dna_voxel_count':int(np.count_nonzero(sites==5)),'source':'local:official-4DWCM'}
@router.get('/runs/{rid}/frames/{index}')
def frame(rid:str,index:int):return snapshot(rid,index)
@lru_cache(maxsize=20000)
def row(rid,index):
 p=folder(rid);r=read(p/'frames'/f'{index}.json');m=read(p/'metadata.json');species=[describe_species(i,n) for i,n in enumerate(m['species_names'])]
 with np.load(p/'frames'/f'{index}.npz') as a:counts=a['counts']
 for group in ('rna','ribosome','rnap','protein','state','dna'):r[group]=sum(int(counts[s['id']-1]) for s in species if s['component']==group)
 r['active_ribosomes']=sum(int(counts[s['id']-1]) for s in species if s['name'].startswith('RB_'))
 return r
@router.get('/runs/{rid}/summary')
def summary(rid:str):
 p=folder(rid);times=read(p/'times.json',[])
 return {'rows':[row(rid,i) for i in range(len(times))],'source':'local:official-4DWCM','counts_replicate':None,'pairing':None}
