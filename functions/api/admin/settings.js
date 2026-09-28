import { json, body, isAdmin, getState, getConfig, minutes, hhmm } from "../../_utils.js";

export async function onRequestPost(context) {
  if (!(await isAdmin(context.request, context.env))) return json({error:"Unauthorized"},401);
  try {
    const d=await body(context.request), DB=context.env.DB;
    const cfg={
      tournament_name:String(d.tournament_name||"").trim(),
      venue:String(d.venue||"").trim(),
      date:String(d.date||"").trim(),
      start_time:String(d.start_time||"").trim(),
      first_half:Number(d.first_half), halftime:Number(d.halftime),
      second_half:Number(d.second_half), changeover:Number(d.changeover),
      final_recovery:Number(d.final_recovery), max_squad:Number(d.max_squad),
      grace_minutes:Number(d.grace_minutes)
    };
    if(!cfg.tournament_name) return json({error:"Tournament name is required"},400);
    if(!cfg.venue) return json({error:"Venue is required"},400);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(cfg.date)) return json({error:"Invalid tournament date"},400);
    if(!/^\d{2}:\d{2}$/.test(cfg.start_time)) return json({error:"Invalid start time"},400);
    for(const k of ["first_half","halftime","second_half","changeover","final_recovery","max_squad","grace_minutes"]){
      if(!Number.isFinite(cfg[k])||cfg[k]<0) return json({error:`Invalid ${k}`},400);
    }
    if(cfg.max_squad<3) return json({error:"Maximum squad must be at least 3"},400);

    const map={
      config_tournament_name:cfg.tournament_name, config_venue:cfg.venue,
      config_date:cfg.date, config_start_time:cfg.start_time,
      config_first_half:String(cfg.first_half), config_halftime:String(cfg.halftime),
      config_second_half:String(cfg.second_half), config_changeover:String(cfg.changeover),
      config_final_recovery:String(cfg.final_recovery), config_max_squad:String(cfg.max_squad),
      config_grace_minutes:String(cfg.grace_minutes)
    };
    await DB.batch(Object.entries(map).map(([k,v])=>
      DB.prepare("INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(k,v)
    ));

    if(d.rebuild_schedule){
      const fresh=await getConfig(DB);
      const start=minutes(fresh.start_time);
      const slot=fresh.first_half+fresh.halftime+fresh.second_half+fresh.changeover;
      const sch={
        M1:start,M2:start+slot,M3:start+2*slot,M4:start+3*slot,M5:start+4*slot,M6:start+5*slot,
        QF1:start+6*slot,QF2:start+7*slot,QF3:start+8*slot,QF4:start+9*slot,
        SF1:start+10*slot,SF2:start+11*slot,
        F:start+12*slot+fresh.final_recovery
      };
      await DB.batch(Object.entries(sch).map(([no,min])=>
        DB.prepare("UPDATE matches SET match_date=?,start_time=? WHERE match_no=?").bind(fresh.date,hhmm(min),no)
      ));
    }
    return json({ok:true,state:await getState(DB,true)});
  } catch(e){ return json({error:e.message},500); }
}
