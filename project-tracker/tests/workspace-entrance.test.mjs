import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
const source=readFileSync(new URL('../tasks-ui/src/workspace-entrance.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const selector='.card,.workspace-record,.media-wall-item,.clothing-cover';
const events=()=>({listeners:new Map(),addEventListener(name,handler){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(handler);},removeEventListener(name,handler){this.listeners.get(name)?.delete(handler);},emit(name,event={}){for(const handler of this.listeners.get(name)||[])handler({type:name,...event});}});
class Element{
 constructor(id,classes='card',parent=null){this.attrs=new Map(id?[['data-motion-card',id]]:[]);this.className=classes;this.parentElement=parent;this.isConnected=true;this.visible=true;this.children=[];if(parent)parent.children.push(this);const styles=new Map();this.style={getPropertyValue:key=>styles.get(key)||'',getPropertyPriority:()=>'',setProperty:(key,value)=>styles.set(key,value),removeProperty:key=>styles.delete(key)};this.dataset={};this.id='';}
 hasAttribute(key){return this.attrs.has(key);}
 getAttribute(key){return this.attrs.get(key)||null;}
 matches(selectors){return selectors.split(',').some(s=>s.startsWith('.')?this.className.split(' ').includes(s.slice(1)):s.startsWith('[')?this.hasAttribute(s.slice(1,-1)):this.tag===s);}
 closest(selectors){return this.matches(selectors)?this:this.parentElement?.closest(selectors)||null;}
 querySelector(selectors){return this.children.find(child=>child.matches(selectors))||this.children.map(child=>child.querySelector(selectors)).find(Boolean)||null;}
 contains(element){return element===this||this.children.some(child=>child.contains(element));}
 getClientRects(){return this.visible&&this.isConnected?[{}]:[];}
}
function setup({reduced=false,intersection=true,failAnimation=false,homeTitle=false}={}){
 const root=new Element('','root'),heading=new Element('','heading'),body={dataset:{workspaceView:'notes'}},doc={...events(),body,readyState:'loading',hidden:false,activeElement:null},win=events(),media={...events(),matches:reduced};
 if(homeTitle)heading.attrs.set('data-home-sentence','');
 let cards=[],surfaces=[],io,mutation,frame=0,disconnected=false;const raf=new Map(),played=[];
 root.querySelectorAll=s=>s===selector?cards:surfaces;
 doc.getElementById=id=>id==='content'?root:null;doc.querySelector=()=>null;doc.querySelectorAll=()=>[heading];
 const animate=(element,keyframes,options)=>{if(failAnimation)throw Error('Animation unavailable');const animation={cancelled:0,paused:0,pause(){this.paused++;},cancel(){this.cancelled++;},then(resolve){this.resolve=resolve;}};played.push({element,keyframes,options,animation});for(const key of Object.keys(keyframes))element.style.setProperty(key,'in-flight');return animation;};
 const sandbox={exports:{},console,Element,document:doc,window:win,location:{pathname:'/personal'},matchMedia:()=>media,requestAnimationFrame:callback=>{raf.set(++frame,callback);return frame;},cancelAnimationFrame:id=>raf.delete(id),MutationObserver:class{constructor(callback){mutation=callback;}observe(){}disconnect(){disconnected=true;}},IntersectionObserver:intersection?class{constructor(callback,options){io=this;this.threshold=options.threshold;this.callback=callback;this.observed=new Set();}observe(element){this.observed.add(element);}unobserve(element){this.observed.delete(element);}disconnect(){this.observed.clear();}}:undefined,queueMicrotask,require:name=>name==='motion/mini'?{animate}:name.includes('AnimatedContent')?{animateAnimatedContent(element,options){const animation=animate(element,{opacity:[0,1],transform:['translateY(100px)','none']},options);played.at(-1).engine='react-bits';const dispose=()=>animation.cancel();dispose.pause=()=>animation.pause();return dispose;}}:{workspaceCardSelector:selector,motionDisabled:()=>media.matches||body.dataset.motionLevel==='off',motionTiming:{heading:480,headingDistance:9,card:800,coordinateCard:500,page:320,distance:100,scale:.985,stagger:80,staggerMax:280},motionEase:{gsap:'power3.out',native:[.22,1,.36,1]}}};
 runInNewContext(code,sandbox);const dispose=sandbox.exports.observeWorkspaceEntrances();
 return {doc,win,body,root,heading,media,played,dispose,get io(){return io;},get disconnected(){return disconnected;},card(id,classes='card',parent=root){return new Element(id,classes,parent);},setCards(items){cards=items;},setSurfaces(items){surfaces=items;},scan(){mutation([]);for(const [id,callback] of raf){raf.delete(id);callback();}},enter(items){io.callback(items.map(target=>({target,isIntersecting:true,intersectionRatio:1})));},leave(item){io.callback([{target:item,isIntersecting:false}]);}};
}

test('entrances stagger visible cards, deduplicate rebuilt records and replay on a new page visit',()=>{
 const h=setup(),cards=Array.from({length:8},(_,i)=>h.card('note-'+i));h.setCards(cards);h.scan();h.enter(cards);
 const entries=h.played.filter(row=>row.element!==h.heading);assert.equal(entries.length,8);assert.equal(entries[1].options.delay,.08);assert.equal(entries.at(-1).options.delay,.56);assert.equal(h.io.threshold,.1);
 for(const entry of entries){assert.equal(entry.engine,'react-bits');assert.equal(entry.options.distance,100);assert.equal(entry.options.duration,.8);assert.equal(entry.options.direction,'vertical');assert.equal(entry.options.ease,'power3.out');assert.equal(entry.options.blur,0);}
 cards[0].isConnected=false;const replacement=h.card('note-0');h.setCards([replacement,...cards.slice(1)]);h.scan();assert(!h.io.observed.has(replacement));assert.equal(h.played.length,9);
 const newRecord=h.card('new-note');h.setCards([replacement,newRecord]);h.scan();h.enter([newRecord]);assert.equal(h.played.length,10);
 h.body.dataset.workspaceView='tasks';h.scan();h.enter([replacement,newRecord]);assert.equal(h.played.length,13);
 h.dispose();
});

test('reduced motion cancels and restores in-flight styles immediately without replaying visible or pending records',()=>{
 const h=setup(),card=h.card('a'),later=h.card('b');card.style.setProperty('opacity','.7');card.style.setProperty('transform','rotate(2deg)');h.setCards([card,later]);h.scan();h.enter([card]);
 assert.equal(card.style.getPropertyValue('opacity'),'in-flight');h.media.matches=true;h.media.emit('change');h.scan();
 assert.equal(card.style.getPropertyValue('opacity'),'.7');assert.equal(card.style.getPropertyValue('transform'),'rotate(2deg)');assert.equal(h.io.observed.size,0);
 const count=h.played.length;h.media.matches=false;h.media.emit('change');h.scan();assert.equal(h.played.length,count);assert.equal(h.io.observed.size,0);h.dispose();
 const reduced=setup({reduced:true}),still=reduced.card('still');reduced.setCards([still]);reduced.scan();assert.equal(reduced.played.length,0);assert.equal(still.style.getPropertyValue('opacity'),'');reduced.dispose();
});

test('calendar and chart surfaces only fade; nested cards keep one entrance and focused controls stay readable',()=>{
 const h=setup(),calendar=h.card('calendar','card calendar-full-surface'),child=h.card('nested','card',calendar),chart=h.card('chart','project-plan'),frame=h.card('','',chart);frame.tag='iframe';
 h.setCards([calendar,child]);h.setSurfaces([chart]);h.scan();assert(!h.io.observed.has(child));h.enter([calendar,chart]);
 for(const element of [calendar,chart])assert.equal(h.played.find(row=>row.element===element).keyframes.transform,undefined);
 const focused=h.card('focused'),input=h.card('','input',focused);h.doc.activeElement=input;h.setCards([focused]);h.scan();h.enter([focused]);assert(!h.played.some(row=>row.element===focused));h.dispose();
});

test('focus, leaving the viewport, backgrounding and bfcache suspension settle entries and cleanup releases observers',()=>{
 const h=setup(),a=h.card('a'),b=h.card('b');h.setCards([a,b]);h.scan();h.enter([a]);h.win.emit('pagehide',{persisted:true});assert.equal(a.style.getPropertyValue('transform'),'');assert.equal(h.io.observed.size,0);
 const count=h.played.length;h.win.emit('pageshow');h.scan();assert.equal(h.played.length,count);
 const c=h.card('c');h.setCards([c]);h.scan();h.enter([c]);h.leave(c);assert.equal(c.style.getPropertyValue('opacity'),'');
 const d=h.card('d');h.setCards([d]);h.scan();h.enter([d]);h.doc.emit('focusin',{target:d});assert.equal(d.style.getPropertyValue('opacity'),'1');h.doc.emit('focusout',{target:d,relatedTarget:null});assert.equal(d.style.getPropertyValue('transform'),'');
 const e=h.card('e');h.setCards([e]);h.scan();h.enter([e]);h.doc.hidden=true;h.doc.emit('visibilitychange');assert.equal(e.style.getPropertyValue('opacity'),'');
 h.dispose();assert(h.disconnected);assert.equal(h.io.observed.size,0);assert.equal([...h.win.listeners.values()].reduce((n,set)=>n+set.size,0),0);
});

test('missing intersection support and failed animation keep content usable',()=>{
 const h=setup({intersection:false}),card=h.card('a');h.setCards([card]);h.scan();assert(h.played.some(row=>row.element===card));h.dispose();assert.equal(card.style.getPropertyValue('opacity'),'');
 const fail=setup({failAnimation:true}),visible=fail.card('visible');visible.style.setProperty('opacity','.9');fail.setCards([visible]);fail.scan();fail.enter([visible]);assert.equal(visible.style.getPropertyValue('opacity'),'.9');fail.dispose();
});

test('media layout changes settle entrance styles before measuring and leave old IDs to FLIP',()=>{
 const h=setup(),visible=h.card('visible'),offscreen=h.card('offscreen');h.setCards([visible,offscreen]);h.scan();h.enter([visible]);
 h.win.emit('workspace-before-rearrange',{detail:h.root});assert.equal(visible.style.getPropertyValue('transform'),'');assert.equal(h.io.observed.size,0);
 visible.isConnected=false;offscreen.isConnected=false;
 const rebuilt=h.card('offscreen'),added=h.card('new');h.setCards([rebuilt,added]);h.scan();
 assert(!h.io.observed.has(rebuilt));assert(h.io.observed.has(added));h.dispose();
});

test('a card waits for ten percent visibility before beginning its entrance',()=>{
 const h=setup(),card=h.card('threshold');h.setCards([card]);h.scan();
 h.io.callback([{target:card,isIntersecting:true,intersectionRatio:.05}]);
 assert(!h.played.some(row=>row.element===card));assert(h.io.observed.has(card));
 h.io.callback([{target:card,isIntersecting:true,intersectionRatio:.1}]);
 assert(h.played.some(row=>row.element===card));h.dispose();
});

test('the daily home title belongs solely to FoldText while ordinary card entrances remain enabled',()=>{
 const h=setup({homeTitle:true}),card=h.card('home-card');h.setCards([card]);h.scan();h.enter([card]);assert(!h.played.some(row=>row.element===h.heading));assert(h.played.some(row=>row.element===card));h.dispose();
});

test('pointer activation freezes placement until click dispatch; focus freezes placement until activation or blur',()=>{
 const h=setup(),card=h.card('interactive'),button=h.card('','button',card);h.setCards([card]);h.scan();h.enter([card]);
 const animation=h.played.find(row=>row.element===card).animation;
 h.doc.emit('pointerdown',{target:button});assert.equal(animation.paused,1);assert.equal(card.style.getPropertyValue('transform'),'in-flight');assert.equal(card.style.getPropertyValue('opacity'),'1');
 h.doc.emit('focusin',{target:button});assert.equal(animation.cancelled,0,'pointer focus must not move the hit target before click');
 h.doc.emit('click',{target:button});assert.equal(animation.cancelled,1);assert.equal(card.style.getPropertyValue('transform'),'');
 const keyboard=h.card('keyboard');h.setCards([keyboard]);h.scan();h.enter([keyboard]);h.doc.emit('focusin',{target:keyboard});assert.equal(keyboard.style.getPropertyValue('transform'),'in-flight');h.doc.emit('pointerdown',{target:keyboard});assert.equal(keyboard.style.getPropertyValue('transform'),'in-flight');h.doc.emit('focusout',{target:keyboard,relatedTarget:null});assert.equal(keyboard.style.getPropertyValue('transform'),'');
 const outside=h.card('outside');h.setCards([outside]);h.scan();h.enter([outside]);h.doc.emit('pointerdown',{target:outside});h.win.emit('blur');assert.equal(outside.style.getPropertyValue('transform'),'');
 const reordered=h.card('reordered');h.setCards([reordered]);h.scan();h.enter([reordered]);h.doc.emit('pointerdown',{target:reordered});h.win.emit('workspace-before-rearrange',{detail:h.root});
 const next=h.card('after-reorder');h.setCards([next]);h.scan();h.enter([next]);h.doc.emit('focusin',{target:next});assert.equal(next.style.getPropertyValue('opacity'),'1','finishing a pressed card must clear the interaction state');h.dispose();
});
