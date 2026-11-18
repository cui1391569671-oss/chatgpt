import test from 'node:test';
import assert from 'node:assert/strict';
import {moveSelectHighlight,revealSelectOption,selectMotion,selectVariables} from '../tasks-ui/src/components/workspace-select-motion.mjs';

test('React and searchable DOM selects share opening, closing and highlight timing',()=>{
 assert.deepEqual(selectMotion,{pop:180,exit:120,glide:220});
 assert.equal(selectVariables['--gs-pop'],selectMotion.pop+'ms');
 assert.equal(selectVariables['--gs-pop-out'],selectMotion.exit+'ms');
 assert.equal(selectVariables['--gs-glide'],selectMotion.glide+'ms');
});
test('highlight appears at its row immediately then glides between hovered rows',()=>{
 const pill={style:{}};
 moveSelectHighlight(pill,1620);
 assert.equal(pill.style.transitionDuration,'0ms, 150ms');
 assert.equal(pill.style.transform,'translateY(1620px)');
 moveSelectHighlight(pill,1665);
 assert.equal(pill.style.transitionDuration,'');
 assert.equal(pill.style.transform,'translateY(1665px)');
 moveSelectHighlight(pill,null);
 assert.equal(pill.style.opacity,'0');
 moveSelectHighlight(pill,0);
 assert.equal(pill.style.transitionDuration,'0ms, 150ms');
 assert.equal(pill.style.transform,'translateY(0px)');
});
test('keyboard and reduced-motion moves jump directly without stale animation duration',()=>{
 const pill={style:{opacity:'1'}};
 moveSelectHighlight(pill,45,{instant:true});
 assert.equal(pill.style.transitionDuration,'0ms, 150ms');
 moveSelectHighlight(pill,90);
 assert.equal(pill.style.transitionDuration,'');
 assert.doesNotThrow(()=>moveSelectHighlight(null,null));
});

test('revealing a late option scrolls only the bounded menu by the minimum distance',()=>{
 const menu={clientHeight:373,clientTop:1,offsetHeight:375,scrollTop:0,getBoundingClientRect:()=>({top:191,height:375})};const option={getBoundingClientRect:()=>({top:826,height:44})};revealSelectOption(menu,option);assert.equal(menu.scrollTop,305);
});
test('option visibility compensates for the opening scale and preserves already-visible rows',()=>{
 const menu={clientHeight:373,clientTop:1,offsetHeight:375,scrollTop:130,getBoundingClientRect:()=>({top:191,height:375*.95})};const option={getBoundingClientRect:()=>({top:191+506*.95,height:44*.95})};revealSelectOption(menu,option);assert.equal(menu.scrollTop,306);
 const visible={getBoundingClientRect:()=>({top:191+100*.95,height:44*.95})};revealSelectOption(menu,visible);assert.equal(menu.scrollTop,306);
});
test('revealing an earlier option scrolls upward and tolerates absent or hidden menus',()=>{
 const menu={clientHeight:200,clientTop:1,offsetHeight:202,scrollTop:300,getBoundingClientRect:()=>({top:100,height:202})};revealSelectOption(menu,{getBoundingClientRect:()=>({top:51,height:44})});assert.equal(menu.scrollTop,250);assert.doesNotThrow(()=>revealSelectOption(null,null));assert.doesNotThrow(()=>revealSelectOption({clientHeight:0},{}));
});
