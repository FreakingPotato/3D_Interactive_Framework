"""Keep original one-second scalar traces for all official replicates."""
import csv,io,json,zipfile,tarfile,re
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1];src=ROOT/'data/minimal/source';out=ROOT/'data/minimal/counts';out.mkdir(exist_ok=True)
with zipfile.ZipFile(src/'Minimal_Cell_4DWCM.zip') as z,z.open('Minimal_Cell_4DWCM/DATA/MinCell_counts_and_fluxes.tar.gz') as f,tarfile.open(fileobj=f,mode='r|gz') as tar:
 for info in tar:
  if not info.isfile():continue
  rep=re.search(r'counts_and_fluxes\.(\d+)\.csv',info.name)
  if not rep:continue
  r=csv.reader(line.decode('utf-8') for line in tar.extractfile(info));head=next(r);times=np.array(head[1:],dtype=float);keep={'time':times};keys=[]
  for row in r:
   name=row[0];keys.append(name)
   if name in ['M_atp_c','M_adp_c','chromosome','RNAP','ribosomeP','replisome'] or any(x in name.lower() for x in ['volume','surface']):keep[name]=np.array(row[1:],dtype=float)
  np.savez_compressed(out/(rep[1]+'.npz'),**keep);print(rep[1],len(times),list(keep),flush=True)
 (out/'all_species_ids.json').write_text(json.dumps(keys))
