import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {radixPalette,RADIX_SCALES} from '../build-radix-palette.mjs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const css=read('glass-preset.css').replace(/\/\*[\s\S]*?\*\//g,''),tokens=new Map([...css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)].map(m=>[m[1],m[2].trim()]));
function value(name,seen=new Set()){assert(!seen.has(name),'Token cycle '+name);seen.add(name);const raw=tokens.get(name);assert(raw,'Missing '+name);return raw.replace(/var\((--[\w-]+)\)/g,(_,key)=>value(key,new Set(seen)));}
function rgb(raw){if(/^#[0-9a-f]{6}$/i.test(raw))return [1,3,5].map(i=>parseInt(raw.slice(i,i+2),16)/255);throw Error('Contrast pair must be opaque sRGB: '+raw);}
function contrast(a,b){const luminance=color=>rgb(color).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((n,c,i)=>n+c*[.2126,.7152,.0722][i],0),lo=Math.min(luminance(a),luminance(b)),hi=Math.max(luminance(a),luminance(b));return (hi+.05)/(lo+.05);}
test('fixed Radix light palettes retain all 12 steps, alpha scales and MIT provenance',()=>{
 const meta=JSON.parse(read('theme-presets/radix-colors/UPSTREAM.json'));assert.equal(meta.version,'3.0.0');
 for(const [file,hash]of Object.entries(meta.files))assert.equal(createHash('sha256').update(read('theme-presets/radix-colors/'+file).replace(/\r\n/g,'\n')).digest('hex'),hash,'Unexpected upstream change '+file);
 assert.match(read('theme-presets/radix-colors/LICENSE'),/MIT License/);const palette=radixPalette();
 for(const scale of RADIX_SCALES)for(let step=1;step<=12;step++){assert(palette.values[scale+'-'+step]);assert(palette.values[scale+'-a'+step]);assert.equal(value('--radix-'+scale+'-'+step),palette.values[scale+'-'+step]);}
 assert.match(read('glass-preset.css'),/Copyright \(c\) 2021 Radix/);assert.doesNotMatch(css,/@import\s+(?:url\()?['"]?https?:/);
});
test('text and semantic status pairs meet WCAG AA after resolving generated palette aliases',()=>{
 const pairs=[['--btn-primary-text','--btn-primary-bg'],['--btn-primary-text','--btn-primary-hover-bg'],['--btn-secondary-text','--btn-secondary-bg'],['--btn-secondary-text','--btn-secondary-hover-bg'],['--btn-secondary-text','--semantic-control-active'],['--btn-destructive-text','--btn-destructive-bg'],['--btn-success-text','--btn-success-bg'],['--input-placeholder','--input-bg'],['--tab-active-text','--tab-active-bg'],['--select-item-selected-text','--select-item-selected-bg']];
 for(const role of ['success','warning','error','info'])pairs.push(['--semantic-'+role+'-text','--semantic-'+role+'-subtle']);
 for(const bg of ['--semantic-surface','--semantic-surface-muted','--semantic-surface-strong','--semantic-primary-subtle'])for(const fg of ['--semantic-text','--semantic-text-muted'])pairs.push([fg,bg]);
 for(const [fg,bg]of pairs)assert(contrast(value(fg),value(bg))>=4.5,fg+' / '+bg+' contrast '+contrast(value(fg),value(bg)));
 assert(contrast(value('--semantic-text-inverse'),value('--checkbox-checked-bg'))>=3,'Completion check is a non-text graphic');
});
test('dark semantic states preserve scale roles while primary actions use the reference white surface',()=>{
 for(const [name,role,step]of [['--semantic-surface','gray',1],['--semantic-surface-muted','gray',2],['--btn-secondary-bg','gray',3],['--semantic-control-hover','gray',4],['--semantic-control-active','gray',5],['--semantic-divider','gray',6],['--semantic-interactive-border','gray',7],['--semantic-interactive-border-hover','gray',8],['--accent-solid','accent',9],['--accent-solid-hover','accent',10]])assert.equal(value(name),value('--'+role+'-'+step),name);
 assert.equal(value('--semantic-text'),value('--theme-text'));assert.equal(value('--semantic-text-muted'),value('--theme-text-muted'));
 assert.equal(value('--btn-primary-bg'),value('--theme-white'));assert.equal(value('--btn-primary-text'),value('--theme-black'));assert.equal(value('--semantic-primary-text'),value('--theme-gold'));assert(contrast(value('--theme-gold'),value('--semantic-surface'))>=4.5);
});
