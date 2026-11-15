import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const requireUI=createRequire(new URL('../tasks-ui/package.json',import.meta.url));
const {createElement}=requireUI('react'),{renderToStaticMarkup}=requireUI('react-dom/server');
async function load(entry){
 const output=await build({entryPoints:[fileURLToPath(new URL(entry,import.meta.url))],bundle:true,write:false,platform:'node',format:'esm',jsx:'automatic',loader:{'.css':'empty'},plugins:[{name:'shared-react-runtime',setup(builder){builder.onResolve({filter:/^react(?:-dom)?(?:\/.*)?$/},args=>({path:pathToFileURL(requireUI.resolve(args.path)).href,external:true}));}}]});
 return import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
}
const {WorkspaceCompletion}=await load('../tasks-ui/src/components/workspace-completion.tsx');
const {default:SpringCheck}=await load('../tasks-ui/src/vendor/react-bits/SpringCheck.jsx');
function renderCompletion(props){
 const previousDocument=globalThis.document,previousMatchMedia=globalThis.matchMedia;
 try{globalThis.document={body:{dataset:{}}};globalThis.matchMedia=()=>({matches:false});return renderToStaticMarkup(createElement(WorkspaceCompletion,props));}
 finally{globalThis.document=previousDocument;globalThis.matchMedia=previousMatchMedia;}
}

test('shared completion applies requested geometry and completed text while retaining theme and business label',()=>{
 let calls=0;const html=renderCompletion({checked:true,label:'完成本周阅读',ariaLabel:'完成本周阅读',onChange:()=>calls++});
 assert.match(html,/role="checkbox"/);assert.match(html,/aria-checked="true"/);assert.match(html,/--sc-box:28px/);assert.match(html,/--sc-radius:9px/);assert.match(html,/--sc-font:18px/);assert.match(html,/--sc-row:44px/);assert.ok(Math.abs(Number(html.match(/wb-spring-check__word" style="opacity:([0-9.]+)/)?.[1])-.42)<1e-6);
 assert.match(html,/--sc-fill:var\(--checkbox-checked-bg\)/);assert.match(html,/完成本周阅读/);assert.doesNotMatch(html,/Ship the build/);assert.equal(calls,0);
});

test('unlabelled completion remains one disabled checkbox without decorative title strike',()=>{
 const html=renderCompletion({checked:false,ariaLabel:'完成待办：检查进度',disabled:true,onChange:()=>{}});
 assert.equal((html.match(/role="checkbox"/g)||[]).length,1);assert.match(html,/disabled=""/);assert.match(html,/aria-checked="false"/);assert.doesNotMatch(html,/class="wb-spring-check__rule"/);assert.doesNotMatch(html,/Ship the build/);
});

test('standalone SpringCheck preserves the supplied public configuration defaults and initial false state',()=>{
 const html=renderToStaticMarkup(createElement(SpringCheck,{label:'Ship the build',defaultChecked:false,color:'#ffffff',fillColor:'#ffffff',checkColor:'#0b0b0f',boxSize:28,boxRadius:9,fontSize:18,bounce:.2,strikeLag:.12,doneOpacity:.42,strike:'left'}));
 assert.match(html,/aria-checked="false"/);assert.match(html,/--sc-origin:left center/);assert.match(html,/--sc-fill:#ffffff/);assert.match(html,/Ship the build/);
});
