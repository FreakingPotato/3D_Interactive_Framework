"""Local Blender asset source. Stylized molecular surfaces, not atomic reconstructions."""
import bpy, random, math, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'dist/assets';out.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
random.seed(17)
def metaball(name,lobes,color,resolution=.1):
    mb=bpy.data.metaballs.new(name,'META') if False else bpy.data.metaballs.new(name)
    mb.resolution=resolution;mb.render_resolution=resolution;mb.threshold=.62
    ob=bpy.data.objects.new(name,mb);bpy.context.collection.objects.link(ob)
    for pos,r in lobes:
        e=mb.elements.new();e.co=pos;e.radius=r
    bpy.context.view_layer.objects.active=ob;ob.select_set(True);bpy.ops.object.convert(target='MESH')
    ob=bpy.context.object;ob.name=name
    for p in ob.data.polygons:p.use_smooth=True
    mat=bpy.data.materials.new(name+' material');mat.diffuse_color=(*color,1);mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(*color,1);bsdf.inputs['Roughness'].default_value=.38
    ob.data.materials.append(mat);ob.select_set(False)
    return ob
large=[((0,0,0),1.0),((-.45,.22,0),.6),((.4,.3,.15),.55),((0,-.25,.38),.58)]
for i in range(22):
    a=i*2.39996;z=1-2*(i+.5)/22;r=math.sqrt(1-z*z)
    large.append(((.6*r*math.cos(a),.56*z,.5*r*math.sin(a)),.23))
small=[((.04,.82,.05),.68),((-.38,.9,.12),.4),((.4,.9,.04),.35),((.15,1.1,.05),.37)]
for i in range(10):
    a=i*2.4;small.append(((.36*math.cos(a),.84+.2*math.sin(a),.3*math.sin(a)),.2))
metaball('ribosome_large',large,(.59,.26,.13),.105)
metaball('ribosome_small',small,(.77,.45,.27),.095)
metaball('polymerase',[((0,0,0),.85),((-.45,.2,0),.58),((.42,.22,0),.63),((0,-.44,.1),.5),((0,.2,.3),.5)],(.29,.47,.43),.12)
metaball('protein',[((0,0,0),.65),((.36,0,0),.5),((-.3,.18,0),.5),((.1,.25,.1),.35)],(.75,.56,.25),.15)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/molecular-surfaces.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'molecules.glb'),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False)
(out/'asset-provenance.json').write_text(json.dumps({'generator':'Blender 4.5.3 / build_assets.py','representation':'Procedural illustrative molecular surfaces; not PDB-derived atomic structures','seed':17,'structures':['ribosome large and small subunits','RNA polymerase','generic protein'],'reference':'https://pdb101.rcsb.org/sci-art/goodsell-gallery/escherichia-coli-bacterium'},indent=2))
print('Exported',out/'molecules.glb')
