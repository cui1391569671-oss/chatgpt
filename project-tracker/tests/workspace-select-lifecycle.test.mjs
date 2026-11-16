import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {transformSync} from 'esbuild';

const code=transformSync(readFileSync(new URL('../tasks-ui/src/vendor/react-bits/GlideSelect.jsx',import.meta.url),'utf8'),{loader:'jsx',format:'cjs',jsx:'automatic'}).code;
function mount(onChange=()=>{}){
 const slots=[],effects=[],listeners=new Map(),timers=new Map(),focus=[];let cursor=0,timerId=0,tree;
 const hook=init=>{const i=cursor++;return slots[i]??(slots[i]=init());};
 const effect=(fn,deps)=>{const slot=hook(()=>({}));if(!slot.deps||deps?.some((d,i)=>d!==slot.deps[i])||!deps){effects.push(()=>{slot.cleanup?.();slot.cleanup=fn();});slot.deps=deps;}};
 const react={useState:init=>{const s=hook(()=>({value:typeof init==='function'?init():init}));return[s.value,v=>{s.value=typeof v==='function'?v(s.value):v;}];},useRef:v=>hook(()=>({current:v})),useId:()=>hook(()=>({value:'select-test'})).value,useCallback:fn=>{hook(()=>({}));return fn;},useEffect:effect,useLayoutEffect:effect};
 const jsx=(type,props)=>({type,props});
 const document={addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},removeEventListener(name,fn){listeners.get(name)?.delete(fn);}};
 const sandbox={exports:{},setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),document,require:name=>name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name==='radix-ui'?{Popover:{Root:'Root',Anchor:'Anchor',Portal:'Portal',Content:'Content'}}:name.includes('workspace-select-motion')?{moveSelectHighlight(){}}:{}};
 sandbox.module={exports:sandbox.exports};runInNewContext(code,sandbox);
 const find=(node,predicate)=>{if(!node)return null;if(Array.isArray(node)){for(const n of node){const found=find(n,predicate);if(found)return found;}return null;}if(typeof node!=='object')return null;return predicate(node)?node:find(node.props?.children,predicate);};
 const render=()=>{cursor=0;tree=sandbox.module.exports.default({value:'one',options:[{value:'one',label:'第一项'},{value:'new',label:'新建项目'}],onChange});return tree;};
 const flush=()=>{render();while(effects.length)effects.shift()();};
 const node={dataset:{},style:{},contains:target=>target===triggerNode,querySelector:()=>null};const triggerNode={focus(){focus.push('trigger');}};
 render();
 find(tree,n=>n.props?.className==='glide-select').props.ref.current=node;
 find(tree,n=>n.props?.role==='combobox').props.ref.current=triggerNode;flush();
 const trigger=()=>find(tree,n=>n.props?.role==='combobox');const menu=()=>find(tree,n=>n.props?.['data-slot']==='select-content');
 const toggle=()=>{trigger().props.onPointerDown({button:0,currentTarget:triggerNode});flush();if(menu()){menu().props.ref(node);flush();}};
 const key=value=>{trigger().props.onKeyDown({key:value,preventDefault(){},stopPropagation(){}});flush();};
 const dispatch=name=>{for(const fn of listeners.get(name)||[])fn({});flush();};
 return{toggle,key,dispatch,menu,trigger,focus,timers,listeners,focusOutside(ownTrigger){const event={target:ownTrigger?triggerNode:{},defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};find(tree,n=>n.type==='Content').props.onInteractOutside(event);if(!event.defaultPrevented)find(tree,n=>n.type==='Root').props.onOpenChange(false);flush();},unmount(){for(const slot of slots)slot?.cleanup?.();},runTimers(){for(const fn of [...timers.values()])fn();timers.clear();flush();}};
}

test('rapid reopening restores visible interactive options and cancels stale close timers',()=>{
 const select=mount();select.toggle();assert.equal(select.menu().props['data-state'],'open');assert.equal(select.menu().props.style.pointerEvents,'auto');
 select.toggle();assert.equal(select.menu().props['data-state'],'closed');assert.equal(select.menu().props.inert,true);assert.equal(select.menu().props.style.pointerEvents,'none');
 select.toggle();assert.equal(select.menu().props['aria-hidden'],undefined);assert.equal(select.menu().props.inert,false);assert.equal(select.timers.size,0);select.runTimers();assert.equal(select.trigger().props['aria-expanded'],true);select.unmount();
});
test('dialog transitions remove the old menu immediately and release its timer',()=>{
 const select=mount();select.toggle();select.toggle();assert.equal(select.timers.size,1);select.dispatch('workspace-select-close-all');assert.equal(select.menu(),null);assert.equal(select.timers.size,0);select.toggle();assert.equal(select.menu().props.style.pointerEvents,'auto');select.unmount();assert.equal(select.listeners.get('workspace-select-close-all').size,0);
});
test('a nested dialog opened by selection keeps the final focus and no stale popup',()=>{
 let select;const values=[];select=mount(value=>{values.push(value);select.dispatch('workspace-select-close-all');select.focus.push('nested-dialog');});select.toggle();select.key('End');select.key('Enter');assert.deepEqual(values,['new']);assert.equal(select.menu(),null);assert.equal(select.focus.at(-1),'nested-dialog');select.unmount();
});

test('modal focus restoration to the custom trigger leaves its options open',()=>{
 const select=mount();select.toggle();select.focusOutside(true);assert.equal(select.trigger().props['aria-expanded'],true);assert.equal(select.menu().props.style.pointerEvents,'auto');select.focusOutside(false);assert.equal(select.trigger().props['aria-expanded'],false);select.unmount();
});
