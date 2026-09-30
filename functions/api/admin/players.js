import { json, body, randomId, isAdmin, getState } from "../../_utils.js";

export async function onRequestPost(context) {
  if (!(await isAdmin(context.request, context.env))) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const data=await body(context.request);
    const action=String(data.action||"").trim().toLowerCase();
    const DB=context.env.DB;

    if(action==="add"){
      const teamId=String(data.team_id||"").trim();
      const name=String(data.name||"").trim();
      if(!teamId) return json({error:"Choose a team"},400);
      if(!name) return json({error:"Enter the player name"},400);

      const team=await DB.prepare("SELECT id FROM teams WHERE id=?").bind(teamId).first();
      if(!team) return json({error:"Team not found"},404);

      const duplicate=await DB.prepare(
        "SELECT id FROM players WHERE team_id=? AND lower(name)=lower(?) LIMIT 1"
      ).bind(teamId,name).first();
      if(duplicate) return json({error:"That player name already exists in this team"},400);

      const id=randomId("p");
      await DB.prepare(
        "INSERT INTO players(id,name,team_id,shirt_no,position,created_at) VALUES(?,?,?,?,?,datetime('now'))"
      ).bind(id,name,teamId,"","Player").run();

      return json({ok:true,state:await getState(DB,true)});
    }

    if(action==="edit"){
      const playerId=String(data.player_id||"").trim();
      const name=String(data.name||"").trim();
      if(!playerId) return json({error:"Player not found"},400);
      if(!name) return json({error:"Player name cannot be empty"},400);

      const player=await DB.prepare("SELECT id,team_id FROM players WHERE id=?").bind(playerId).first();
      if(!player) return json({error:"Player not found"},404);

      const duplicate=await DB.prepare(
        "SELECT id FROM players WHERE team_id=? AND lower(name)=lower(?) AND id<>? LIMIT 1"
      ).bind(player.team_id,name,playerId).first();
      if(duplicate) return json({error:"That player name already exists in this team"},400);

      await DB.prepare("UPDATE players SET name=? WHERE id=?").bind(name,playerId).run();
      return json({ok:true,state:await getState(DB,true)});
    }

    return json({error:"Invalid player action"},400);
  } catch(e) {
    return json({error:e.message},500);
  }
}
