"""Check connected components in the exported native membrane surfaces."""
import gzip,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'demo-data'
meta=json.loads(gzip.decompress((root/'minimal-meta.json.gz').read_bytes()))
def lobes(t):
 i=meta['times'].index(t);frame=json.loads(gzip.decompress((root/f'minimal-frame-{i:03}.json.gz').read_bytes()));surface=frame['membrane'];parent=list(range(len(surface['vertices'])//3))
 def find(i):
  while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
  return i
 faces=surface['faces']
 for i in range(0,len(faces),3):
  a,b,c=faces[i:i+3];parent[find(b)]=find(a);parent[find(c)]=find(a)
 sizes={}
 for i in range(len(parent)):
  r=find(i);sizes[r]=sizes.get(r,0)+1
 return sum(n>len(parent)*.1 for n in sizes.values())
t=meta['demo_cycle']['division_time']
assert lobes(0)==1;assert lobes(t-1)==1;assert lobes(t)==2;assert lobes(7200)==2
print(f'PASS exported native envelope: one connected cell at birth and {t-1:g}s; two at {t:g}s and 7200s')
