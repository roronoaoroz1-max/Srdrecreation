import { json, shuffle, minutes, hhmm, getConfig, isAdmin, getState } from "../../_utils.js";

export async function onRequestPost(context) {
  if (!(await isAdmin(context.request,context.env))) return json({error:"Unauthorized"},401);

  try {
    const DB=context.env.DB;
    const teamsQ=await DB.prepare("SELECT id,name FROM teams ORDER BY sort_order").all();
    const teams=teamsQ.results||[];
    if(teams.length!==14) return json({error:"Exactly 14 teams are required"},400);

    const letters=["A","B","C","D","E","F","G","H","I","J","K","L","M","N"];
    const assignedTeams=shuffle(teams);
    const byLetter={};
    const sequence=[];

    letters.forEach((letter,i)=>{
      const team=assignedTeams[i];
      byLetter[letter]=team;
      sequence.push({
        draw_no:i+1,
        letter,
        slot: letter==="A" || letter==="H" ? "Direct Quarterfinal" : matchSlot(letter),
        team_id:team.id,
        team_name:team.name
      });
    });

    const cfg=await getConfig(DB);
    const slot=cfg.first_half+cfg.halftime+cfg.second_half+cfg.changeover;
    const start=minutes(cfg.start_time);
    const matches=[];

    const r1Pairs=[
      ["M1","B","C"],
      ["M2","D","E"],
      ["M3","F","G"],
      ["M4","I","J"],
      ["M5","K","L"],
      ["M6","M","N"]
    ];
    r1Pairs.forEach((p,i)=>{
      matches.push([
        p[0],"Round 1",byLetter[p[1]].id,byLetter[p[2]].id,
        null,null,cfg.date,hhmm(start+i*slot),"Court 1",i+1
      ]);
    });

    const q=start+6*slot;
    matches.push(["QF1","Quarterfinal",byLetter.A.id,null,"Letter A","Winner M1",cfg.date,hhmm(q),"Court 1",7]);
    matches.push(["QF2","Quarterfinal",null,null,"Winner M2","Winner M3",cfg.date,hhmm(q+slot),"Court 1",8]);
    matches.push(["QF3","Quarterfinal",byLetter.H.id,null,"Letter H","Winner M4",cfg.date,hhmm(q+2*slot),"Court 1",9]);
    matches.push(["QF4","Quarterfinal",null,null,"Winner M5","Winner M6",cfg.date,hhmm(q+3*slot),"Court 1",10]);

    const s=q+4*slot;
    matches.push(["SF1","Semifinal",null,null,"Winner QF1","Winner QF2",cfg.date,hhmm(s),"Court 1",11]);
    matches.push(["SF2","Semifinal",null,null,"Winner QF3","Winner QF4",cfg.date,hhmm(s+slot),"Court 1",12]);

    const f=s+2*slot+cfg.final_recovery;
    matches.push(["F","Final",null,null,"Winner SF1","Winner SF2",cfg.date,hhmm(f),"Court 1",13]);

    const statements=[
      DB.prepare("DELETE FROM matches"),
      DB.prepare("INSERT INTO meta(key,value) VALUES('draw_completed','1') ON CONFLICT(key) DO UPDATE SET value=excluded.value"),
      DB.prepare("INSERT INTO meta(key,value) VALUES('bye_a',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(byLetter.A.id),
      DB.prepare("INSERT INTO meta(key,value) VALUES('bye_b',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(byLetter.H.id),
      DB.prepare("INSERT INTO meta(key,value) VALUES('draw_sequence',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(sequence))
    ];

    for(const m of matches){
      statements.push(DB.prepare(`
        INSERT INTO matches(match_no,stage,home_team_id,away_team_id,source_home,source_away,match_date,start_time,court,sort_order,status)
        VALUES(?,?,?,?,?,?,?,?,?,?,'Scheduled')
      `).bind(...m));
    }

    await DB.batch(statements);
    return json({ok:true,sequence,state:await getState(DB,true)});
  } catch(e) {
    return json({error:e.message},500);
  }
}

function matchSlot(letter){
  const map={
    B:"M1 · Team 1", C:"M1 · Team 2",
    D:"M2 · Team 1", E:"M2 · Team 2",
    F:"M3 · Team 1", G:"M3 · Team 2",
    I:"M4 · Team 1", J:"M4 · Team 2",
    K:"M5 · Team 1", L:"M5 · Team 2",
    M:"M6 · Team 1", N:"M6 · Team 2"
  };
  return map[letter] || "";
}
