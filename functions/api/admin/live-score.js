import { json, body, isAdmin, getState } from "../../_utils.js";

export async function onRequestPost(context){
  if(!(await isAdmin(context.request,context.env))) return json({error:"Unauthorized"},401);
  try{
    const d=await body(context.request),DB=context.env.DB;
    const no=String(d.match_no||"").trim();
    const m=await DB.prepare("SELECT * FROM matches WHERE match_no=?").bind(no).first();
    if(!m) return json({error:"Match not found"},404);
    if(!m.home_team_id||!m.away_team_id) return json({error:"Both teams must be known first"},400);
    const status=String(d.status||"Live");
    if(!["Scheduled","Live"].includes(status)) return json({error:"Invalid live status"},400);
    let hs=d.home_score===""||d.home_score==null?(m.home_score??0):Number(d.home_score);
    let as=d.away_score===""||d.away_score==null?(m.away_score??0):Number(d.away_score);
    if(!Number.isInteger(hs)||hs<0||!Number.isInteger(as)||as<0) return json({error:"Scores must be whole numbers 0 or above"},400);

    // Only one match should be shown as live.
    const q=[];
    if(status==="Live") q.push(DB.prepare("UPDATE matches SET status='Scheduled' WHERE status='Live' AND match_no<>?").bind(no));
    q.push(DB.prepare("UPDATE matches SET home_score=?,away_score=?,status=? WHERE match_no=?").bind(hs,as,status,no));
    await DB.batch(q);
    return json({ok:true,state:await getState(DB,true)});
  }catch(e){return json({error:e.message},500)}
}
