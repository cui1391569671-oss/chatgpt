import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectCiPlan,changedFilesBetween,authoredHtml,generatedHtmlChanges} from '../scripts/ci-plan.mjs';
import {testArguments} from '../scripts/ci-run.mjs';
const project=path=>'project-tracker/'+path;
const select=(paths,options)=>selectCiPlan(paths.map(project),options);

test('CSS plus its generated bundles and HTML selects focused tests without D1',()=>{
 const files=['workspace.css','pages.mjs','glass-theme.mjs','index.html','workbench.html','landing.html'];
 const plan=select(files,{derivedOnly:files.filter(p=>p.endsWith('.html')).map(project)});
 assert.equal(plan.fullTests,false);assert.equal(plan.databaseChecks,false);assert.equal(plan.tests.length,4);assert.ok(plan.tests.includes('tests/style-ownership.test.mjs'));
});
test('an authored HTML edit alongside CSS still runs the full suite',()=>{
 const plan=select(['workspace.css','workbench.html']);assert.equal(plan.fullTests,true);assert.equal(plan.databaseChecks,false);
});
test('a known page component runs its feature tests and UI contracts',()=>{
 const plan=select(['tasks-ui/src/fitness.tsx','tasks-assets.mjs']);assert.equal(plan.fullTests,false);assert.equal(plan.databaseChecks,false);assert.ok(plan.tests.includes('tests/fitness.test.mjs'));assert.equal(plan.tests.length,5);
});
test('shared UI and pure business logic run all tests without database exercises',()=>{
 for(const path of ['tasks-ui/src/components/ui/dialog.tsx','calendar-ui/src/main.jsx','workspace-toolbar-host.js','media-sources.mjs','project-labels.mjs','tasks-ui/package-lock.json']){const plan=select([path]);assert.equal(plan.fullTests,true,path);assert.equal(plan.databaseChecks,false,path);}
});
test('storage, sync, runtime configuration and recovery select D1 and recovery',()=>{
 for(const path of ['worker.mjs','cloud-records.mjs','auth.mjs','calendar-images.mjs','personal-vault.mjs','project-core-sync.mjs','project-core-sheet.mjs','vocabulary-sheet.mjs','migrations/002.sql','wrangler.json','package-lock.json','google-apps-script/vocabulary-sync.gs','scripts/rehearse-recovery.py','scripts/verify-local-d1.mjs','scripts/verify-restored-app.mjs']){const plan=select([path]);assert.equal(plan.fullTests,true,path);assert.equal(plan.databaseChecks,true,path);}
});
test('workflow and selector modifications validate the complete pipeline',()=>{
 for(const path of ['.github/workflows/workbench-checks.yml',project('scripts/ci-plan.mjs'),project('scripts/ci-run.mjs')]){const plan=selectCiPlan([path]);assert.equal(plan.fullTests,true,path);assert.equal(plan.databaseChecks,true,path);}
});
test('unknown source files are conservative and never silently skipped',()=>{for(const path of ['new-service.mjs','new-config.json','new-module/feature.ts']){const plan=select([path]);assert.equal(plan.fullTests,true);assert.equal(plan.databaseChecks,true);}});
test('generated-only changes run full tests and cannot pretend to be a small style edit',()=>{const plan=select(['tasks-assets.mjs','pages.mjs']);assert.equal(plan.fullTests,true);assert.equal(plan.databaseChecks,false);});
test('documentation and historical evidence do not accidentally invoke node --test without filenames',()=>{
 const plan=select(['开发规则.md','verification/check.json']);assert.equal(plan.fullTests,false);assert.equal(plan.databaseChecks,false);assert.deepEqual(testArguments(plan),[]);
});
test('lint/type baselines and upstream presets are not treated as harmless evidence/styles',()=>{
 for(const path of ['verification/lint-baseline.json','verification/typecheck-baseline.json','theme-presets/shadcn-glass-ui/tokens.css'])assert.equal(select([path]).fullTests,true,path);
});
test('changed tests are selected directly, de-duplicated and passed as separate arguments',()=>{
 const plan=select(['tests/fitness.test.mjs','checkin-records.test.mjs','tests/fitness.test.mjs']);assert.equal(plan.fullTests,false);assert.deepEqual(testArguments(plan),['--test','./checkin-records.test.mjs','./tests/fitness.test.mjs']);
});
test('manual full and manual database runs remain independent options',()=>{
 const full=select(['workspace.css'],{forceFull:true});assert.equal(full.fullTests,true);assert.equal(full.databaseChecks,false);
 const data=select(['workspace.css'],{forceDatabase:true});assert.equal(data.fullTests,true);assert.equal(data.databaseChecks,true);
});
test('missing or unreadable Git comparisons enable the complete checks',()=>{
 const missing=changedFilesBetween('', 'HEAD');assert.equal(missing.known,false);
 const unreadable=changedFilesBetween('a'.repeat(40),'HEAD',{git:()=>{throw Error('object unavailable');}});assert.equal(unreadable.known,false);
 for(const result of [missing,unreadable]){const plan=selectCiPlan(result.files,{changesKnown:result.known});assert.equal(plan.fullTests,true);assert.equal(plan.databaseChecks,true);}
});
test('the full push range is inspected with NUL delimiters and both sides of renames',()=>{
 let argumentsUsed;
 const result=changedFilesBetween('a'.repeat(40),'HEAD',{git:(command,args)=>{assert.equal(command,'git');argumentsUsed=args;return project('worker.mjs')+'\0'+project('workspace.css')+'\0';}});
 assert.deepEqual(argumentsUsed,['diff','--name-only','--no-renames','-z','a'.repeat(40),'HEAD']);assert.equal(result.known,true);assert.equal(selectCiPlan(result.files).databaseChecks,true);
});
test('generated HTML detection strips only owned style blocks and preserves business code',()=>{
 const html=color=>'<head><!-- PRODUCT_DESIGN_START --><style>'+color+'</style><!-- PRODUCT_DESIGN_END --></head><script>save()</script>';
 assert.equal(authoredHtml(html('red')),authoredHtml(html('blue')));assert.notEqual(authoredHtml(html('red')),authoredHtml(html('blue').replace('save()','remove()')));
 const files=[project('workbench.html')];const git=(_cmd,args)=>args[1].startsWith('old:')?html('red'):html('blue');assert.deepEqual(generatedHtmlChanges('old','new',files,{git}),files);
 assert.deepEqual(generatedHtmlChanges('old','new',files,{git:()=>{throw Error('deleted');}}),[]);
});
test('a generated-only HTML file without its owning source still gets full tests',()=>{
 const path=project('workbench.html');assert.equal(selectCiPlan([path],{derivedOnly:[path]}).fullTests,true);
});
test('test runner rejects invalid plans and path/option injection',()=>{
 for(const tests of [['../elsewhere.test.mjs'],['/tmp/elsewhere.test.mjs'],['--inspect.test.mjs'],['tests/test.mjs;echo nope']])assert.throws(()=>testArguments({fullTests:false,databaseChecks:false,tests}),/Invalid selected/);
 assert.throws(()=>testArguments({tests:[]}),/Invalid CI/);assert.deepEqual(testArguments({fullTests:true,databaseChecks:false,tests:[]}),['--test']);
});
test('workflow retains unconditional build/assets/lint/type steps and conditional D1/recovery',()=>{
 const workflow=readFileSync(new URL('../../.github/workflows/workbench-checks.yml',import.meta.url),'utf8');
 for(const command of ['npm run build:ui','npm run build:pages','npm run check:assets','node scripts/check-generated.mjs','npm run lint:strict','npm run typecheck:strict'])assert.ok(workflow.includes('run: '+command),command);
 assert.equal(workflow.match(/if: steps\.plan\.outputs\.database_checks == 'true'/g).length,2);assert.match(workflow,/fetch-depth: 0/);assert.match(workflow,/workflow_dispatch:/);
});
