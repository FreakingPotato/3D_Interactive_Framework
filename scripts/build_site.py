"""Build a relocatable static demo. Python standard library only; no asset generation."""
import argparse,json,re,shutil,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--base',default='');p.add_argument('--out',default='_site');args=p.parse_args();base='/'+args.base.strip('/') if args.base.strip('/') else '';out=Path(args.out).resolve()
if out==ROOT or out in ROOT.parents or out in [ROOT/'dist',ROOT/'demo-data']:raise SystemExit('Choose a separate output directory')
if out.exists():shutil.rmtree(out)
shutil.copytree(ROOT/'dist',out);shutil.copytree(ROOT/'demo-data',out/'demo');
# Rewrite only known public asset roots, never /api IDs or the WASM virtual filesystem.
roots=[x.name for x in (ROOT/'dist').iterdir()];pattern=re.compile(r'([\x22\x27`])/(?:'+ '|'.join(re.escape(x) for x in roots)+r')(?=[/\x22\x27`?])')
for path in out.rglob('*'):
 if path.suffix in ['.js','.mjs','.html','.css','.json']:
  text=path.read_text();text=pattern.sub(lambda m:m.group(0)[0]+base+m.group(0)[1:],text);text=text.replace('href="/"','href="'+base+'/"');path.write_text(text)
version=hashlib.sha256((ROOT/'demo-data/provenance.json').read_bytes()).hexdigest()[:16]
(out/'runtime-config.js').write_text('export const runtime='+json.dumps({'staticDemo':True,'base':base,'dataVersion':'demo-'+version})+';\n')
(out/'.nojekyll').touch()
for name in ['LICENSE','NOTICE','THIRD_PARTY_NOTICES.md','CITATION.cff']:
 if (ROOT/name).exists():shutil.copy(ROOT/name,out/name)
if (ROOT/'LICENSES').exists():shutil.copytree(ROOT/'LICENSES',out/'LICENSES',dirs_exist_ok=True)
if (ROOT/'docs/credits.html').exists():shutil.copy(ROOT/'docs/credits.html',out/'credits.html')
if (ROOT/'examples').exists():
 shutil.copytree(ROOT/'examples',out/'examples')
 for f in (out/'examples').rglob('*.html'):f.write_text(f.read_text().replace('/vendor/',base+'/vendor/').replace('/hand-',base+'/hand-'))
files=[x for x in out.rglob('*') if x.is_file()];size=sum(x.stat().st_size for x in files)
assert max(x.stat().st_size for x in files)<100*1024**2,'File exceeds GitHub regular-file limit'
assert size<1024**3,'Site exceeds GitHub Pages size limit'
print(json.dumps({'out':str(out),'base':base,'files':len(files),'bytes':size,'data_version':version},indent=2))
