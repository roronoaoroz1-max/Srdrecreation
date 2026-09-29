import { json, body, isAdmin, getState } from "../../_utils.js";

function validDate(v){ return /^\d{4}-\d{2}-\d{2}$/.test(String(v||"")); }
function validTime(v){ return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(v||"")); }
function stamp(date,time){
  const [y,m,d]=date.split("-").map(Number);
  const [hh,mm]=time.split(":").map(Number);
  return Date.UTC(y,m-1,d,hh,mm,0,0);
}
function parts(ms){
  const d=new Date(ms);
  return {
    date:`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`,
    time:`${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`
  };
}

export async function onRequestPost(context){
  if(!(await isAdmin(context.request,context.env))) return json({error:"Unauthorized"},401);
  try{
    const d=await body(context.request), DB=context.env.DB;
    const no=String(d.match_no||"").trim();
    const newTime=String(d.start_time||"").trim();
    if(!validTime(newTime)) return json({error:"Choose a valid match time"},400);
    const current=await DB.prepare("SELECT * FROM matches WHERE match_no=?").bind(no).first();
    if(!current) return json({error:"Match not found"},404);
    if(!validDate(current.match_date)||!validTime(current.start_time)) return json({error:"Stored match date/time is invalid"},500);
    const oldStamp=stamp(current.match_date,current.start_time);
    const newStamp=stamp(current.match_date,newTime);
    const delta=Math.round((newStamp-oldStamp)/60000);
    const statements=[DB.prepare("UPDATE matches SET start_time=? WHERE match_no=?").bind(newTime,no)];
    if(d.shift_following && delta!==0){
      const q=await DB.prepare("SELECT match_no,match_date,start_time,status,sort_order FROM matches WHERE sort_order>? ORDER BY sort_order").bind(current.sort_order).all();
      for(const m of (q.results||[])){
        if(["Finished","Walkover"].includes(m.status)) continue;
        if(!validDate(m.match_date)||!validTime(m.start_time)) continue;
        const shifted=parts(stamp(m.match_date,m.start_time)+delta*60000);
        statements.push(DB.prepare("UPDATE matches SET match_date=?,start_time=? WHERE match_no=?").bind(shifted.date,shifted.time,m.match_no));
      }
    }
    await DB.batch(statements);
    return json({ok:true,delta_minutes:delta,state:await getState(DB,true)});
  }catch(e){ return json({error:e.message},500); }
}
