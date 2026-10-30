// Run after the endpoint has been deployed and the protected config is provisioned.
// Usage: node scripts/install-dingtalk-sync.mjs /absolute/path/to/config.json
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname,isAbsolute,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {syncDingtalkCalendar} from './sync-dingtalk-calendar.mjs';
if(process.platform!=='darwin')throw Error('此安装器仅适用于macOS');
const configPath=process.argv[2];if(!configPath||!isAbsolute(configPath)||statSync(configPath).mode&0o077)throw Error('请指定权限为0600的绝对配置文件路径');
const config=JSON.parse(readFileSync(configPath,'utf8'));if(!isAbsolute(config.DWS_BINARY))throw Error('DWS_BINARY必须是持久安装的绝对路径');
await syncDingtalkCalendar(config); // Do not install a recurring job until a real push succeeds.
const label='com.workbench.dingtalk-calendar',agent=join(homedir(),'Library/LaunchAgents',label+'.plist'),runner=fileURLToPath(new URL('./sync-dingtalk-calendar.mjs',import.meta.url)),logs=dirname(configPath),xml=v=>v.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
mkdirSync(dirname(agent),{recursive:true});
writeFileSync(agent,`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array>${[process.execPath,runner,'--config',configPath].map(v=>'<string>'+xml(v)+'</string>').join('')}</array><key>WorkingDirectory</key><string>${xml(dirname(runner))}</string><key>StartInterval</key><integer>300</integer><key>RunAtLoad</key><true/><key>ProcessType</key><string>Background</string><key>StandardOutPath</key><string>${xml(join(logs,'dingtalk-sync.log'))}</string><key>StandardErrorPath</key><string>${xml(join(logs,'dingtalk-sync-error.log'))}</string></dict></plist>`,{mode:0o600});
const domain='gui/'+process.getuid();try{execFileSync('launchctl',['bootout',domain+'/'+label],{stdio:'ignore'});}catch{/* First installation has no previous job. */}
execFileSync('launchctl',['bootstrap',domain,agent],{stdio:'pipe'});execFileSync('launchctl',['print',domain+'/'+label],{stdio:'ignore'});
console.log('已安装钉钉主日历同步：每5分钟运行，电脑离线或休眠时暂停。');
