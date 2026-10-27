import {spawnSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const root=fileURLToPath(new URL('..',import.meta.url));
export function testArguments(plan){
 if(typeof plan.fullTests!=='boolean'||typeof plan.databaseChecks!=='boolean'||!Array.isArray(plan.tests))throw Error('Invalid CI test plan');
 if(plan.fullTests)return ['--test'];
 if(plan.tests.some(path=>typeof path!=='string'||!/^(?:tests\/(?:[\w-]+\/)*)?\w[\w-]*\.test\.mjs$/.test(path)))throw Error('Invalid selected test path');
 return plan.tests.length?['--test',...[...new Set(plan.tests)].map(path=>'./'+path)]:[];
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv[2])throw Error('CI test plan path is required');
 const args=testArguments(JSON.parse(readFileSync(process.argv[2],'utf8')));
 if(args.length){for(const file of args.slice(1))if(!existsSync(resolve(root,file)))throw Error('Selected test missing: '+file);const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});if(result.error)throw result.error;process.exitCode=result.status??1;}
 else console.log('No runtime/test changes: Node tests not selected; build, asset, lint and type checks still run.');
}
