import { json, body } from "../../_utils.js";

export async function onRequestPost(context) {
  try {
    const data=await body(context.request);
    const teamId=String(data.team_id||"").trim();
    if(!teamId) return json({error:"Select your team"},400);

    const DB=context.env.DB;
    const team=await DB.prepare("SELECT id,name FROM teams WHERE id=?").bind(teamId).first();
    if(!team) return json({error:"Team not found"},404);

    const meta=await DB.prepare("SELECT value FROM meta WHERE key='draw_sequence'").first();
    let sequence=[];
    try{sequence=JSON.parse(meta?.value||"[]")}catch{}
    const assignment=sequence.find(x=>x.team_id===team.id);
    const drawLetter=assignment?.letter||"";

    const player={
      id:`team_${team.id}`,
      name:team.name,
      team_id:team.id,
      shirt_no:"",
      position:"Team"
    };

    return json({ok:true,player,team,draw_letter:drawLetter});
  } catch(e) {
    return json({error:e.message},500);
  }
}
