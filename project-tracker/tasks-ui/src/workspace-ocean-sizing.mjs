// Reference: the approved 2560 × 1440 desktop, with an 88vh home canvas.
export const OCEAN_REFERENCE={width:2560,height:1440*.88,particles:512*384};
export function oceanSizing(width,height,pixelRatio=1,maxDimension=8192){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;
 const reference=OCEAN_REFERENCE,fit=Math.min(width/reference.width,height/reference.height);
 // Shrink points less than the scene so individual highlights remain readable.
 const pointScale=Math.max(.8,Math.min(1,Math.sqrt(fit)));
 const count=Math.max(1,Math.min(reference.particles,Math.round(reference.particles*fit*fit/(pointScale*pointScale))));
 const nativeRatio=Number.isFinite(pixelRatio)&&pixelRatio>0?pixelRatio:1;
 const ratio=Math.min(nativeRatio,2.5,Math.sqrt(8000000/(width*height)),maxDimension/width,maxDimension/height);
 return {count,pointScale,ratio,width:Math.max(1,Math.floor(width*ratio)),height:Math.max(1,Math.floor(height*ratio)),sceneX:Math.min(1,reference.width*fit/width),sceneY:Math.min(1,reference.height*fit/height)};
}
