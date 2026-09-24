import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from './vendor/addons/environments/RoomEnvironment.js';
export async function createArmorView(container,pose,width,height){
 const gltf=await new GLTFLoader().loadAsync('/assets/armor/suit-up.glb');
 let renderer,env,pmrem,room;
 const disposeModel=()=>gltf.scene.traverse(o=>{o.geometry?.dispose();for(const m of (Array.isArray(o.material)?o.material:[o.material]))m?.dispose();});
 try{
 renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;container.append(renderer.domElement);
 const scene=new THREE.Scene();pmrem=new THREE.PMREMGenerator(renderer);room=new RoomEnvironment();env=pmrem.fromScene(room,.04);scene.environment=env.texture;
 const camera=new THREE.OrthographicCamera(-width/2,width/2,height/2,-height/2,.1,3000);camera.position.z=1000;
 scene.add(new THREE.HemisphereLight(0xc6eaff,0x19131a,1.6));const key=new THREE.DirectionalLight(0xffe2c0,3);key.position.set(-300,400,600);scene.add(key);const rim=new THREE.DirectionalLight(0x80caff,2);rim.position.set(400,150,-200);scene.add(rim);
 const a=pose[11],b=pose[12],cx=(1-(a.x+b.x)/2)*width,cy=(a.y+b.y)/2*height,span=Math.max(50,Math.hypot((a.x-b.x)*width,(a.y-b.y)*height));
 const root=new THREE.Group();root.add(gltf.scene);scene.add(root);root.scale.setScalar(span/2);root.position.set(cx-width/2,height/2-cy,0);
 let angle=Math.atan2(-(b.y-a.y)*height,-(b.x-a.x)*width);if(angle>Math.PI/2)angle-=Math.PI;if(angle< -Math.PI/2)angle+=Math.PI;root.rotation.z=angle;
 let meshes=0;gltf.scene.traverse(o=>{if(o.isMesh)meshes++;});
 const mixer=new THREE.AnimationMixer(gltf.scene);for(const clip of gltf.animations){const action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();}
 let w=0,h=0,lastTime=0;
 return {render(time){const rect=container.getBoundingClientRect();if(w!==rect.width||h!==rect.height){w=rect.width;h=rect.height;renderer.setSize(Math.max(1,w),Math.max(1,h),false);}mixer.update(Math.max(0,time-lastTime));lastTime=time;renderer.render(scene,camera);},debug:()=>({modelLoaded:true,meshes,clips:gltf.animations.length,drawCalls:renderer.info.render.calls}),dispose(){mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);disposeModel();env.dispose();room.dispose();pmrem.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
 }catch(error){disposeModel();env?.dispose();room?.dispose();pmrem?.dispose();renderer?.dispose();throw error;}
}
