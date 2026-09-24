"""Loopback-only observatory API and static site; no external services."""
from __future__ import annotations
import hashlib,json,os,subprocess,threading,time,re
from pathlib import Path
from typing import Literal
from fastapi import FastAPI,HTTPException,Request
from fastapi.responses import FileResponse,StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel,ConfigDict,Field

ROOT=Path(__file__).resolve().parents[1];RUNS=ROOT/'data/runs';RUNS.mkdir(parents=True,exist_ok=True)
MODEL=ROOT/'vendor/vEcoli';PYTHON=MODEL/'.venv/bin/python';processes={};cache={};lock=threading.Lock()
CONDITIONS={'basal':'参考细胞 · M9 葡萄糖','with_aa':'补充氨基酸','no_oxygen':'无氧条件','acetate':'乙酸碳源','succinate':'琥珀酸碳源'}
GENE_WHITELIST={'pgi','pfkA','pykF','zwf','gltA','icd','ptsG','folA','gyrA','fabI'}
FIELDS={
'rna_classes':{'label':'RNA 分类','unit':'fg','source':'listeners.mass.{mRna_mass,tRna_mass,rRna_mass}; other = rna_mass minus three classes'},
'protein_types':{'label':'蛋白质单体分类','unit':'monomer equivalents','source':'listeners.monomer_counts; includes subunits in complexes; ten selected genes plus remainder'},
'mass':{'label':'干质量','unit':'fg','source':'listeners.mass.dry_mass'},
'cell_mass':{'label':'总质量','unit':'fg','source':'listeners.mass.cell_mass'},
'volume':{'label':'体积','unit':'fL','source':'listeners.mass.volume'},
'ribosomes':{'label':'活跃核糖体','unit':'个','source':'listeners.unique_molecule_counts.active_ribosome'},
'rnap':{'label':'活跃 RNA 聚合酶','unit':'个','source':'listeners.unique_molecule_counts.active_RNAP'},
'rna':{'label':'mRNA 数量','unit':'个','source':'sum(listeners.rna_counts.mRNA_counts)'},
'forks':{'label':'复制叉','unit':'个','source':'len(listeners.replication_data.fork_coordinates)'},
'atp':{'label':'ATP','unit':'分子','source':'bulk[ATP[c]]'},
'adp':{'label':'ADP','unit':'分子','source':'bulk[ADP[c]]'},
'protein_mass':{'label':'蛋白质质量','unit':'fg','source':'listeners.mass.protein_mass'},
'rna_mass':{'label':'RNA 质量','unit':'fg','source':'listeners.mass.rna_mass'},
'dna_mass':{'label':'DNA 质量','unit':'fg','source':'listeners.mass.dna_mass'},
'chromosomes':{'label':'完整染色体','unit':'个','source':'listeners.unique_molecule_counts.full_chromosome'},
}
app=FastAPI(title='E. coli Observatory',docs_url=None,redoc_url=None)


def read(path,default=None):
    try:return json.loads(path.read_text())
    except (FileNotFoundError,json.JSONDecodeError):return default

def atomic(path,obj):
    tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(obj,ensure_ascii=False));tmp.replace(path)

def folder(run_id):
    if not re.fullmatch(r'[A-Za-z0-9-]{1,64}',run_id):raise HTTPException(400,'无效实验标识')
    p=RUNS/run_id
    if not (p/'manifest.json').exists():raise HTTPException(404,'实验不存在')
    return p

def manifests():return [read(p) for p in sorted(RUNS.glob('*/manifest.json')) if read(p)]

def rows(run_id):
    p=folder(run_id)/'observations.jsonl'
    if not p.exists():return []
    stat=p.stat();key=(stat.st_mtime_ns,stat.st_size)
    if cache.get(run_id,{}).get('key')==key:return cache[run_id]['rows']
    text=p.read_text();lines=text.splitlines();out=[]
    for line in lines:
        try:out.append(json.loads(line))
        except json.JSONDecodeError:break
    cache[run_id]={'key':key,'rows':out};return out

class Experiment(BaseModel):
    model_config=ConfigDict(extra='forbid')
    kind:Literal['condition','expression']='condition'
    condition:Literal['basal','with_aa','no_oxygen','acetate','succinate']='basal'
    gene:str=Field(default='',max_length=50)
    factor:float=1
    duration:Literal[600,1800,3600]=3600
    seed:int=Field(default=0,ge=0,le=9999)

def normalize(spec):
    d=spec.model_dump();d['gene']=d['gene'].strip()
    if d['kind']=='expression' and d['gene']:
        genes=read(ROOT/'data/gene_presets.json',[]);hits=[g for g in genes if g['symbol'] in GENE_WHITELIST and d['gene'].lower() in (g['symbol'].lower(),g['gene_id'].lower())]
        if len(hits)!=1:raise HTTPException(422,'请选择菜单中的十个支持基因之一，也可输入对应的 EcoCyc ID。')
        if d['factor'] not in (.5,2):raise HTTPException(422,'表达倍率仅支持 0.5× 或 2×')
        d['gene']=hits[0]['symbol'];d['condition']='basal'
    else:
        if d['kind']=='expression':d['condition']='basal'
        d.update(kind='condition',gene='',factor=1)
    return d

@app.middleware('http')
async def local_requests(request:Request,call_next):
    # SSH forwarding uses localhost. Prevent cross-origin pages from launching jobs.
    if request.method=='POST':
        origin=request.headers.get('origin')
        if origin and origin!=str(request.base_url).rstrip('/'):
            from fastapi.responses import JSONResponse
            return JSONResponse({'detail':'不接受跨站实验请求'},status_code=403)
    response=await call_next(request)
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['Referrer-Policy']='no-referrer'
    return response

@app.get('/api/health')
def health():return {'status':'ok','model_ready':(ROOT/'data/parca/kb/simData.cPickle').exists()}

@app.get('/api/capabilities')
def capabilities():return {'conditions':CONDITIONS,'genes':[g for g in read(ROOT/'data/gene_presets.json',[]) if g['symbol'] in GENE_WHITELIST],'factors':[.5,2],'fields':FIELDS,'mode':'real-vEcoli','model_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=MODEL,text=True).strip() if (MODEL/'.git').exists() else read(RUNS/'baseline/manifest.json',{}).get('model_commit','not-installed')}

@app.get('/api/runs')
def list_runs():return manifests()

@app.get('/api/runs/{run_id}')
def get_run(run_id:str):return read(folder(run_id)/'manifest.json')

@app.get('/api/runs/{run_id}/data')
def data(run_id:str,after:float=-1):
    p=folder(run_id);r=rows(run_id)
    return {'manifest':read(p/'manifest.json'),'rows':[x for x in r if x['time']>after],'events':read(p/'events.json',[]),'fields':FIELDS}

@app.get('/api/runs/{run_id}/stream')
def stream(run_id:str):
    p=folder(run_id)
    def events():
        last=None
        for _ in range(1800):
            m=read(p/'manifest.json');msg=json.dumps(m,ensure_ascii=False)
            if msg!=last:yield 'data: '+msg+'\n\n';last=msg
            else:yield ': heartbeat\n\n'
            if m.get('status') in ('completed','failed','cancelled'):break
            time.sleep(2)
    return StreamingResponse(events(),media_type='text/event-stream',headers={'Cache-Control':'no-cache'})

@app.post('/api/experiments/validate')
def validate(spec:Experiment):return {'request':normalize(spec)}

@app.post('/api/runs')
def create_run(spec:Experiment):
    d=normalize(spec)
    if not PYTHON.exists() or not (ROOT/'data/parca/kb/simData.cPickle').exists():raise HTTPException(503,'Solver not installed. Reference replay remains available.')
    with lock:
        baseline=read(RUNS/'baseline/manifest.json',{})
        model_key={k:baseline.get(k) for k in ('model_commit','base_parameter_hash','schema_version')}
        for m in manifests():
            if m.get('request')==d and all(m.get(k)==v for k,v in model_key.items()) and m['status'] not in ('failed','cancelled'):return {'id':m['id'],'cached':True}
        active=[p for p in processes.values() if p.poll() is None]
        if len(active)>=2:raise HTTPException(429,'已有两个实验在运行，请等待完成后再提交。')
        run_id='run-'+hashlib.sha256(json.dumps({'request':d,**model_key},sort_keys=True).encode()).hexdigest()[:14]
        p=RUNS/run_id
        if p.exists():run_id+='-'+str(int(time.time()));p=RUNS/run_id
        p.mkdir();label=CONDITIONS[d['condition']] if d['kind']=='condition' else f"{d['gene']} 表达参数 {d['factor']}×"
        atomic(p/'request.json',d);atomic(p/'manifest.json',{'id':run_id,'label':label,'request':d,'status':'queued','computed_until':0,'model_version':'1.1.0',**model_key})
        env=os.environ.copy();env.update(MPLCONFIGDIR='/tmp/ecoli-mpl',OPENBLAS_NUM_THREADS='1',OMP_NUM_THREADS='1')
        log=(ROOT/'logs'/f'{run_id}.log').open('w')
        process=subprocess.Popen([str(PYTHON),'-u',str(ROOT/'scripts/run_model.py'),run_id],cwd=MODEL,stdout=log,stderr=subprocess.STDOUT,env=env,start_new_session=True);log.close();processes[run_id]=process
        return {'id':run_id,'cached':False}

@app.post('/api/runs/{run_id}/cancel')
def cancel(run_id:str):
    p=folder(run_id);proc=processes.get(run_id)
    if not proc or proc.poll() is not None:raise HTTPException(409,'该任务没有可取消的运行进程')
    proc.terminate();proc.wait(timeout=10);m=read(p/'manifest.json');m.update(status='cancelled');atomic(p/'manifest.json',m);return {'status':'cancelled'}

from server.minimal import router as minimal_router
from fastapi.middleware.gzip import GZipMiddleware
app.include_router(minimal_router)
from server.minimal_live import router as minimal_live_router
app.include_router(minimal_live_router)
app.add_middleware(GZipMiddleware,minimum_size=1000)

app.mount('/',StaticFiles(directory=ROOT/'dist',html=True),name='site')
