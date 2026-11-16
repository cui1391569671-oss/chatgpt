import test from 'node:test';
import assert from 'node:assert/strict';
import {moveSelectHighlight,selectMotion,selectVariables} from '../tasks-ui/src/components/workspace-select-motion.mjs';

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
