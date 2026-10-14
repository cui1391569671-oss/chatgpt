import {findGameCover} from './game-covers.mjs';
const cache=new Map();
export async function getSteamReview({appid,title},fetcher=fetch){
 if(!appid){const match=await findGameCover(title||'',fetcher);appid=match.coverUrl.match(/\/apps\/(\d+)\//)?.[1];}
 if(!/^\d{1,10}$/.test(String(appid||'')))return {status:'unmatched',label:'暂无 Steam 评价'};
 const existing=cache.get(appid);if(fetcher===fetch&&existing&&existing.expires>Date.now())return existing.value;
 try{
  const input={appid:Number(appid),languages:['all'],review_type:0,purchase_type:0,num_per_page:1,day_range:0,display_language:'schinese'};
  const r=await fetcher('https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/?input_json='+encodeURIComponent(JSON.stringify(input)),{signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error('Steam unavailable');const data=await r.json(),summary=(data.response||data).query_summary;
  if(!summary||!Number.isFinite(summary.total_reviews)||summary.total_reviews<0)throw Error('Invalid review summary');
  const labels={1:'差评如潮',2:'差评如潮',3:'差评',4:'多半差评',5:'褒贬不一',6:'多半好评',7:'好评',8:'特别好评',9:'好评如潮'};
  const value={status:summary.total_reviews?'ready':'empty',label:summary.total_reviews?(summary.review_score_desc||labels[summary.review_score]||'暂无评价'):'暂无评价',total:summary.total_reviews,positivePercent:summary.total_reviews?Math.round(summary.total_positive/summary.total_reviews*100):null};
  if(fetcher===fetch){if(cache.size>200)cache.clear();cache.set(appid,{value,expires:Date.now()+600000});}return value;
 }catch{return {status:'unavailable',label:'评价暂不可用'};}
}
