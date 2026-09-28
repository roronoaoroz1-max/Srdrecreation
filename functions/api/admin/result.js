import { json, body, isAdmin, getState } from "../../_utils.js";
const DEST = {
  M1:["QF1","away_team_id"], M2:["QF2","home_team_id"], M3:["QF2","away_team_id"],
  M4:["QF3","away_team_id"], M5:["QF4","home_team_id"], M6:["QF4","away_team_id"],
  QF1:["SF1","home_team_id"], QF2:["SF1","away_team_id"], QF3:["SF2","home_team_id"], QF4:["SF2","away_team_id"],
  SF1:["F","home_team_id"], SF2:["F","away_team_id"]
};
export async function onRequestPost(context) {
  if (!(await isAdmin(context.request,context.env))) return json({error:"Unauthorized"},401);
  try {
    const d=await body(context.request), DB=context.env.DB;
    const m=await DB.prepare("SELECT * FROM matches WHERE match_no=?").bind(d.match_no).first();
    if (!m) return json({error:"Match not found"},404);
    if (!m.home_team_id || !m.away_team_id) return json({error:"Both teams must be known first"},400);

    const hs=Number(d.home_score), as=Number(d.away_score);
    let hp=d.home_penalties===null||d.home_penalties===undefined?null:Number(d.home_penalties);
    let ap=d.away_penalties===null||d.away_penalties===undefined?null:Number(d.away_penalties);
    if (!Number.isFinite(hs)||!Number.isFinite(as)) return json({error:"Invalid score"},400);
    if (hs===as && (!Number.isFinite(hp)||!Number.isFinite(ap)||hp===ap)) return json({error:"A tied match requires a penalty winner"},400);
    if (hs!==as) { hp=null; ap=null; }

    let winner = hs>as ? m.home_team_id : as>hs ? m.away_team_id : hp>ap ? m.home_team_id : m.away_team_id;
    const statements=[
      DB.prepare(`UPDATE matches SET home_score=?,away_score=?,home_penalties=?,away_penalties=?,status='Finished',winner_team_id=? WHERE match_no=?`)
        .bind(hs,as,hp,ap,winner,d.match_no)
    ];
    const dest=DEST[d.match_no];
    if (dest) {
      const col=dest[1];
      const sql = col==="home_team_id"
        ? "UPDATE matches SET home_team_id=? WHERE match_no=?"
        : "UPDATE matches SET away_team_id=? WHERE match_no=?";
      statements.push(DB.prepare(sql).bind(winner,dest[0]));
    }
    await DB.batch(statements);
    return json({ok:true,state:await getState(DB,true)});
  } catch(e) { return json({error:e.message},500); }
}
