import { json, body, randomId, getConfig } from "../../_utils.js";

export async function onRequestPost(context) {
  try {
    const data = await body(context.request);
    const name = String(data.name || "").trim();
    const letter = String(data.draw_letter || "").trim().toUpperCase();

    if (!name) return json({error:"Enter your name"},400);
    if (!/^[A-N]$/.test(letter)) return json({error:"Select your team draw letter A–N"},400);

    const meta = await context.env.DB.prepare("SELECT value FROM meta WHERE key='draw_sequence'").first();
    let sequence = [];
    try { sequence = JSON.parse(meta?.value || "[]"); } catch {}

    if (!sequence.length) {
      return json({error:"The official draw has not been completed yet"},400);
    }

    const assignment = sequence.find(x => String(x.letter || "").toUpperCase() === letter);
    if (!assignment?.team_id) {
      return json({error:"That draw letter is not assigned to a team"},400);
    }

    const team = await context.env.DB.prepare("SELECT id,name FROM teams WHERE id=?").bind(assignment.team_id).first();
    if (!team) return json({error:"Team not found for this draw letter"},404);

    let player = await context.env.DB.prepare(
      "SELECT id,name,team_id,shirt_no,position FROM players WHERE lower(name)=lower(?) AND team_id=? LIMIT 1"
    ).bind(name, team.id).first();

    if (!player) {
      const cfg = await getConfig(context.env.DB);
      const count = await context.env.DB.prepare("SELECT count(*) AS n FROM players WHERE team_id=?").bind(team.id).first();
      if (Number(count?.n || 0) >= cfg.max_squad) {
        return json({error:"This team already has the maximum registered players"},400);
      }

      const id = randomId("p");
      await context.env.DB.prepare(
        "INSERT INTO players(id,name,team_id,shirt_no,position,created_at) VALUES(?,?,?,?,?,datetime('now'))"
      ).bind(id, name, team.id, String(data.shirt_no||""), String(data.position||"Player")).run();

      player = {
        id, name, team_id:team.id,
        shirt_no:String(data.shirt_no||""),
        position:String(data.position||"Player")
      };
    }

    return json({ok:true,player,team,draw_letter:letter});
  } catch(e) {
    return json({error:e.message},500);
  }
}
