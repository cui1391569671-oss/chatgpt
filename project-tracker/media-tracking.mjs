export function validMediaIdentity(item){
 if(![undefined,'','manual','source'].includes(item.coverMode))return false;
 if(item.steamAppId!==undefined&&item.steamAppId!==''&&!/^\d{1,10}$/.test(item.steamAppId))return false;
 if(!item.mediaSource&&!item.mediaSourceId)return item.coverMode!=='source';
 return typeof item.mediaSourceId==='string'&&/^\d{1,12}$/.test(item.mediaSourceId)&&({tmdb:['movie','tv'],igdb:['game'],steam:['game'],bangumi:['anime'],mal:['anime']}[item.mediaSource]||[]).includes(item.mediaType||'game');
}
// Yamtrack-inspired tracking concepts, implemented for the existing workspace record API.
export const MEDIA_STATUSES={planned:'想看 / 想玩',in_progress:'进行中',on_hold:'已暂停',completed:'已完成',dropped:'已弃坑'};
export function mediaTrackingStatus(item){return item.trackingStatus||'completed';}
export function mediaProgressUnit(item){return ['anime','tv'].includes(item.mediaType)?'集':(item.mediaType||'game')==='game'?'小时':'分钟';}
export function validMediaTracking(item){
 if(!validMediaIdentity(item))return false;
 const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
 const count=value=>Number.isSafeInteger(value)&&value>=0&&value<=100000;
 const status=mediaTrackingStatus(item);
 if(!Object.hasOwn(MEDIA_STATUSES,status))return false;
 if(item.completedDate!==''&&!date(item.completedDate)||status==='completed'&&!date(item.completedDate))return false;
 if(item.startedDate!==undefined&&item.startedDate!==''&&!date(item.startedDate))return false;
 if(item.startedDate&&item.completedDate&&item.startedDate>item.completedDate)return false;
 if(['progress','total','season','repeats'].some(k=>item[k]!==undefined&&!count(item[k])))return false;
 if(item.total>0&&(item.progress||0)>item.total)return false;
 if(item.history!==undefined&&(!Array.isArray(item.history)||item.history.length>100||!item.history.every(h=>h&&typeof h.at==='string'&&h.at.length<=40&&!Number.isNaN(Date.parse(h.at))&&Object.hasOwn(MEDIA_STATUSES,h.status)&&count(h.progress)&&count(h.season)&&count(h.repeats))))return false;
 return true;
}
export function mediaTrackingHistory(old,item,at=new Date().toISOString()){
 const history=[...(old?.history||[])];
 if(!old||['trackingStatus','progress','season','repeats'].some(k=>(k==='trackingStatus'?mediaTrackingStatus(old):old[k]||0)!==(k==='trackingStatus'?mediaTrackingStatus(item):item[k]||0)))history.push({at,status:mediaTrackingStatus(item),progress:item.progress||0,season:item.season||0,repeats:item.repeats||0});
 return history.slice(-100);
}
export function mediaTrackingStats(items,year){
 return {total:items.length,active:items.filter(x=>mediaTrackingStatus(x)==='in_progress').length,planned:items.filter(x=>mediaTrackingStatus(x)==='planned').length,completed:items.filter(x=>mediaTrackingStatus(x)==='completed'&&x.completedDate?.startsWith(String(year))).length};
}
