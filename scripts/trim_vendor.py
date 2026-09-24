"""Keep the Three.js addon dependency closure used by the shipped examples."""
import re
from pathlib import Path
root=Path(__file__).resolve().parents[1];dist=root/'dist';addons=dist/'vendor/addons';seen=set();pending=list(dist.glob('*.js'))+list((root/'examples').rglob('*.js'))
imports=re.compile(r'(?:from\s*|import\s*\(\s*|import\s*)[\x22\x27]([^\x22\x27]+)')
while pending:
 path=pending.pop().resolve()
 if path in seen or not path.is_file():continue
 seen.add(path)
 for spec in imports.findall(path.read_text()):
  if spec=='three':target=dist/'vendor/three.module.js'
  elif spec.startswith('three/addons/'):target=addons/spec.removeprefix('three/addons/')
  elif spec.startswith('/vendor/'):target=dist/spec.lstrip('/')
  elif spec.startswith('.'):target=path.parent/spec
  else:continue
  pending.append(target)
removed=0
for p in addons.rglob('*'):
 if p.is_file() and p.resolve() not in seen:p.unlink();removed+=1
print('Retained',sum(1 for p in addons.rglob('*') if p.is_file()),'Three.js addon files; removed',removed,'unused files')
