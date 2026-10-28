import {readFileSync,writeFileSync} from 'node:fs';
import {radixPalette} from './build-radix-palette.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
// Only variable declarations are imported: no global reset, theme switching or focus suppression.
export function buildGlassPreset(){
 const base='theme-presets/shadcn-glass-ui/';
 const rootVars=name=>{const s=read(base+name).replace(/\/\*[\s\S]*?\*\//g,'');const match=s.match(/(?::root|\[data-theme='light'\])\s*\{([^{}]*)\}/);if(!match)throw Error('Missing preset variable block: '+name);return match[1];};
 const license='/* Radix Colors 3.0.0 (MIT)\n'+read('theme-presets/radix-colors/LICENSE').replace(/\r\n/g,'\n')+'\n*/\n';
 const css=license+'/* Generated from pinned shadcn primitives and workspace-theme.css; edit the theme owner. */\n:root, [data-theme="dark"] {\n'+['tokens/primitives.css','tokens/oklch-primitives.css'].map(rootVars).join('\n')+'\n'+radixPalette().css+'\n'+read('workspace-theme.css').replace(/\/\*[\s\S]*?\*\//g,'').match(/:root\s*\{([^{}]*)\}/)[1]+'\n}\n'+read(base+'tokens/animations.css');
 writeFileSync(new URL('glass-preset.css',import.meta.url),css.replace(/[\t ]+$/gm,''));
}
