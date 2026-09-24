"""Stream official ZIP -> gzip -> tar; wait for verified downloaded ranges."""
import io,json,time,zipfile,tarfile,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];src=ROOT/'data/minimal/source';archive=src/'Minimal_Cell_4DWCM.zip';chunk=64*1024*1024
class AvailableFile(io.BufferedReader):
 def read(self,n=-1):
  start=self.tell();n=archive.stat().st_size-start if n<0 else n;end=min(archive.stat().st_size,start+n)
  if start<12011805000:
   required=set(range(start//chunk,(end-1)//chunk+1))
   while True:
    try:done=set(json.loads(archive.with_suffix('.parts.json').read_text()))
    except Exception:done=set()
    if required<=done:break
    time.sleep(2)
  return super().read(n)
with AvailableFile(archive.open('rb')) as raw,zipfile.ZipFile(raw) as z:
 with z.open('Minimal_Cell_4DWCM/DATA/MinCell_lm_trajectories.tar.gz') as member:
  with tarfile.open(fileobj=member,mode='r|gz') as tar:
   for info in tar:
    if info.isfile() and info.name.endswith('.lm'):
     name=Path(info.name).name;out=src/name;print('Extract',name,info.size,flush=True)
     tmp=out.with_suffix('.lm.partial')
     with tmp.open('wb') as f:shutil.copyfileobj(tar.extractfile(info),f,1024*1024)
     assert tmp.stat().st_size==info.size;tmp.replace(out);print('Ready',name,flush=True)
