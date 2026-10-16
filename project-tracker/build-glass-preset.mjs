import {readFileSync,writeFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
// Only variable declarations are imported: no global reset, theme switching or focus suppression.
export function buildGlassPreset(){
 const base='theme-presets/shadcn-glass-ui/';
 const rootVars=name=>{const s=read(base+name).replace(/\/\*[\s\S]*?\*\//g,'');const match=s.match(/(?::root|\[data-theme='light'\])\s*\{([^{}]*)\}/);if(!match)throw Error('Missing preset variable block: '+name);return match[1];};
 const css='/* Generated from shadcn-glass-ui 32d7625 Light; edit adapter, not preset values. */\n:root, [data-theme="light"] {\n'+['tokens/primitives.css','tokens/oklch-primitives.css','themes/light.css'].map(rootVars).join('\n')+'\n}\n'+read(base+'tokens/animations.css');
 writeFileSync(new URL('glass-preset.css',import.meta.url),css);
}
