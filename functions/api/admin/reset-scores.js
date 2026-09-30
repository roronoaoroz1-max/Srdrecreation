import { json, isAdmin, getState } from "../../_utils.js";

export async function onRequestPost(context) {
  if (!(await isAdmin(context.request, context.env))) {
    return json({error:"Unauthorized"},401);
  }

  try {
    const DB=context.env.DB;

    const q=[
      // Clear every score/result/status but keep the draw, teams, players and schedule times.
      DB.prepare(`
        UPDATE matches
        SET home_score=NULL,
            away_score=NULL,
            home_penalties=NULL,
            away_penalties=NULL,
            winner_team_id=NULL,
            status='Scheduled'
      `),

      // Remove teams that were advanced by test results.
      DB.prepare("UPDATE matches SET home_team_id=NULL, away_team_id=NULL WHERE match_no IN ('QF1','QF2','QF3','QF4','SF1','SF2','F')")
    ];

    await DB.batch(q);

    return json({
      ok:true,
      message:"Scores cleared. Tournament restarted from M1.",
      state:await getState(DB,true)
    });
  } catch(e) {
    return json({error:e.message},500);
  }
}
