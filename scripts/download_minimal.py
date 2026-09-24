"""Resume a verified-range download of the official Zenodo archive."""
import os,json,time,urllib.request,concurrent.futures,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];p=ROOT/'data/minimal/source/Minimal_Cell_4DWCM.zip';state=p.with_suffix('.parts.json');total=12011870652;chunk=64*1024*1024
original=p.stat().st_size if p.exists() else 0
done=set(json.loads(state.read_text())) if state.exists() else set(range(original//chunk))
fd=os.open(p,os.O_RDWR|os.O_CREAT);os.ftruncate(fd,total)
url='https://zenodo.org/records/15579159/files/Minimal_Cell_4DWCM.zip?download=1'
def part(i):
 a=i*chunk;b=min(total,a+chunk)-1
 for attempt in range(6):
  try:
   req=urllib.request.Request(url+f'&range={a}',headers={'Range':f'bytes={a}-{b}','User-Agent':'EcoliObservatory/1.0'})
   with urllib.request.urlopen(req,timeout=90) as r:
    assert r.status==206 and r.headers['Content-Range'].startswith(f'bytes {a}-{b}/');pos=a
    while data:=r.read(1024*1024):os.pwrite(fd,data,pos);pos+=len(data)
   assert pos==b+1;return i
  except Exception as e:print('retry',i,type(e).__name__,flush=True);time.sleep(5*(attempt+1))
 raise RuntimeError(f'Failed part {i}')
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
 for i in pool.map(part,[i for i in range((total+chunk-1)//chunk) if i not in done]):
  done.add(i);state.write_text(json.dumps(sorted(done)));print('parts',len(done),'/',(total+chunk-1)//chunk,flush=True)
os.close(fd)
h=hashlib.md5()
with p.open('rb') as f:
 while b:=f.read(8*1024*1024):h.update(b)
assert h.hexdigest()=='2d46a18ba3cd51922c8082a6c655aa66';print('MD5 verified',flush=True)
