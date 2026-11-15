import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const requireUI=createRequire(new URL('../tasks-ui/package.json',import.meta.url));
const {createElement}=requireUI('react');
const {renderToStaticMarkup}=requireUI('react-dom/server');
const result=await build({entryPoints:[fileURLToPath(new URL('../tasks-ui/src/vendor/react-bits/WakeSlider.jsx',import.meta.url))],bundle:true,write:false,platform:'node',format:'esm',jsx:'automatic',loader:{'.css':'empty'},plugins:[{name:'shared-react-runtime',setup(builder){builder.onResolve({filter:/^react(?:-dom)?(?:\/.*)?$/},args=>({path:pathToFileURL(requireUI.resolve(args.path)).href,external:true}));}}]});
const {default:WakeSlider,snapWakeValue,wakeChangeValue,wakeKeyValue}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));

test('WakeSlider snaps user changes to bounded progress integers and preserves non-grid endpoints',()=>{
 for(const [input,expected] of [[-5,0],[0,0],[.4,0],[.5,1],[50.5,51],[99.9,100],[100,100],[150,100]])assert.equal(snapWakeValue(input,0,100,1),expected);
 assert.equal(snapWakeValue(.99,0,1,.3),1);assert.equal(snapWakeValue(8,5,5,1),5);assert.equal(snapWakeValue(3.3,0,10,0),3.3);
});

test('WakeSlider keyboard increments, page jumps and range endpoints use the same progress calculation',()=>{
 for(const [key,expected] of [['ArrowRight',51],['ArrowUp',51],['ArrowLeft',49],['ArrowDown',49],['PageUp',60],['PageDown',40],['Home',0],['End',100]])assert.equal(wakeKeyValue(key,50,0,100,1),expected);
 assert.equal(wakeKeyValue('ArrowRight',50,0,100,1,true),49);assert.equal(wakeKeyValue('ArrowLeft',50,0,100,1,true),51);assert.equal(wakeKeyValue('Enter',50,0,100,1),null);
 assert.equal(snapWakeValue(wakeKeyValue('ArrowRight',100,0,100,1),0,100,1),100);
});

test('WakeSlider renders one accessible controlled slider with 32 bars and the field error association',()=>{
 const html=renderToStaticMarkup(createElement(WakeSlider,{value:35,min:0,max:100,step:1,bars:32,height:56,restHeight:12,gap:4,ariaLabel:'调整年度事项完成进度',showValue:true,formatValue:n=>n+'%',fillColor:'var(--slider-fill)',trackColor:'var(--slider-track)',handleProps:{id:'progress-slider','aria-invalid':true,'aria-describedby':'field-error'}}));
 assert.equal((html.match(/role="slider"/g)||[]).length,1);assert.equal((html.match(/class="wake-slider__bar"/g)||[]).length,32);
 assert.match(html,/aria-valuenow="35"/);assert.match(html,/aria-valuetext="35%"/);assert.match(html,/aria-describedby="field-error"/);assert.match(html,/aria-invalid="true"/);assert.match(html,/--ws-height:56px/);assert.match(html,/--ws-fill:var\(--slider-fill\)/);
});

test('WakeSlider disabled state is a native disabled button and controlled out-of-range values stay bounded',()=>{
 const html=renderToStaticMarkup(createElement(WakeSlider,{value:150,disabled:true,motionOff:true}));
 assert.match(html,/aria-valuenow="100"/);assert.match(html,/disabled=""/);assert.match(html,/tabindex="-1"/);assert.match(html,/data-motion-off=""/);
});

test('slider endpoint gestures repair invalid numeric drafts while unchanged valid values remain deduplicated',()=>{
 assert.equal(wakeChangeValue(100,150,0,100,1),100);assert.equal(wakeChangeValue(0,'',0,100,1),0);assert.equal(wakeChangeValue(0,-10,0,100,1),0);assert.equal(wakeChangeValue(0,NaN,0,100,1),0);
 assert.equal(wakeChangeValue(100,100,0,100,1),undefined);assert.equal(wakeChangeValue(0,0,0,100,1),undefined);
 const empty=renderToStaticMarkup(createElement(WakeSlider,{value:''}));assert.match(empty,/aria-valuenow="0"/);
});
