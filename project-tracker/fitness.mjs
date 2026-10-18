// Independently authored Chinese summaries of Free Exercise DB entries (Unlicense).
export const FITNESS_SOURCE='https://github.com/yuhonas/free-exercise-db';
export const FITNESS_PROFILE_DEFAULTS={id:'main',goal:'general',experience:'beginner',weeklyDays:3,minutes:15,equipment:'none',floorAllowed:true,excludedExercises:[],age:null,heightCm:null,weightKg:null};
export function validFitnessProfile(p){return !!p&&p.id==='main'&&['general','strength','habit'].includes(p.goal)&&['beginner','regular','experienced'].includes(p.experience)&&Number.isInteger(p.weeklyDays)&&p.weeklyDays>=1&&p.weeklyDays<=7&&Number.isInteger(p.minutes)&&p.minutes>=5&&p.minutes<=60&&['none','mat'].includes(p.equipment)&&typeof p.floorAllowed==='boolean'&&Array.isArray(p.excludedExercises)&&p.excludedExercises.length<=HOME_EXERCISES.length&&new Set(p.excludedExercises).size===p.excludedExercises.length&&p.excludedExercises.every(id=>HOME_EXERCISES.some(x=>x.id===id))&&[[p.age,18,100,true],[p.heightCm,100,250,false],[p.weightKg,25,300,false]].every(([n,min,max,integer])=>n===null||typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max&&(!integer||Number.isInteger(n)))&&typeof p.updatedAt==='string'&&p.updatedAt.length<=40&&!Number.isNaN(Date.parse(p.updatedAt));}
export function fitnessPlanForProfile(p){
 if(!p)return {rows:[],days:[],estimatedMinutes:0,reasons:['先保存训练档案，再生成适合当前条件的基础安排。']};
 const order=p.goal==='strength'?['Bodyweight_Squat','Pushups','Butt_Lift_Bridge','Plank']:p.goal==='habit'?['Bodyweight_Squat','Butt_Lift_Bridge','Plank','Pushups']:HOME_EXERCISES.map(x=>x.id);
 const eligible=order.filter(id=>!p.excludedExercises.includes(id)&&(p.floorAllowed||id==='Bodyweight_Squat'));
 const maximum=p.experience==='beginner'||p.goal==='habit'?1:p.experience==='regular'?2:3;
 const amount=id=>id==='Plank'?(p.experience==='beginner'?10:20):id==='Pushups'?(p.experience==='beginner'?4:6):(p.experience==='beginner'?6:HOME_EXERCISES.find(x=>x.id===id).amount);
 let budget=Math.max(0,p.minutes*60-120),used=120;const rows=HOME_EXERCISES.map(x=>({id:x.id,selected:false,sets:'1',amount:String(amount(x.id))}));
 for(let level=0;level<maximum;level++)for(const id of eligible){const cost=(id==='Plank'?amount(id):amount(id)*3)+60;const row=rows.find(x=>x.id===id);if(cost>budget)continue;if(level===0){row.selected=true;row.sets='1';}else if(row.selected&&Number(row.sets)===level)row.sets=String(level+1);else continue;budget-=cost;used+=cost;}
 const days={1:['周三'],2:['周二','周五'],3:['周一','周三','周五']}[Math.min(p.weeklyDays,3)];
 return {rows,days,estimatedMinutes:rows.some(x=>x.selected)?Math.ceil(used/60):0,reasons:[p.experience==='beginner'?'入门安排：较少组数，先熟悉动作。':'按训练经验设置基础组数。',`按每次 ${p.minutes} 分钟分配动作和休息，预计约 ${rows.some(x=>x.selected)?Math.ceil(used/60):0} 分钟。`,p.excludedExercises.length||!p.floorAllowed?'已过滤需避开的动作和不适合当前场地的动作。':'使用当前居家徒手动作库。']};
}
export const HOME_EXERCISES=[
 {id:'Bodyweight_Squat',name:'徒手深蹲',area:'下肢',unit:'次',amount:8,steps:['双脚约与肩同宽站立，保持胸部抬起。','屈髋屈膝向后坐，下蹲到能控制的深度。','双脚稳定着地，再站回起始位置。'],cue:'保持动作可控，膝盖沿脚尖方向移动。'},
 {id:'Pushups',name:'俯卧撑',area:'上肢',unit:'次',amount:6,steps:['双手撑地，伸直手臂支撑身体。','保持躯干稳定，屈肘让胸部向地面下降。','推起身体回到起始位置，再重复动作。'],cue:'避免腰部下塌；无法控制动作时先停止该组。'},
 {id:'Butt_Lift_Bridge',name:'臀桥',area:'臀腿',unit:'次',amount:10,steps:['仰卧屈膝，双脚约与肩同宽，双手放在身体两侧。','脚跟向地面发力，抬起髋部并短暂停留。','缓慢落下，回到起始位置。'],cue:'避免通过过度挺腰来抬高身体。'},
 {id:'Plank',name:'平板支撑',area:'核心',unit:'秒',amount:20,steps:['前臂和脚尖支撑身体，肘部位于肩部下方。','保持身体呈直线，躯干稳定。','在能够控制姿势的范围内保持，再放松休息。'],cue:'自然呼吸，不以憋气或塌腰延长时间。'}
];
export function validFitnessSession(s){return !!s&&typeof s.id==='string'&&s.id.length>0&&s.id.length<=100&&typeof s.completedOn==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s.completedOn)&&!Number.isNaN(Date.parse(s.completedOn))&&new Date(s.completedOn).toISOString().slice(0,10)===s.completedOn&&[s.startedAt,s.completedAt].every(v=>typeof v==='string'&&v.length<=40&&!Number.isNaN(Date.parse(v)))&&Date.parse(s.completedAt)>=Date.parse(s.startedAt)&&Number.isInteger(s.durationSeconds)&&s.durationSeconds>=0&&s.durationSeconds<=604800&&Array.isArray(s.exercises)&&s.exercises.length>0&&s.exercises.length<=HOME_EXERCISES.length&&new Set(s.exercises.map(e=>e?.exerciseId)).size===s.exercises.length&&s.exercises.every(e=>e&&HOME_EXERCISES.some(x=>x.id===e.exerciseId)&&Array.isArray(e.sets)&&e.sets.length>0&&e.sets.length<=10&&e.sets.every(n=>Number.isInteger(n)&&n>0&&n<=600));}
