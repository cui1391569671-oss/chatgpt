import {ESLint} from 'eslint';
import {fileURLToPath} from 'node:url';
import {relative} from 'node:path';
import {checkDiagnosticBaseline} from './diagnostic-baseline.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),eslint=new ESLint({cwd:root});
const results=await eslint.lintFiles(['**/*.{js,mjs,jsx,ts,tsx}']);
const diagnostics=results.flatMap(result=>result.messages.map(message=>({file:relative(root,result.filePath).replaceAll('\\','/'),line:message.line||0,code:message.ruleId||'parse-error',message:message.message})));
checkDiagnosticBaseline('lint',diagnostics);
