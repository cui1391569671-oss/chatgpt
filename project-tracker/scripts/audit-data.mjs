// Read an explicitly supplied local full-state JSON. Never connects to production or writes input files.
import {readFileSync} from 'node:fs';
import {auditState} from '../maintenance-audit.mjs';
const index=process.argv.indexOf('--input');if(index<0||!process.argv[index+1])throw Error('Usage: node scripts/audit-data.mjs --input /protected/full-state.json');
const value=JSON.parse(readFileSync(process.argv[index+1],'utf8'));
if(!Array.isArray(value.data)||!Array.isArray(value.archive))throw Error('Expected a complete tracker state; workspace-only exports cannot audit project history.');
console.log(JSON.stringify(auditState(value),null,2));
