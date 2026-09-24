let detector,poseDetector,pose=null,poseWorld=null,poseTime=-Infinity,frames=0,isTwoFingerTap;
self.onmessage=async({data})=>{
 try{
  if(data.type==='init'){
   const {FilesetResolver,HandLandmarker,PoseLandmarker}=await import('./vendor/mediapipe/vision_bundle.mjs');
   ({isTwoFingerTap}=await import('./chest-tap.js'));
   const files=await FilesetResolver.forVisionTasks('/vendor/mediapipe/wasm');
   detector=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'/assets/hand-tracking/hand_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.6,minHandPresenceConfidence:.6,minTrackingConfidence:.6});
   try{poseDetector=await PoseLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'/assets/hand-tracking/pose_landmarker_lite.task',delegate:'CPU'},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.5,minPosePresenceConfidence:.5,minTrackingConfidence:.5,outputSegmentationMasks:false});}catch(error){self.postMessage({type:'pose-warning',message:String(error)});}
   self.postMessage({type:'ready',poseEnabled:!!poseDetector});
  }else if(data.type==='frame'){
   const start=performance.now();try{
    const result=detector.detectForVideo(data.bitmap,data.time);
    if(poseDetector&&(++frames%3===0||result.landmarks.some(isTwoFingerTap))){try{const body=poseDetector.detectForVideo(data.bitmap,data.time);pose=body.landmarks[0]||null;poseWorld=body.worldLandmarks[0]||null;poseTime=data.time;}catch(error){poseDetector.close();poseDetector=null;pose=poseWorld=null;self.postMessage({type:'pose-warning',message:String(error)});}}
    self.postMessage({type:'result',landmarks:result.landmarks,pose,poseWorld,poseAge:data.time-poseTime,ms:performance.now()-start});
   }finally{data.bitmap.close();}
  }
 }catch(error){self.postMessage({type:'error',message:String(error)});}
};
