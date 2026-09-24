import sys,pickle,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'vendor/vEcoli'))
entries=[
('pgi','糖代谢分流','Glucose routing','葡萄糖-6-磷酸异构酶；观察糖代谢分流。','Glucose-6-phosphate isomerase; explore central carbon routing.'),
('pfkA','糖酵解','Glycolysis','磷酸果糖激酶 I；观察糖酵解入口调节。','Phosphofructokinase I; explore glycolytic regulation.'),
('pykF','丙酮酸生成','Pyruvate production','丙酮酸激酶 I；连接糖酵解与 ATP 生成。','Pyruvate kinase I; connects glycolysis and ATP production.'),
('zwf','磷酸戊糖途径','Pentose phosphate pathway','葡萄糖-6-磷酸脱氢酶；参与 NADPH 供应。','Glucose-6-phosphate dehydrogenase; contributes to NADPH supply.'),
('gltA','三羧酸循环入口','TCA cycle entry','柠檬酸合酶；连接乙酰辅酶 A 与三羧酸循环。','Citrate synthase; connects acetyl-CoA to the TCA cycle.'),
('icd','碳氮代谢连接','Carbon–nitrogen metabolism','异柠檬酸脱氢酶；生成 α-酮戊二酸与 NADPH。','Isocitrate dehydrogenase; produces 2-oxoglutarate and NADPH.'),
('ptsG','葡萄糖摄取','Glucose uptake','葡萄糖 PTS 转运组分；观察营养摄取相关变化。','Glucose PTS transport component; explore nutrient uptake.'),
('folA','叶酸代谢','Folate metabolism','二氢叶酸还原酶；参与核苷酸合成所需的叶酸循环。','Dihydrofolate reductase; supports folate-dependent nucleotide synthesis.'),
('gyrA','DNA 拓扑','DNA topology','DNA 旋转酶 A 亚基；可跟踪表达量，模型不直接预测三维超螺旋。','DNA gyrase subunit A; track expression, without claiming a 3D supercoiling prediction.'),
('fabI','脂肪酸合成','Fatty-acid synthesis','烯酰载体蛋白还原酶；参与膜脂前体合成。','Enoyl-ACP reductase; contributes to membrane lipid precursor synthesis.')]
sim=pickle.load((ROOT/'data/parca/kb/simData.cPickle').open('rb'));genes={g['symbol']:g for g in json.loads((ROOT/'data/genes.json').read_text())};t=sim.process.transcription;mon=sim.process.translation.monomer_data
colors=['#467eaa','#ae6d45','#748a38','#b14e72','#3f9588','#a38b38','#795cb0','#4e8b64','#bf695a','#718ca6']
out=[]
for (name,zh,en,dzh,den),color in zip(entries,colors):
 g=dict(genes[name]);ci=list(t.cistron_data['gene_id']).index(g['gene_id']);cid=str(t.cistron_data['id'][ci]);inds=[i for i,x in enumerate(mon['cistron_id']) if x==cid];assert len(inds)==1
 g.update(title_zh=zh,title_en=en,description_zh=dzh,description_en=den,color=color,protein_id=str(mon['id'][inds[0]]),monomer_index=inds[0]);out.append(g)
 for f in [.5,2]:
  import copy,numpy as np
  s=copy.deepcopy(sim);i=g['tu_index'];before=s.process.transcription_regulation.basal_prob[i];s.adjust_final_expression([i],[f]);assert np.isclose(s.process.transcription_regulation.basal_prob[i],before*f)
(ROOT/'data/gene_presets.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print([(g['symbol'],g['protein_id']) for g in out])
