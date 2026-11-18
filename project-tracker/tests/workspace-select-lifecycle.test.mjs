import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {transformSync} from 'esbuild';

const code=transformSync(readFileSync(new URL('../tasks-ui/src/vendor/react-bits/GlideSelect.jsx',import.meta.url),'utf8'),{loader:'jsx',format:'cjs',jsx:'automatic'}).code;
function mount(onChange=()=>{},config={}){
 const slots=[],effects=[],listeners=new Map(),timers=new Map(),focus=[],scrolled=[];let cursor=0,timerId=0,tree,hitRow;
 const hook=init=>{const i=cursor++;return slots[i]??(slots[i]=init());};
 const effect=(fn,deps)=>{const slot=hook(()=>({}));if(!slot.deps||deps?.some((d,i)=>d!==slot.deps[i])||!deps){effects.push(()=>{slot.cleanup?.();slot.cleanup=fn();});slot.deps=deps;}};
 const react={useState:init=>{const s=hook(()=>({value:typeof init==='function'?init():init}));return[s.value,v=>{s.value=typeof v==='function'?v(s.value):v;}];},useRef:v=>hook(()=>({current:v})),useId:()=>hook(()=>({value:'select-test'})).value,useCallback:fn=>{hook(()=>({}));return fn;},useEffect:effect,useLayoutEffect:effect};
 const jsx=(type,props)=>({type,props});
 const document={addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},removeEventListener(name,fn){listeners.get(name)?.delete(fn);}};
 const sandbox={exports:{},setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),document,require:name=>name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name==='radix-ui'?{Popover:{Root:'Root',Anchor:'Anchor',Portal:'Portal',Content:'Content'}}:name.includes('workspace-select-motion')?{moveSelectHighlight(){},revealSelectOption(menu,option){option?.markVisible();}}:{}};
 sandbox.module={exports:sandbox.exports};runInNewContext(code,sandbox);
 const find=(node,predicate)=>{if(!node)return null;if(Array.isArray(node)){for(const n of node){const found=find(n,predicate);if(found)return found;}return null;}if(typeof node!=='object')return null;return predicate(node)?node:find(node.props?.children,predicate);};
 const render=()=>{cursor=0;tree=sandbox.module.exports.default({value:config.value??'one',options:config.options??[{value:'one',label:'第一项'},{value:'new',label:'新建项目'}],onChange});return tree;};
 const flush=()=>{render();while(effects.length)effects.shift()();};
 const node={dataset:{},style:{},contains:target=>target===triggerNode||target===hitRow,ownerDocument:{elementFromPoint:()=>hitRow},querySelector:selector=>({markVisible(){scrolled.push(selector);}})};const triggerNode={focus(){focus.push('trigger');}};
 render();
 find(tree,n=>n.props?.className==='glide-select').props.ref.current=node;
 find(tree,n=>n.props?.role==='combobox').props.ref.current=triggerNode;flush();
 const trigger=()=>find(tree,n=>n.props?.role==='combobox');const menu=()=>find(tree,n=>n.props?.['data-slot']==='select-content');
 const attach=()=>{if(menu()){menu().props.ref(node);flush();}};
 const pointerDown=()=>{trigger().props.onPointerDown?.({button:0,currentTarget:triggerNode});flush();attach();};
 const click=(detail=1,mountPortal=true)=>{trigger().props.onClick({detail,button:0,currentTarget:triggerNode});flush();if(mountPortal)attach();};
 const toggle=()=>{pointerDown();click();};
 const key=value=>{trigger().props.onKeyDown({key:value,preventDefault(){},stopPropagation(){}});flush();};
 const dispatch=name=>{for(const fn of listeners.get(name)||[])fn({});flush();};
 return{toggle,pointerDown,click,attach,key,dispatch,menu,trigger,focus,scrolled,timers,listeners,placed(){find(tree,n=>n.type==='Content').props.onPlaced();},hover(index,moved=false){const row={dataset:{index:String(index)}};const event={pointerType:'mouse',target:{closest:()=>row}};const list=find(tree,n=>n.props?.role==='listbox');if(moved)list.props.onPointerMove(event);else list.props.onPointerOver?.(event);flush();},pointerPick(index){hitRow={dataset:{index:String(index)},closest(){return this;}};const event={type:'pointerdown',pointerType:'mouse',pointerId:1,clientX:20,clientY:33,currentTarget:{setPointerCapture(){},getBoundingClientRect:()=>({top:0})}};find(tree,n=>n.props?.role==='listbox').props.onPointerDown(event);flush();find(tree,n=>n.props?.role==='listbox').props.onPointerUp({...event,type:'pointerup'});flush();},focusOutside(ownTrigger){const event={target:ownTrigger?triggerNode:{},defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};find(tree,n=>n.type==='Content').props.onInteractOutside(event);if(!event.defaultPrevented)find(tree,n=>n.type==='Root').props.onOpenChange(false);flush();},unmount(){for(const slot of slots)slot?.cleanup?.();},runTimers(){for(const fn of [...timers.values()])fn();timers.clear();flush();}};
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

test('one pointer activation followed by a detail-zero click does not close its own menu',()=>{
 const select=mount();select.pointerDown();select.click(0);assert.equal(select.trigger().props['aria-expanded'],true);select.runTimers();assert.equal(select.trigger().props['aria-expanded'],true);select.toggle();assert.equal(select.trigger().props['aria-expanded'],false);select.unmount();
});
test('assistive click without pointer events opens and closes once',()=>{
 const select=mount();select.click(0);assert.equal(select.trigger().props['aria-expanded'],true);select.click(0);assert.equal(select.trigger().props['aria-expanded'],false);select.unmount();
});

test('selected late option scrolls into view after the portal attaches',()=>{
 const select=mount(()=>{},{value:'item-14',options:Array.from({length:16},(_,i)=>({value:'item-'+i,label:'项目'+i}))});select.click(1,false);assert.equal(select.scrolled.length,0);select.attach();assert.deepEqual(select.scrolled,['[data-index="14"]']);select.unmount();
});

test('collision placement rechecks the selected option after its viewport height is measured',()=>{
 const select=mount();select.toggle();const count=select.scrolled.length;select.placed();assert.equal(select.scrolled.length,count+1);select.unmount();
});

test('pointer selection uses the rendered hit row while the menu is scaled',()=>{
 const values=[];const select=mount(value=>values.push(value));select.toggle();select.pointerPick(1);assert.deepEqual(values,['new']);assert.equal(select.trigger().props['aria-expanded'],false);select.unmount();
});

test('stationary pointer crossing scrolled rows does not override keyboard selection',()=>{
 const values=[];const select=mount(value=>values.push(value));select.toggle();select.key('End');select.hover(0);select.key('Enter');assert.deepEqual(values,['new']);select.unmount();
});
test('actual pointer movement changes the highlight without scrolling the menu',()=>{
 const values=[];const select=mount(value=>values.push(value));select.toggle();select.key('End');const count=select.scrolled.length;select.hover(0,true);assert.equal(select.scrolled.length,count);select.key('Enter');assert.deepEqual(values,[]);assert.equal(select.trigger().props['aria-expanded'],false);select.unmount();
});

test('portalled menu keeps native scrolling without passing wheel or touch moves to the parent modal lock',()=>{
 const select=mount();select.toggle();let stopped=0;const event={stopPropagation(){stopped++;},preventDefault(){assert.fail('native menu scrolling must remain enabled');}};select.menu().props.onWheel(event);select.menu().props.onTouchMove(event);assert.equal(stopped,2);select.unmount();
});

test('manual menu scrolling takes priority over delayed placement reveal',()=>{
 const select=mount();select.toggle();const count=select.scrolled.length;select.menu().props.onWheel({stopPropagation(){}});select.placed();assert.equal(select.scrolled.length,count);select.unmount();
});
