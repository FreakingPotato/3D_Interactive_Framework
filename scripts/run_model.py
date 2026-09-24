"""Unmodified vEcoli biology, with Parquet and compact observation outputs."""
import sys, json, time, pickle, hashlib, traceback
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1];MODEL=ROOT/'vendor/vEcoli';sys.path.insert(0,str(MODEL))
from ecoli.experiments.ecoli_master_sim import EcoliSim, SimConfig
from ecoli.library.parquet_emitter import ParquetEmitter
from vivarium.core.registry import emitter_registry
from ecoli.variants.condition import apply_variant

def write_json(path,obj):
    tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(obj,ensure_ascii=False,allow_nan=False));tmp.replace(path)

def gene_catalog(sim):
    t=sim.process.transcription;matrix=t.cistron_tu_mapping_matrix;genes=[]
    for i,gene_id in enumerate(t.cistron_data['gene_id']):
        if not t.cistron_data['is_mRNA'][i]:continue
        tus=matrix.getrow(i).indices
        if len(tus)!=1 or matrix.getcol(int(tus[0])).nnz!=1:continue
        genes.append({'symbol':sim.common_names.get_common_name(str(gene_id)),'gene_id':str(gene_id),'rna_id':str(t.rna_data['id'][tus[0]]),'tu_index':int(tus[0])})
    return sorted(genes,key=lambda g:g['symbol'].lower())

def main():
    run_id=sys.argv[1];folder=ROOT/'data/runs'/run_id;request=json.loads((folder/'request.json').read_text());manifest=json.loads((folder/'manifest.json').read_text());start=time.monotonic()
    def status(state,**extra):
        manifest.pop('error',None) if state!='failed' else None;manifest.update(status=state,**extra);write_json(folder/'manifest.json',manifest)
    status('initializing')
    try:
        sim=pickle.load((ROOT/'data/parca/kb/simData.cPickle').open('rb'));catalog=gene_catalog(sim)
        if not (ROOT/'data/genes.json').exists():write_json(ROOT/'data/genes.json',catalog)
        if request['kind']=='expression':
            hits=[g for g in catalog if request['gene'].lower() in (g['symbol'].lower(),g['gene_id'].lower())]
            if len(hits)!=1:raise ValueError('基因不在单基因转录单元支持列表中')
            target=hits[0];idx=target['tu_index'];factor=request['factor'];before=float(sim.process.transcription_regulation.basal_prob[idx]);sim.adjust_final_expression([idx],[factor]);after=float(sim.process.transcription_regulation.basal_prob[idx])
            if not np.isclose(after,before*factor):raise ValueError('Expression parameter validation failed')
            manifest['target']={**target,'factor':factor,'parameter_before':before,'parameter_after':after,'semantics':'Transcription-unit expression-parameter scaling, renormalized; not sequence mutation or knockout.'}
        apply_variant(sim,{'condition':request['condition']});kb=folder/'simData.cPickle';pickle.dump(sim,kb.open('wb'));manifest['sim_data_hash']=hashlib.sha256(kb.read_bytes()).hexdigest()
        bulk_ids=list(sim.internal_state.bulk_molecules.bulk_data['id']);atp_idx=bulk_ids.index('ATP[c]');adp_idx=bulk_ids.index('ADP[c]')
        target_rna=(manifest.get('target') or {}).get('rna_id');transcript_ids=list(sim.process.transcription.rna_data['id'][sim.process.transcription.rna_data['is_mRNA']]);target_idx=transcript_ids.index(target_rna) if target_rna in transcript_ids else None
        presets=json.loads((ROOT/'data/gene_presets.json').read_text());monomer_ids=list(sim.process.translation.monomer_data['id']);protein_indices=[monomer_ids.index(g['protein_id']) for g in presets]
        obs=(folder/'observations.jsonl').open('w',buffering=1)
        class ObservatoryEmitter(ParquetEmitter):
            def emit(self,data):
                if data['table']=='history':
                    payload=data['data'];agents=payload.get('agents',{})
                    if len(agents)==1:
                        cell_id,cell=next(iter(agents.items()));l=cell.get('listeners',{});m=l.get('mass',{});u=l.get('unique_molecule_counts',{});rep=l.get('replication_data',{});rna=l.get('rna_counts',{});bulk=cell.get('bulk',[])
                        if isinstance(bulk,np.ndarray) and bulk.dtype.names:bulk=bulk['count']
                        counts=rna.get('mRNA_counts',[])
                        def number(v):
                            if v is None:return None
                            f=float(v);return f if np.isfinite(f) else None
                        row={'time':float(payload['time']),'cell_id':cell_id,'mass':number(m.get('dry_mass')),'cell_mass':number(m.get('cell_mass')),'volume':number(m.get('volume')),'protein_mass':number(m.get('protein_mass')),'rna_mass':number(m.get('rna_mass')),'dna_mass':number(m.get('dna_mass')),'ribosomes':number(u.get('active_ribosome')),'rnap':number(u.get('active_RNAP')),'rna':int(np.sum(counts)),'forks':len(rep.get('fork_coordinates',[])),'fork_coordinates':[int(x) for x in rep.get('fork_coordinates',[])],'chromosomes':number(u.get('full_chromosome')),'atp':int(bulk[atp_idx]) if len(bulk)>atp_idx else None,'adp':int(bulk[adp_idx]) if len(bulk)>adp_idx else None,'target_rna':int(counts[target_idx]) if target_idx is not None and len(counts)>target_idx else None}
                        mr,tr,rr=(number(m.get(k)) for k in ('mRna_mass','tRna_mass','rRna_mass'))
                        if all(v is not None for v in (mr,tr,rr,row['rna_mass'])):row['rna_classes']={'mRNA':mr,'tRNA':tr,'rRNA':rr,'other':max(0,row['rna_mass']-mr-tr-rr)}
                        mono=l.get('monomer_counts',[])
                        if len(mono)>max(protein_indices):
                            row['protein_types']={g['symbol']:int(mono[i]) for g,i in zip(presets,protein_indices)};row['protein_types']['other']=int(np.sum(mono)-sum(row['protein_types'].values()))
                        obs.write(json.dumps(row,allow_nan=False)+'\n')
                        if row['time']%10<1:status('running',computed_until=row['time'],wall_seconds=round(time.monotonic()-start,2),speed=round(row['time']/max(.01,time.monotonic()-start),2))
                super().emit(data)
        emitter_registry.register('observatory',ObservatoryEmitter)
        cfg=SimConfig().to_dict();cfg.update({'experiment_id':run_id,'suffix_time':False,'generations':1,'sim_data_path':str(kb),'condition':request['condition'],'emitter':'observatory','emitter_arg':{'out_dir':str(ROOT/'data/raw'),'batch_size':100},'max_duration':float(request['duration']),'seed':request['seed'],'lineage_seed':request['seed'],'progress_bar':False,'fail_at_max_duration':False,'daughter_outdir':str(folder/'daughters'),'emit_unique':False})
        write_json(folder/'config.json',cfg);status('initializing');engine=EcoliSim(cfg);engine.build_ecoli()
        try:engine.run()
        except SystemExit as exc:
            if exc.code not in (None,0):raise
        if engine.ecoli_experiment:engine.ecoli_experiment.emitter.finalize()
        obs.close();rows=[json.loads(x) for x in (folder/'observations.jsonl').read_text().splitlines()];end=rows[-1]['time'] if rows else 0;divided=(folder/'daughters/daughter_state_0.json').exists()
        event_time=float(engine.ecoli_experiment.global_time) if divided else end
        write_json(folder/'events.json',[{'time':event_time,'type':'division' if divided else 'duration_limit','label':'细胞分裂' if divided else '观察时段结束'}]);status('completed',computed_until=end,wall_seconds=round(time.monotonic()-start,2),speed=round(end/max(.01,time.monotonic()-start),2),divided=divided,event_time=event_time,samples=len(rows))
    except BaseException as exc:
        status('failed',error=f'{type(exc).__name__}: {exc}',wall_seconds=round(time.monotonic()-start,2));traceback.print_exc();raise
if __name__=='__main__':main()
