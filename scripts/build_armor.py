"""Original procedural red/gold hard-surface armor, Blender 4.5; editable source + animated GLB.
No film asset or third-party character mesh. Front is -Y, shoulders at Z=0, span=2.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector, Quaternion
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=0;scene.frame_end=210

def material(name,color,metal=.8,rough=.26,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;p.inputs['Coat Weight'].default_value=.4;p.inputs['Coat Roughness'].default_value=.18
 if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
 return m
red=material('Candy crimson / clear coated alloy',(.30,.012,.021),.82,.23)
gold=material('Brushed champagne titanium',(.64,.38,.105),.85,.28)
dark=material('Graphite joints',(.012,.020,.029),.65,.4)
steel=material('Machined titanium edges',(.23,.30,.36),.95,.22)
light=material('Arc plasma / eyes',(.24,.83,1),.25,.18,4)
black=material('Inset channels',(.003,.005,.008),.35,.45)

def group(name,parent=None,loc=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=loc;return o
root=group('Armor_Root');pieces=[]
def finish(o,name,mat,parent,bevel=0):
 o.name=name;o.parent=parent;o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('Manufactured edge radii','BEVEL');mod.width=bevel;mod.segments=3
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 for p in o.data.polygons:p.use_smooth=True
 mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');mod.keep_sharp=True
 try:bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 except Exception:pass
 return o

def box(name,loc,scale,mat,parent,bevel=.03):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,mat,parent,bevel)
def uv(name,loc,scale,mat,parent):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=24,location=loc);o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,mat,parent)
def cylinder(name,loc,radius,depth,mat,parent,front=False):
 bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=radius,depth=depth,location=loc);o=bpy.context.object
 if front:o.rotation_euler.x=math.pi/2
 return finish(o,name,mat,parent,.008)
def plate(name,outline,y,thick,mat,parent,bevel=.022):
 # Individual formed panels have real thickness and curved front profiles.
 vertices=[(x,y+.07*(x*x),z) for x,z in outline]+[(x,y+thick+.07*x*x,z) for x,z in outline];n=len(outline)
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return finish(o,name,mat,parent,bevel)
def assembly(name,delay,direction):
 g=group(name,root);pieces.append((g,delay,Vector(direction)));return g

core=assembly('Torso_internal_frame',0,(0,.6,-.5))
uv('Thoracic composite shell',(0,.025,-.65),(.84,.34,1.02),dark,core)
for z in [.10,.16,.22,.28]:cylinder('Flexible cervical ring',(0,0,z),.235,.048,steel,core)
for side in [-1,1]:
 g=assembly('Pectoral_'+str(side),.7+(side+1)*.15,(side*1.5,-.8,.25))
 outline=[(.10,-.04),(.50,.05),(.90,-.02),(.93,-.39),(.62,-.56),(.17,-.43)]
 plate('Forged breastplate',[(x*side,z) for x,z in outline],-.385,.12,red,g,.035)
 plate('Gold clavicle insert',[(x*side,z) for x,z in [(.18,-.06),(.52,-.015),(.84,-.07),(.79,-.22),(.43,-.21)]],-.445,.035,gold,g,.012)
 plate('Lower breastplate bevel',[(x*side,z) for x,z in [(.2,-.43),(.62,-.54),(.89,-.39),(.82,-.50),(.61,-.60)]],-.394,.026,steel,g,.01)
 for i in range(3):box('Collar intake slot',(side*(.58+i*.08),-.481,-.11),(.045,.016,.022),black,g,.004)
 for x,z in [(side*.82,-.31),(side*.33,-.34)]:cylinder('Flush fastener',(x,-.497,z),.018,.015,steel,g,True)
waist=assembly('Abdominal_shell',.45,(0,.3,-1.6))
for i in range(5):
 z=-.55-i*.22;w=.66-i*.045
 plate('Overlapping abdominal lamella',[(-w,z),(-w*.80,z-.20),(0,z-.28),(w*.80,z-.20),(w,z),(0,z-.09)],-.32+i*.017,.09,red if i%2==0 else gold,waist,.025)
 for side in [-1,1]:box('Abdominal actuator',(side*(w+.04),-.07,z-.08),(.09,.17,.14),steel,waist,.025)
reactor=assembly('Arc_reactor',1.9,(0,-1.8,0))
cylinder('Reactor outer bezel',(0,-.41,-.27),.222,.14,steel,reactor,True)
cylinder('Reactor gold ring',(0,-.496,-.27),.186,.034,gold,reactor,True)
cylinder('Reactor graphite socket',(0,-.520,-.27),.157,.025,dark,reactor,True)
cylinder('Reactor lens',(0,-.54,-.27),.136,.02,light,reactor,True)
for i in range(12):
 a=i*math.tau/12;box('Reactor radial strut',(.17*math.cos(a),-.546,-.27+.17*math.sin(a)),(.019,.015,.019),steel,reactor,.004)

head=group('Helmet_pivot',root,(0,0,.34))
helmet=group('Helmet_shell',head);pieces.append((helmet,2.5,Vector((0,.3,1.6))))
uv('Helmet titanium inner shell',(0,.015,.49),(.45,.37,.59),red,helmet)
# Raised panels and recessed side channels, not a flat face drawing.
for side in [-1,1]:
 uv('Temporal armor',(side*.395,.015,.43),(.10,.29,.35),red,helmet)
 cylinder('Jaw hinge',(side*.413,-.15,.22),.075,.045,steel,helmet,True)
 for z in [.26,.33,.40]:box('Temple cooling channel',(side*.427,-.08,z),(.022,.26,.029),black,helmet,.009)
 plate('Jaw cheek blade',[(side*.29,.22),(side*.40,.29),(side*.36,.06),(side*.16,-.025)],-.255,.09,red,helmet,.02)
mask=group('Closing_faceplate',head);pieces.append((mask,3.05,Vector((0,-1.5,.6))))
plate('Brow crown',[(-.28,.99),(.28,.99),(.38,.77),(.29,.58),(0,.56),(-.29,.58),(-.38,.77)],-.318,.10,gold,mask,.032)
plate('Nose bridge',[(-.065,.59),(.065,.59),(.095,.35),(0,.30),(-.095,.35)],-.425,.075,gold,mask,.016)
for side in [-1,1]:
 plate('Eye socket',[(side*.065,.60),(side*.34,.65),(side*.31,.48),(side*.065,.47)],-.385,.023,black,mask,.009)
 plate('White blue optic',[(side*.09,.568),(side*.304,.596),(side*.284,.555),(side*.096,.529)],-.408,.013,light,mask,.006)
 plate('Sculpted cheek face',[(side*.07,.485),(side*.31,.49),(side*.355,.33),(side*.26,.13),(side*.10,.17)],-.345,.088,gold,mask,.023)
plate('Chin face',[(-.26,.13),(-.11,.19),(.11,.19),(.26,.13),(.13,.035),(-.13,.035)],-.305,.08,gold,mask,.02)
for z,w in [(.18,.14),(.135,.11)]:box('Mouth recess',(0,-.42,z),(w,.02,.012),black,mask,.004)

# Articulated mechanical arms and individual finger joints.
arms={}
for side in [-1,1]:
 shoulder=group('Right_shoulder' if side==1 else 'Left_shoulder',root,(side*1,0,-.03));upper=group('Upper_arm',shoulder)
 pauldron=group('Shoulder_plate',upper);pieces.append((pauldron,1.15,Vector((side*.8,.2,.7))))
 uv('Shoulder joint',(0,0,0),(.28,.29,.27),dark,upper)
 uv('Curved pauldron',(side*.02,-.025,.02),(.35,.35,.30),red,pauldron)
 box('Shoulder inset',(side*.10,-.312,.06),(.28,.055,.085),gold,pauldron,.035)
 upperShell=group('Bicep_plates',upper);pieces.append((upperShell,1.5,Vector((side*.9,0,0))))
 uv('Biceps actuator',(0,0,-.39),(.20,.22,.39),dark,upper)
 box('Upper arm red shell',(0,-.09,-.39),(.37,.36,.55),red,upperShell,.10)
 box('Biceps titanium insert',(0,-.285,-.38),(.17,.035,.32),gold,upperShell,.035)
 elbow=group('Elbow',upper,(0,0,-.8));uv('Elbow ball bearing',(0,0,0),(.185,.185,.185),steel,elbow)
 lowerShell=group('Forearm_plates',elbow);pieces.append((lowerShell,1.8,Vector((side*.8,-.5,0))))
 box('Forearm shell',(0,-.025,-.40),(.34,.37,.62),red,lowerShell,.10)
 box('Gauntlet face',(0,-.221,-.34),(.20,.035,.38),gold,lowerShell,.028)
 for z in [-.18,-.26,-.34]:box('Gauntlet vent',(0,-.245,z),(.12,.016,.018),black,lowerShell,.006)
 wrist=group('Wrist',elbow,(0,0,-.85));palm=group('Glove',wrist)
 box('Articulated palm',(0,0,0),(.24,.14,.24),red,palm,.05)
 cylinder('Palm repulsor',(0,-.085,.005),.065,.018,light,palm,True)
 fingers=[]
 for i in range(4):
  finger=group('Finger_'+str(i),palm,((i-1.5)*.059,0,.10));box('Finger proximal',(0,0,.06),(.051,.075,.12),gold,finger,.014)
  tip=group('Distal',finger,(0,0,.12));box('Finger distal',(0,0,.048),(.046,.068,.096),red,tip,.017)
  finger.rotation_euler.x=1.2;tip.rotation_euler.x=1.2;fingers.append((finger,tip))
 box('Thumb armor',(side*.15,-.005,-.015),(.085,.105,.17),gold,palm,.025)
 arms[side]=(upper,elbow,wrist,fingers)
 upper.rotation_euler.y=-side*.12
 wrist.rotation_euler.x=math.pi

# Baked, pre-authored assembly motion, joint salute, and head nod.
for ob,delay,offset in pieces:
 rest=ob.location.copy();start=int(delay*30);end=start+23
 ob.location=rest+offset;ob.scale=(.001,)*3;ob.keyframe_insert('location',frame=0);ob.keyframe_insert('scale',frame=0);ob.keyframe_insert('location',frame=start);ob.keyframe_insert('scale',frame=start)
 ob.location=rest;ob.scale=(1,)*3;ob.keyframe_insert('location',frame=end);ob.keyframe_insert('scale',frame=end)
upper,elbow,wrist,fingers=arms[1]
for ob in [upper,elbow,wrist]:ob.rotation_mode='QUATERNION'
upper.rotation_quaternion=Quaternion((0,1,0),-.12);elbow.rotation_quaternion=Quaternion();wrist.rotation_quaternion=Quaternion((1,0,0),math.pi)
for ob in [upper,elbow,wrist]:ob.keyframe_insert('rotation_quaternion',frame=0);ob.keyframe_insert('rotation_quaternion',frame=135)
s=Vector((1,0,-.03));target=Vector((.58,-.48,.87));v=target-s;distance=v.length;direction=v.normalized();pole=Vector((1,0,0));pole=(pole-direction*pole.dot(direction)).normalized();a=(.8**2-.85**2+distance**2)/(2*distance);h=math.sqrt(.8**2-a*a);e=s+direction*a+pole*h
q1=Vector((0,0,-1)).rotation_difference(e-s);q2=Vector((0,0,-1)).rotation_difference(target-e)
upper.rotation_quaternion=q1;elbow.rotation_quaternion=q1.inverted()@q2;wrist.rotation_quaternion=q2.inverted()
for ob in [upper,elbow,wrist]:ob.keyframe_insert('rotation_quaternion',frame=157);ob.keyframe_insert('rotation_quaternion',frame=210)
for i,(finger,tip) in enumerate(fingers):
 for ob in [finger,tip]:
  ob.keyframe_insert('rotation_euler',frame=0);ob.keyframe_insert('rotation_euler',frame=139)
  if i in [0,1]:ob.rotation_euler.x=0
  ob.keyframe_insert('rotation_euler',frame=157);ob.keyframe_insert('rotation_euler',frame=210)
for frame,angle in [(0,0),(161,0),(176,.19),(192,0),(210,0)]:head.rotation_euler.x=angle;head.keyframe_insert('rotation_euler',frame=frame)
scene.frame_set(210)
assets=ROOT/'assets';assets.mkdir(exist_ok=True);out=ROOT/'dist/assets/armor';out.mkdir(exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(assets/'red-gold-armor.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'suit-up.glb'),export_format='GLB',export_animations=True,export_animation_mode='SCENE',export_frame_range=True,export_force_sampling=True,export_cameras=False,export_lights=False)
(out/'provenance.json').write_text(json.dumps({'generator':'Blender '+bpy.app.version_string,'source':'scripts/build_armor.py','representation':'Original stylized hard-surface red/gold armor, not a film mesh','materials':'Metallic/roughness PBR, clear coat, emissive optics','animation':'Baked assembly, articulated two-finger salute, helmet nod','duration_seconds':7,'shoulder_span':2,'shoulder_origin':[0,0,0],'triangles':sum(len(o.data.polygons) for o in bpy.data.objects if o.type=='MESH')},indent=2))
print('ARMOR_EXPORTED',out/'suit-up.glb')
