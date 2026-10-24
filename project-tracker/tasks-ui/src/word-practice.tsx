import {motionTiming,useWorkspaceMotionOff} from '@/workspace-motion-policy';
import {motion} from 'motion/react';
import {CheckCircle2} from 'lucide-react';
import {useState,useRef,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {WorkspaceProgress} from '@/components/workspace-progress';
import {WorkspaceSelect} from '@/components/workspace-select';
import {practiceQueue,sentenceQueue,spellingMatches,sentenceMatches} from '../../word-practice.mjs';
const modes=[{value:'sentence',label:'句子 · 看中文写英文'},{value:'dictation',label:'单词 · 看中文写英文'},{value:'typing',label:'单词 · 英文跟打'}];
const modeLabel=mode=>modes.find(item=>item.value===mode)?.label||'单词练习';
const unit=mode=>mode==='sentence'?'句':'词';
function Practice({words,bridge,close,controller}){
 const reduce=useWorkspaceMotionOff();
 const [library,setLibrary]=useState(words),[sessions,setSessions]=useState(()=>bridge.sessions?.()||[]);
 const round=useRef(null);
 const [mode,setMode]=useState('sentence'),[scope,setScope]=useState('unknown'),[limit,setLimit]=useState('20');
 const [queue,setQueue]=useState(null),[index,setIndex]=useState(0),[answer,setAnswer]=useState(''),[result,setResult]=useState(null),[mistakes,setMistakes]=useState([]),[correct,setCorrect]=useState(0),[pending,setPending]=useState(false),[error,setError]=useState(''),[revealed,setRevealed]=useState(false),[speaking,setSpeaking]=useState(false);
 const lock=useRef(false),input=useRef<HTMLInputElement|HTMLTextAreaElement>(null),composing=useRef(false),hadError=useRef(false);
 const current=queue?.[index],finished=queue&&index>=queue.length,isSentence=mode==='sentence';
 const completed=Math.min(queue?.length||0,index+(result?1:0));
 const progress=queue?.length?Math.round(completed/queue.length*100):0;
 const reference=current?(isSentence?current.example:current.word):'';
 const showAnswer=mode==='typing'||revealed||!!result;
 const todaySessions=sessions.filter(s=>s.completedOn===bridge.today());
 const recentSessions=[...sessions].sort((a,b)=>b.completedAt.localeCompare(a.completedAt)).slice(0,10);
 const sessionLabel=s=>`${new Date(s.completedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})} · ${modeLabel(s.mode)} · ${s.total} ${unit(s.mode)} · 首次匹配率 ${Math.round(s.correct/s.total*100)}% · ${Math.floor(s.durationSeconds/60)}分${s.durationSeconds%60}秒`;
 useEffect(()=>()=>{window.speechSynthesis?.cancel();},[]);
 useEffect(()=>{input.current?.focus();},[index,queue]);
 controller.isEditing=()=>lock.current||!!queue&&!finished;
 controller.update=rows=>{setLibrary(rows);setSessions(bridge.sessions());};
 const selected=isSentence?sentenceQueue(library,scope,Number(limit)):practiceQueue(library.filter(word=>mode==='typing'||word.meaning?.trim()),scope,Number(limit));
 const missingTranslations=library.filter(word=>word.example?.trim()&&!sentenceQueue([word],'all',1).length).length;
 function start(list=selected){round.current={id:crypto.randomUUID(),startedAt:new Date().toISOString()};window.speechSynthesis?.cancel();setSpeaking(false);setQueue(list);setIndex(0);setAnswer('');setResult(null);setMistakes([]);setCorrect(0);setError('');setRevealed(false);hadError.current=false;}
 function next(){window.speechSynthesis?.cancel();setSpeaking(false);setIndex(i=>i+1);setAnswer('');setResult(null);setRevealed(false);setError('');hadError.current=false;requestAnimationFrame(()=>input.current?.focus());}
 async function save(correctAnswer){
  if(lock.current)return;lock.current=true;setPending(true);setError('');
  try{
   const final=index+1===queue.length,completedAt=new Date().toISOString();
   const session=final?(round.current.session??={id:round.current.id,startedAt:round.current.startedAt,completedAt,mode,total:queue.length,correct:correct+(correctAnswer?1:0),durationSeconds:Math.min(604800,Math.max(0,Math.floor((Date.parse(completedAt)-Date.parse(round.current.startedAt))/1000)))}):undefined;
   const saved=await bridge.review(current.id,correctAnswer,session);setLibrary(saved);if(final)setSessions(bridge.sessions());
   if(!correctAnswer)setMistakes(list=>list.some(x=>(x.practiceId||x.id)===(current.practiceId||current.id))?list:[...list,current]);else setCorrect(n=>n+1);
   setResult(correctAnswer?'correct':'wrong');
  }catch(e){setError(e.message||'保存失败，答案仍保留，请重试。');requestAnimationFrame(()=>input.current?.focus());}finally{lock.current=false;setPending(false);}
 }
 function submit(){
  if(lock.current||composing.current||result)return;
  if(!answer.trim()){setError(isSentence?'请先写出英文句子。':'请输入单词后再检查。');input.current?.focus();return;}
  if(!(isSentence?sentenceMatches(answer,reference):spellingMatches(answer,reference))){hadError.current=true;setError(isSentence?'与参考表达不同。可以修改后重试，或查看参考句对照学习。':'拼写还不正确，请修改后再检查，或查看答案。');input.current?.focus();return;}
  void save(!hadError.current&&!revealed);
 }
 async function leave(){if(lock.current)return;if(queue&&!finished&&!await window.WorkspacePrimitives.confirm({title:'结束本次练习？',description:'已经提交的学习记录已保存，当前尚未提交的答案会丢失。',action:'结束练习'}))return;close();}
 function speak(){
  if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window)){setError('当前浏览器不支持朗读。');return;}
  if(speaking){window.speechSynthesis.cancel();setSpeaking(false);return;}
  const utterance=new SpeechSynthesisUtterance(reference);utterance.lang='en-US';utterance.rate=.85;utterance.onend=()=>setSpeaking(false);utterance.onerror=e=>{setSpeaking(false);if(!['interrupted','canceled'].includes(e.error))setError('读音播放失败，请确认设备已安装英语语音。');};window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);setSpeaking(true);
 }
 const inputProps={id:'word-practice-input',value:answer,autoComplete:'off',autoCorrect:'off',autoCapitalize:'none',spellCheck:false,placeholder:isSentence?'写出对应的英文句子…':'在这里输入单词…',disabled:pending||!!result,'aria-invalid':!!error,'aria-describedby':'word-practice-feedback',maxLength:isSentence?5000:200,onCompositionStart:()=>{composing.current=true;},onCompositionEnd:()=>{composing.current=false;},onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>{setAnswer(e.target.value);if(!pending)setError('');},onKeyDown:(e:React.KeyboardEvent<HTMLInputElement|HTMLTextAreaElement>)=>{if(e.key==='Enter'){if(e.nativeEvent.isComposing||composing.current){e.preventDefault();return;}if(isSentence&&!e.shiftKey){e.preventDefault();submit();}}}};
 return <section className='word-practice-page' aria-label='英语练习'>
  <header className='word-practice-header workspace-page-hero'><div><h2>{finished?'本轮练习完成':'英语练习'}</h2><p className='muted'>{queue?'先看中文，写出英文，再对照参考表达。':'在自己的词库例句里学习表达。'}</p></div><Button variant='outline' disabled={pending} onClick={()=>void leave()}>词汇库</Button></header>
  <div className='word-practice-body card'>
   <div className='word-practice-session-head'><p className='muted' role='status'>{todaySessions.length?`今日已完成 ${todaySessions.length} 轮练习`:'今日尚未完成整轮练习'}</p>{queue&&!finished&&<Button variant='ghost' disabled={pending} onClick={()=>void leave()}>退出练习</Button>}</div>
   {!queue?<>
    <div className='word-practice-settings'>
     <label>练习方式<WorkspaceSelect label='练习方式' value={mode} onValueChange={setMode} options={modes}/></label>
     <label>练习范围<WorkspaceSelect label='练习范围' value={scope} onValueChange={setScope} options={[{value:'unknown',label:'尚未掌握'},{value:'all',label:'全部词汇'}]}/></label>
     <label>本轮数量<WorkspaceSelect label='本轮数量' value={limit} onValueChange={setLimit} options={[10,20,50].map(n=>({value:String(n),label:n+' '+unit(mode)}))}/></label>
    </div>
    <div className='word-practice-intro'><strong>{selected.length?`${selected.length} ${unit(mode)}，专注这一轮`:isSentence?'还没有配好中文译文的例句':'当前没有可练习的单词'}</strong>
     <p>{isSentence?'显示例句中文，填写整句英文。Enter 检查，Shift + Enter 换行；大小写、空格和句末标点差异不影响匹配。':'显示中文释义，填写英文；也可切换英文跟打。'}</p>
     {isSentence&&missingTranslations>0&&<p className='muted'>{missingTranslations} 个词条的例句待补译文。在源表格添加“例句译文”列，多条例句与译文按相同顺序分行填写。</p>}
     <Button disabled={!selected.length} onClick={()=>start()}>开始练习</Button>{isSentence&&!selected.length&&<Button variant='ghost' onClick={()=>setMode('dictation')}>先练中文释义写单词</Button>}
    </div>
   </>:finished?<div className='word-practice-summary'><strong>{queue.length} {unit(mode)}已练习</strong><p>首次匹配 {correct} · 待巩固 {mistakes.length}</p>{mistakes.length>0&&<div className='word-practice-mistakes'>{mistakes.map(w=><span key={w.practiceId||w.id}>{isSentence?w.exampleTranslation:w.word}</span>)}</div>}<p className='muted' role='status'>本轮记录已自动保存 · 首次匹配率 {Math.round(correct/queue.length*100)}%</p><p className='muted'>关联词条的复习记录已更新。</p></div>:<>
    <div className='word-practice-position'><span>{modeLabel(mode)}</span><span>{index+1} / {queue.length}</span></div>
    <div className='word-practice-progress'><div className='word-practice-progress-caption'><span className='muted'>已完成 {completed} / {queue.length} {unit(mode)}</span><strong>{progress}%</strong></div><WorkspaceProgress value={progress} label={`本轮进度，已完成 ${completed} / ${queue.length} ${unit(mode)}`}/></div>
    <motion.div className='word-practice-word' key={current.practiceId||current.id} initial={{opacity:reduce?1:0,y:reduce?0:6}} animate={{opacity:1,y:0}} transition={{duration:reduce?0:motionTiming.control/1000}}>
     {isSentence?<p className='word-practice-sentence' lang='zh-CN'>{current.exampleTranslation}</p>:<>
      <p className='word-practice-sentence'>{current.meaning||'暂无释义'}</p>
      {showAnswer&&<div className='word-practice-letters' aria-label={current.word}>{[...current.word].map((letter,i)=><span key={i} data-tone={mode==='typing'&&i<answer.length?(letter.toLowerCase()===answer[i]?.toLowerCase()?'correct':'wrong'):undefined}>{letter}</span>)}</div>}
     </>}
     {showAnswer&&<div className='word-practice-reference'><p className='muted'>{isSentence?'参考表达':'单词读音'}</p>{isSentence&&<p lang='en'>{reference}</p>}<p className='muted'>{isSentence?current.word+' · '+(current.meaning||''):[current.phonetic,current.partOfSpeech].filter(Boolean).join(' · ')}</p><Button variant='ghost' onClick={speak} aria-label={speaking?'停止朗读':isSentence?'朗读参考句':'播放单词读音'}>{speaking?'停止朗读':'播放读音'}</Button></div>}
    </motion.div>
    <form noValidate onSubmit={e=>{e.preventDefault();submit();}}>
     <label htmlFor='word-practice-input' className='sr-only'>{isSentence?'输入英文句子':'输入单词拼写'}</label>
     {isSentence?<Textarea ref={node=>{input.current=node;}} {...inputProps} className='resize-none' rows={3}/>:<Input ref={node=>{input.current=node;}} {...inputProps}/>}
     <div id='word-practice-feedback' className='word-practice-feedback' data-result={result} role={error?'alert':'status'}>{result==='correct'&&<CheckCircle2 size={16} aria-hidden='true'/>}{error||(result==='correct'?'与参考表达一致，学习记录已保存。':result==='wrong'?'已记录为待巩固，可以对照参考表达学习。':revealed?'参考答案已显示，本题将记为待巩固。':'输入后按 Enter 检查。')}</div>
     {isSentence&&<p className='muted'>按参考句匹配，其他正确译法可能不同。</p>}
     {!isSentence&&result&&current.example&&<p className='word-practice-example'>{current.example}</p>}
     <div className='word-practice-actions'>{result?<Button type='button' onClick={next}>{index+1===queue.length?'查看结果':isSentence?'下一句':'下一个单词'}</Button>:<>
      <Button type='submit' disabled={pending}>{pending?'正在保存…':isSentence?'检查句子':'检查拼写'}</Button>
      <Button type='button' variant='ghost' disabled={pending} onClick={()=>{setRevealed(true);hadError.current=true;input.current?.focus();}}>{isSentence?'查看参考句':'查看答案'}</Button>
      <Button type='button' variant='ghost' disabled={pending} onClick={()=>{setRevealed(true);void save(false);}}>暂时不会</Button>
     </>}</div>
    </form>
   </>}
   {(!queue||finished)&&<section aria-label='最近练习记录' className='word-practice-summary'><h3>最近练习记录</h3>{recentSessions.length?<ol>{recentSessions.map(s=><li key={s.id}>{sessionLabel(s)}</li>)}</ol>:<p className='muted'>完成一轮后自动记录数量、首次匹配率和用时。</p>}</section>}
  </div>
  <footer className='word-practice-footer'>{finished&&mistakes.length>0&&<Button onClick={()=>start(mistakes)}>重练待巩固内容</Button>}{finished&&<Button variant='outline' onClick={()=>setQueue(null)}>重新选择</Button>}</footer>
 </section>;
}
export const workspaceWordPractice={mount(node,words,bridge){const root=createRoot(node),controller:{update?:(rows:unknown[])=>void;isEditing?:()=>boolean}={};root.render(<Practice words={words} bridge={bridge} controller={controller} close={()=>setTimeout(bridge.close,0)}/>);return {update:rows=>controller.update?.(rows),isEditing:()=>controller.isEditing?.(),dispose:()=>{window.speechSynthesis?.cancel();root.unmount();}};}};
window.WorkspaceWordPractice=workspaceWordPractice;
