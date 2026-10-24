import test from 'node:test';
import assert from 'node:assert/strict';
import {ESLint} from 'eslint';
import {fileURLToPath} from 'node:url';
const eslint=new ESLint({cwd:fileURLToPath(new URL('..',import.meta.url))});

test('JSX references count as usage while truly unused declarations still fail',async()=>{
 const [result]=await eslint.lintText('const Used=()=>null;const Unused=()=>null;export const View=()=> <Used/>;',{filePath:'calendar-ui/src/lint-contract.fixture.jsx'});
 const unused=result.messages.filter(message=>message.ruleId==='no-unused-vars');
 assert.equal(unused.length,1);
 assert.match(unused[0].message,/'Unused'/);
});

test('embedded script exports cover named bridge functions, not unrelated dead code',async()=>{
 const [result]=await eslint.lintText('/* exported bridge */\nfunction bridge(){}\nfunction unused(){}',{filePath:'lint-contract-adapter.js'});
 const unused=result.messages.filter(message=>message.ruleId==='no-unused-vars');
 assert.equal(unused.length,1);
 assert.match(unused[0].message,/'unused'/);
});
