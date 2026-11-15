import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {build} from 'esbuild';
import ts from 'typescript';

const requireUI=createRequire(new URL('../tasks-ui/package.json',import.meta.url));
const {createElement}=requireUI('react'),{renderToStaticMarkup}=requireUI('react-dom/server');
const bundle=await build({entryPoints:[fileURLToPath(new URL('../tasks-ui/src/vendor/react-bits/FoldText.jsx',import.meta.url))],bundle:true,write:false,platform:'node',format:'esm',jsx:'automatic',loader:{'.css':'empty'},plugins:[{name:'shared-react-runtime',setup(builder){builder.onResolve({filter:/^react(?:-dom)?(?:\/.*)?$/},args=>({path:pathToFileURL(requireUI.resolve(args.path)).href,external:true}));}}]});
const {default:FoldText}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));

test('FoldText preserves one heading, an accessible sentence and non-hidden visual text before scripts run',()=>{
 const html=renderToStaticMarkup(createElement('h1',{lang:'en'},createElement(FoldText,{text:'Review the plan.',splitBy:'char',foldStyle:'paper',hinge:'top',trigger:'scroll',fontSize:'clamp(3rem, 10vw, 7rem)',fontWeight:800})));
 assert.equal((html.match(/<h1/g)||[]).length,1);assert.match(html,/<span class="fold-text-sr-only">Review the plan\.<\/span>/);assert.match(html,/class="fold-text-visual" aria-hidden="true"/);
 assert.equal((html.match(/class="fold-text-piece"/g)||[]).length,14);assert.doesNotMatch(html,/opacity:0/);assert.match(html,/--fold-text-font-weight:800/);
});

test('FoldText escapes vocabulary text and preserves Unicode and whitespace in its accessible copy',()=>{
 const text='<script>你好🙂</script>  keep\nreading';const html=renderToStaticMarkup(createElement(FoldText,{text}));
 assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;你好🙂&lt;\/script&gt; {2}keep\nreading/);assert.match(html,/<br\/>/);
});

test('home title ownership deduplicates renders, applies the configured effect and releases detached roots',()=>{
 let mutation;const roots=[],events=new Map();const jsx=(type,props)=>({type,props});
 const sandbox={exports:{},document:{body:{dataset:{workspaceView:'home'}},addEventListener(){}},window:{addEventListener(name,callback){events.set(name,callback);}},MutationObserver:class{constructor(callback){mutation=callback;}observe(){}disconnect(){}},require:name=>name==='react-dom/client'?{createRoot(){const root={renders:[],unmounted:false,render(tree){this.renders.push(tree);},unmount(){this.unmounted=true;}};roots.push(root);return root;}}:name==='react/jsx-runtime'?{jsx,jsxs:jsx,Fragment:'fragment'}:name.includes('FoldText')?{default:()=>null}:{useWorkspaceMotionOff:()=>false}};
 const code=ts.transpileModule(readFileSync(new URL('../tasks-ui/src/workspace-home-fold-text.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 runInNewContext(code,sandbox);const heading={dataset:{},isConnected:true,closest:()=>({})};
 const bridge=sandbox.window.WorkspaceHomeFoldText;assert.equal(bridge.render(heading,'Review the plan.',true),true);bridge.render(heading,'Review the plan.',true);assert.equal(roots.length,1);assert.equal(roots[0].renders.length,1);
 const tree=roots[0].renders[0],effect=tree.type(tree.props);assert.equal(effect.props.text,'Review the plan.');assert.equal(effect.props.foldAngle,92);assert.equal(effect.props.duration,.65);assert.equal(effect.props.stagger,.045);assert.equal(effect.props.hoverRefold,true);assert.equal(effect.props.perspective,700);
 bridge.render(heading,'Tomorrow.',true);assert.equal(roots[0].renders.length,2);heading.isConnected=false;mutation();assert.equal(roots[0].unmounted,true);
 const rebuilt={dataset:{},isConnected:true,closest:()=>null};bridge.render(rebuilt,'Review the plan.',true);assert.equal(roots[1].renders[0].props.revealed,true,'same-visit rebuild must not replay the same sentence');
 sandbox.document.body.dataset.workspaceView='notes';mutation();sandbox.document.body.dataset.workspaceView='home';const revisited={dataset:{},isConnected:true,closest:()=>null};bridge.render(revisited,'Review the plan.',true);assert.equal(roots[2].renders[0].props.revealed,false,'a new home visit may reveal again');
 const next={dataset:{},isConnected:true,closest:()=>null};bridge.render(next,'每日一句',false);const placeholder=roots[3].renders[0];assert.equal(placeholder.type(placeholder.props).props.children,'每日一句');events.get('pagehide')({persisted:false});assert.equal(roots[3].unmounted,true);
});
