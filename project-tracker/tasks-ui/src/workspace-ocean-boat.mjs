// Reserve the entire possible wave excursion and rotated sail, not just one frame.
// Rectangles are in canvas CSS pixels; no safe space means omitting decoration.
export function oceanBoatLayout(width,height,obstacles=[]){
 if(width<=0||height<=0)return null;
 const size=Math.max(34,Math.min(64,width*.045)),gap=12;
 const intersects=(a,b)=>a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap;
 for(const y of [.65,.8,.9,.5])for(const x of [width<=640?.84:.76,.9,.65,.5]){
  const swing=(y-.225)*height*.5;
  const bounds={left:x*width-size*.72,right:x*width+size*.72,top:y*height-swing-size*1.12,bottom:y*height+swing+size*.15};
  if(bounds.left<gap||bounds.right>width-gap||bounds.top<gap||bounds.bottom>height-gap)continue;
  if(obstacles.some(rect=>intersects(bounds,rect)))continue;
  return {x,y,size,bounds};
 }
 return null;
}
// Local x/up coordinates, with the hull's waterline at the origin.
// These points go through the ocean's own sea() and projection in the vertex shader.
export function oceanBoatParticles(){
 const points=[],triangles=[[-.12,.96,-.12,.23,-.47,.23],[-.04,.78,-.04,.23,.36,.23],[-.5,.17,.5,.17,.33,0],[-.5,.17,.33,0,-.32,0]];
 const cross=(ax,ay,bx,by,px,py)=>(bx-ax)*(py-ay)-(by-ay)*(px-ax);
 for(let row=0;row<=48;row++)for(let column=0;column<=48;column++){
  const x=column/48-.5,y=row/48,jitter=Math.sin(row*127.1+column*311.7)*.007;
  const inside=triangles.some(([ax,ay,bx,by,cx,cy])=>{const a=cross(ax,ay,bx,by,x,y),b=cross(bx,by,cx,cy,x,y),c=cross(cx,cy,ax,ay,x,y);return (a>=0&&b>=0&&c>=0)||(a<=0&&b<=0&&c<=0);});
  const mast=Math.abs(x+.085)<.012&&y>=.13&&y<=1;
  if(inside||mast)points.push(x+jitter,y,-(.55+(Math.sin(row*13+column*7)+1)*.18));
 }
 return new Float32Array(points);
}
