// The picker changes the background only. Derive one readable foreground for
// legacy, newly created and recurring events instead of trusting stale text colors.
export function eventTextColor(background){
 let hex=String(background||'#4464d9').replace(/^#/,'');if(/^[a-f\d]{3}$/i.test(hex))hex=hex.split('').map(c=>c+c).join('');
 if(!/^[a-f\d]{6}$/i.test(hex))return '#ffffff';
 const channels=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const luminance=.2126*channels[0]+.7152*channels[1]+.0722*channels[2];const whiteContrast=1.05/(luminance+.05),darkContrast=(luminance+.05)/.06445;return whiteContrast>=darkContrast?'#ffffff':'#172033';
}
