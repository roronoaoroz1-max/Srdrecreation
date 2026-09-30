import { json, body, randomId, isAdmin, getState, ensureMatchEvents } from "../../_utils.js";

const SCORING_TYPES=new Set(["goal","penalty_goal"]);
const ALLOWED_TYPES=new Set(["goal","foul","penalty_goal","penalty_miss","yellow_card","red_card"]);

export async function onRequestPost(context) {
  if (!(await isAdmin(context.request, context.env))) {
    return json({error:"Unauthorized"},401);
  }

  try {
    const data=await body(context.request);
    const DB=context.env.DB;
    await ensureMatchEvents(DB);

    const action=String(data.action||"add").trim().toLowerCase();
    const matchNo=String(data.match_no||"").trim();
    if(!matchNo) return json({error:"Choose a match"},400);

    const match=await DB.prepare("SELECT * FROM matches WHERE match_no=?").bind(matchNo).first();
    if(!match) return json({error:"Match not found"},404);

    if(action==="undo"){
      const last=await DB.prepare(
        "SELECT rowid,* FROM match_events WHERE match_no=? ORDER BY rowid DESC LIMIT 1"
      ).bind(matchNo).first();
      if(!last) return json({error:"There are no recorded events to undo"},400);

      const statements=[DB.prepare("DELETE FROM match_events WHERE id=?").bind(last.id)];
      if(SCORING_TYPES.has(last.event_type)){
        const isHome=last.team_id===match.home_team_id;
        const isAway=last.team_id===match.away_team_id;
        if(isHome) statements.push(DB.prepare("UPDATE matches SET home_score=MAX(COALESCE(home_score,0)-1,0) WHERE match_no=?").bind(matchNo));
        if(isAway) statements.push(DB.prepare("UPDATE matches SET away_score=MAX(COALESCE(away_score,0)-1,0) WHERE match_no=?").bind(matchNo));
      }
      await DB.batch(statements);
      return json({ok:true,undone:last,state:await getState(DB,true)});
    }

    if(action!=="add") return json({error:"Invalid event action"},400);

    const eventType=String(data.event_type||"").trim().toLowerCase();
    if(!ALLOWED_TYPES.has(eventType)) return json({error:"Choose a valid event type"},400);

    const teamId=String(data.team_id||"").trim();
    if(!teamId || ![match.home_team_id,match.away_team_id].includes(teamId)){
      return json({error:"Choose one of the two teams in this match"},400);
    }

    const minute=Math.max(0,Math.min(99,Number.parseInt(data.minute,10)||0));
    const second=Math.max(0,Math.min(59,Number.parseInt(data.second,10)||0));
    let playerId=String(data.player_id||"").trim()||null;

    if(playerId){
      const p=await DB.prepare("SELECT id FROM players WHERE id=? AND team_id=?").bind(playerId,teamId).first();
      if(!p) return json({error:"Selected player does not belong to that team"},400);
    }

    let detail="";
    let foulCount=null;
    let penaltyAwarded=false;

    if(eventType==="foul"){
      const q=await DB.prepare(
        "SELECT COUNT(*) AS n FROM match_events WHERE match_no=? AND team_id=? AND event_type='foul'"
      ).bind(matchNo,teamId).first();
      foulCount=Number(q?.n||0)+1;
      if(foulCount===5){
        detail="5th team foul — penalty awarded";
        penaltyAwarded=true;
      }else{
        detail=`Team foul #${foulCount}`;
      }
    }

    const id=randomId("evt");
    const statements=[
      DB.prepare("INSERT INTO match_events(id,match_no,event_type,team_id,player_id,minute,second,detail,created_at) VALUES(?,?,?,?,?,?,?,?,datetime('now'))")
        .bind(id,matchNo,eventType,teamId,playerId,minute,second,detail)
    ];

    if(SCORING_TYPES.has(eventType)){
      if(teamId===match.home_team_id){
        statements.push(DB.prepare("UPDATE matches SET home_score=COALESCE(home_score,0)+1,status='Live' WHERE match_no=?").bind(matchNo));
      }else{
        statements.push(DB.prepare("UPDATE matches SET away_score=COALESCE(away_score,0)+1,status='Live' WHERE match_no=?").bind(matchNo));
      }
      statements.push(DB.prepare("UPDATE matches SET status='Scheduled' WHERE status='Live' AND match_no<>?").bind(matchNo));
    }else if(match.status==="Scheduled"){
      statements.push(DB.prepare("UPDATE matches SET status='Live' WHERE match_no=?").bind(matchNo));
      statements.push(DB.prepare("UPDATE matches SET status='Scheduled' WHERE status='Live' AND match_no<>?").bind(matchNo));
    }

    await DB.batch(statements);
    return json({
      ok:true,
      penalty_awarded:penaltyAwarded,
      foul_count:foulCount,
      state:await getState(DB,true)
    });
  } catch(e) {
    return json({error:e.message},500);
  }
}
