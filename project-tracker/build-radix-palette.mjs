import {readFileSync} from 'node:fs';
export const RADIX_SCALES=['blue','slate','green','amber','red','cyan'];
const read=file=>readFileSync(new URL('theme-presets/radix-colors/'+file,import.meta.url),'utf8');
function hsl(hex){const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;let h=0;if(d)h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;return [(h*60+360)%360,d?d/(1-Math.abs(2*l-1)):0,l].map((v,i)=>Number((i?v*100:v).toFixed(4))+(i?'%':'')).join(' ');}
export function radixPalette(){
 const values={},declarations=[];
 const files=[...RADIX_SCALES.flatMap(name=>[name+'.css',name+'-alpha.css']),'black-alpha.css','white-alpha.css'];
 for(const file of files){const block=read(file).match(/:root[^{}]*\{([^{}]*)\}/)?.[1];if(!block)throw Error('Missing Radix light sRGB palette: '+file);for(const [,name,value]of block.matchAll(/--([\w-]+):\s*([^;]+);/g)){values[name]=value.trim();declarations.push('  --radix-'+name+': '+value.trim()+';');if(/^#[a-f0-9]{6}$/i.test(value.trim()))declarations.push('  --radix-'+name+'-hsl: '+hsl(value.trim())+';');}}
 for(const scale of [...RADIX_SCALES,'gray'])for(const suffix of ['-dark.css','-dark-alpha.css']){const block=read(scale+suffix).match(/\.dark[^{}]*\{([^{}]*)\}/)?.[1];if(!block)throw Error('Missing dark scale '+scale+suffix);for(const [,name,value]of block.matchAll(/--([\w-]+):\s*([^;]+);/g)){values['dark-'+name]=value.trim();declarations.push('  --radix-dark-'+name+': '+value.trim()+';');if(/^#[a-f0-9]{6}$/i.test(value.trim()))declarations.push('  --radix-dark-'+name+'-hsl: '+hsl(value.trim())+';');}}
 return {values,css:declarations.join('\n')};
}
