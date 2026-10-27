import {execFileSync} from 'node:child_process';
import {writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {parseArgs} from 'node:util';

const root=fileURLToPath(new URL('..',import.meta.url));
const generated=new Set(['pages.mjs','tasks-assets.mjs','ilamy-assets.mjs','ilamy-recurrence-runtime.mjs','wallpaper-assets.mjs','glass-theme.mjs','glass-preset.css','fitness-media.mjs']);
const visualTests=['tests/ui-standardization.test.mjs','tests/style-ownership.test.mjs','tests/glass-preset.test.mjs','tests/control-ownership.test.mjs'];
const pageTests=new Map([
 ['tasks-ui/src/annual-plans.tsx',['tests/annual-plans.test.mjs']],
 ['tasks-ui/src/fitness.tsx',['tests/fitness.test.mjs']],
 ['tasks-ui/src/word-practice.tsx',['tests/word-practice.test.mjs']],
 ['tasks-ui/src/personal-info.tsx',['tests/personal-vault.test.mjs']],
 ['tasks-ui/src/game-task-migration.tsx',['tests/game-task-links.test.mjs']]
]);
// Storage, authentication counters, ingestion and recovery need real D1 coverage.
const dataPath=/^(?:worker\.mjs|cloud-records\.mjs|auth\.mjs|calendar-images\.mjs|personal-vault\.mjs|project-core-(?:info|sync|sheet)\.mjs|vocabulary-sheet\.mjs|(?:migrations|database|backups|recovery)\/|.*\.sql$|wrangler[^/]*\.(?:jsonc?|toml)$|configure\.mjs|package(?:-lock)?\.json$|google-apps-script\/|scripts\/(?:.*d1.*|.*recovery.*|verify-restored-app\.mjs)$)/;
const knownBusiness=/^(?:annual-plans|calendar-sources|checkin-records|daily-vocabulary|event-recurrence|fitness|focus-return|game-covers|game-releases|game-task-links|holidays|maintenance-audit|media-cover-resolver|media-image|media-sources|media-tracking|project-core-summary|project-labels|project-validation|request-body|requirements|security-policy|static-assets|steam-artwork|steam-reviews|today-tasks|vocabulary|wardrobe|word-practice)\.mjs$/;
const sharedUi=/^(?:tasks-ui\/|calendar-ui\/|.*\.html$|.*-adapter\.js$|workbench-shell\.js$|media-(?:library|cover-picker)\.js$|today-tasks-page\.js$|workspace-[^/]+\.js$|file-trigger\.js$|build-[^/]+\.mjs$|theme-presets\/|assets\/)/;
const pipelinePath=/^(?:\.github\/workflows\/workbench-checks\.yml|scripts\/ci-(?:plan|run)\.mjs)$/;

export function selectCiPlan(changedFiles,{changesKnown=true,forceFull=false,forceDatabase=false,derivedOnly=[]}={}){
 const tests=new Set(),reasons=new Set();let fullTests=forceFull,databaseChecks=forceDatabase;
 const files=[...new Set(changedFiles)].sort();
 if(forceFull)reasons.add('Manual full test run');
 if(forceDatabase)reasons.add('Manual database/recovery run');
 if(!changesKnown){fullTests=true;databaseChecks=true;reasons.add('Changed files unavailable: conservative full checks');}
 let generatedChanged=false,sourceChanged=false;
 for(const repoPath of files){
  if(pipelinePath.test(repoPath)){fullTests=true;databaseChecks=true;sourceChanged=true;reasons.add('CI selection/workflow changed: validate the complete pipeline');continue;}
  if(!repoPath.startsWith('project-tracker/'))continue;
  const path=repoPath.slice('project-tracker/'.length);
  if(pipelinePath.test(path)){fullTests=true;databaseChecks=true;sourceChanged=true;reasons.add('CI selection/runner changed: validate the complete pipeline');continue;}
  if(generated.has(path)||derivedOnly.includes(repoPath)){generatedChanged=true;continue;}
  if(/\.md$/i.test(path)||/^verification\/(?!.*(?:lint|typecheck)-baseline\.json$)/.test(path)||/^(?:LICENSE|.*LICENSE\.txt$)/.test(path))continue;
  sourceChanged=true;
  if(dataPath.test(path)){fullTests=true;databaseChecks=true;reasons.add('Storage, sync, runtime or recovery change');continue;}
  if(/\.test\.mjs$/.test(path)){tests.add(path);reasons.add('Changed test files');continue;}
  if(path.startsWith('theme-presets/')){fullTests=true;reasons.add('Pinned upstream design system changed');continue;}
  if(/\.css$/.test(path)){visualTests.forEach(test=>tests.add(test));reasons.add('Styles: focused UI contracts');continue;}
  if(pageTests.has(path)){[...visualTests,...pageTests.get(path)].forEach(test=>tests.add(test));reasons.add('Page component: related feature and UI contracts');continue;}
  if(sharedUi.test(path)||knownBusiness.test(path)||path.startsWith('tests/helpers/')||path.startsWith('scripts/')||/^(?:eslint\.config\.mjs|verification\/(?:lint|typecheck)-baseline\.json)$/.test(path)){
   fullTests=true;reasons.add('Shared logic, business logic, dependencies or test infrastructure changed');continue;
  }
  fullTests=true;databaseChecks=true;reasons.add('Unclassified source: conservative full checks');
 }
 if(generatedChanged&&!sourceChanged){fullTests=true;reasons.add('Generated-only change: run the full test suite');}
 if(databaseChecks)fullTests=true;
 return {fullTests,databaseChecks,tests:fullTests?[]:[...tests].sort(),reasons:[...reasons],changedFiles:files};
}

export function changedFilesBetween(base,head,{git=execFileSync}={}){
 if(!/^[a-f0-9]{40,64}$/i.test(base||'')||!(/^[a-f0-9]{40,64}$/i.test(head||'')||head==='HEAD'))return {files:[],known:false};
 try{return {files:git('git',['diff','--name-only','--no-renames','-z',base,head],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean),known:true};}
 catch{return {files:[],known:false};}
}

// These HTML files contain authored business code as well as generated CSS.
// Ignore a changed HTML file only when its authored portion is byte-equivalent.
export function authoredHtml(content){return content.replace(/\r\n/g,'\n').replace(/<!-- (PRODUCT_DESIGN|GLASS_PUBLIC)_START -->[\s\S]*?<!-- \1_END -->/g,'');}
export function generatedHtmlChanges(base,head,files,{git=execFileSync}={}){
 const result=[];
 for(const path of files.filter(path=>/^project-tracker\/(?:index|workbench|landing)\.html$/.test(path)))try{
  const read=ref=>git('git',['show',ref+':'+path],{cwd:root,encoding:'utf8',maxBuffer:10000000});
  if(authoredHtml(read(base))===authoredHtml(read(head)))result.push(path);
 }catch{/* New/deleted/unreadable HTML stays a source change. */}
 return result;
}

function main(){
 const {values}=parseArgs({options:{base:{type:'string'},head:{type:'string',default:'HEAD'},plan:{type:'string'},'force-full':{type:'boolean'},'force-database':{type:'boolean'}}});
 let base=values.base;
 // Manual runs have no push "before" SHA; compare the latest commit when possible.
 if(!base&&process.env.GITHUB_EVENT_NAME==='workflow_dispatch')try{base=execFileSync('git',['rev-parse','HEAD^'],{cwd:root,encoding:'utf8'}).trim();}catch{/* handled conservatively below */}
 const changed=changedFilesBetween(base,values.head);
 const derivedOnly=changed.known?generatedHtmlChanges(base,values.head,changed.files):[];
 const plan=selectCiPlan(changed.files,{changesKnown:changed.known,derivedOnly,forceFull:values['force-full']||process.env.CI_TEST_SCOPE==='full',forceDatabase:values['force-database']||process.env.CI_DATABASE_CHECKS==='true'});
 // A removed test cannot be passed to node --test. Retest the remaining suite.
 if(plan.tests.some(path=>!existsSync(resolve(root,path)))){plan.fullTests=true;plan.tests=[];plan.reasons.push('Selected test removed: run remaining full suite');}
 if(values.plan){mkdirSync(dirname(resolve(values.plan)),{recursive:true});writeFileSync(values.plan,JSON.stringify(plan,null,2)+'\n');}
 if(process.env.GITHUB_OUTPUT)writeFileSync(process.env.GITHUB_OUTPUT,'full_tests='+plan.fullTests+'\ndatabase_checks='+plan.databaseChecks+'\n',{flag:'a'});
 console.log(JSON.stringify(plan,null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
