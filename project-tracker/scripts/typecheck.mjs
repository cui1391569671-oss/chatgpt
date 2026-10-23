import ts from 'typescript';
import {fileURLToPath} from 'node:url';
import {relative} from 'node:path';
import {checkDiagnosticBaseline} from './diagnostic-baseline.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),configPath=ts.findConfigFile(root,ts.sys.fileExists,'tsconfig.audit.json');
const config=ts.readConfigFile(configPath,ts.sys.readFile);if(config.error)throw Error(ts.flattenDiagnosticMessageText(config.error.messageText,' '));
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,root),program=ts.createProgram(parsed.fileNames,parsed.options);
const diagnostics=[...parsed.errors,...ts.getPreEmitDiagnostics(program)].map(d=>({file:d.file?relative(root,d.file.fileName).replaceAll('\\','/'):'tsconfig.audit.json',line:d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start).line+1:0,code:String(d.code),message:ts.flattenDiagnosticMessageText(d.messageText,' ')}));
checkDiagnosticBaseline('typecheck',diagnostics);
