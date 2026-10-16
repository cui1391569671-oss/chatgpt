import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('pinned upstream Light preset remains unchanged and retains its license',()=>{
 const base='theme-presets/shadcn-glass-ui/';
 const source=JSON.parse(read(base+'UPSTREAM.json'));
 for(const [file,hash] of Object.entries(source.presetHashes))assert.equal(createHash('sha256').update(read(base+file)).digest('hex'),hash,file+' changed; update provenance deliberately');
 assert.match(read(base+'LICENSE.txt'),/Apache License/);
 assert.doesNotMatch(read('glass-preset.css'),/\*\s*:focus\s*\{/,'Do not inherit upstream global focus suppression');
});
test('every material adapter token resolves in the shared theme',()=>{
 const css=['glass-preset.css','admin-theme.css','glass-material.css','liquid-glass.css'].map(read).join('\n');
 const defined=new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m=>m[1]));
 for(const [,token] of read('glass-material.css').matchAll(/var\((--[\w-]+)/g))assert.ok(defined.has(token),'Undefined material token '+token);
 assert.doesNotMatch(read('glass-material.css'),/#[0-9a-f]{3,8}\b|\brgba?\(/i,'Material adapter must use preset tokens, not a second palette');
});
