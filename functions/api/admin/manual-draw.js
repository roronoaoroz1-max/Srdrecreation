import { json, body, minutes, hhmm, getConfig, isAdmin, getState, ensureTournamentTeams } from "../../_utils.js";

export async function onRequestPost(context) {
  if (!(await isAdmin(context.request, context.env))) return json({error:"Unauthorized"},401);

  try {
    const data=await body(context.request);
    const order=Array.isArray(data.team_order)?data.team_order:[];
    if(order.length!==14) return json({error:"Assign a team to every letter A–N"},400);
    if(new Set(order).size!==14) return json({error:"Each team can be used only once"},400);

    const DB=context.env.DB;
    await ensureTournamentTeams(DB);
    const teamsQ=await DB.prepare("SELECT id,name FROM teams ORDER BY sort_order").all();
    const teams=teamsQ.results||[];
    if(teams.length!==16) return json({error:"Exactly 16 teams are required"},400);

    const wantedCow=teams.find(t=>t.id==="t9");
    const kudaAdi=teams.find(t=>t.id==="t15");
    if(!wantedCow||!kudaAdi) return json({error:"Fixed M8 teams are missing"},500);

    const eligible=teams.filter(t=>t.id!=="t9"&&t.id!=="t15");
    const valid=new Set(eligible.map(t=>t.id));
    if(order.some(id=>!valid.has(id))) return json({error:"Manual draw can only use the 14 A–N draw teams"},400);
    if(order.length!==eligible.length) return json({error:"Every A–N draw team must be assigned once"},400);

    const byId=Object.fromEntries(teams.map(t=>[t.id,t]));
    const letters=["A","B","C","D","E","F","G","H","I","J","K","L","M","N"];
    const byLetter={};
    const sequence=[];

    letters.forEach((letter,i)=>{
      const team=byId[order[i]];
      byLetter[letter]=team;
      sequence.push({
        draw_no:i+1,
        letter,
        slot: matchSlot(letter),
        team_id:team.id,
        team_name:team.name
      });
    });

    const cfg=await getConfig(DB);
    const slot=cfg.first_half+cfg.halftime+cfg.second_half+cfg.changeover;
    const start=minutes(cfg.start_time);
    const matches=[];

    [["M1","B","C"],["M2","D","E"],["M3","F","G"],["M4","I","J"],["M5","K","L"],["M6","M","N"],["M7","H","A"]]
      .forEach((p,i)=>matches.push([
        p[0],"Round 1",byLetter[p[1]].id,byLetter[p[2]].id,
        null,null,cfg.date,hhmm(start+i*slot),"Court 1",i+1
      ]));

    matches.push(["M8","Round 1",kudaAdi.id,wantedCow.id,null,null,cfg.date,hhmm(start+7*slot),"Court 1",8]);

    const q=start+8*slot;
    matches.push(["QF1","Quarterfinal",null,null,"Winner M1","Winner M2",cfg.date,hhmm(q),"Court 1",9]);
    matches.push(["QF2","Quarterfinal",null,null,"Winner M3","Winner M4",cfg.date,hhmm(q+slot),"Court 1",10]);
    matches.push(["QF3","Quarterfinal",null,null,"Winner M5","Winner M6",cfg.date,hhmm(q+2*slot),"Court 1",11]);
    matches.push(["QF4","Quarterfinal",null,null,"Winner M7","Winner M8",cfg.date,hhmm(q+3*slot),"Court 1",12]);

    const sf=q+4*slot;
    matches.push(["SF1","Semifinal",null,null,"Winner QF1","Winner QF2",cfg.date,hhmm(sf),"Court 1",13]);
    matches.push(["SF2","Semifinal",null,null,"Winner QF3","Winner QF4",cfg.date,hhmm(sf+slot),"Court 1",14]);

    const f=sf+2*slot+cfg.final_recovery;
    matches.push(["F","Final",null,null,"Winner SF1","Winner SF2",cfg.date,hhmm(f),"Court 1",15]);

    const statements=[
      DB.prepare("DELETE FROM matches"),
      DB.prepare("INSERT INTO meta(key,value) VALUES('draw_completed','1') ON CONFLICT(key) DO UPDATE SET value=excluded.value"),
      DB.prepare("DELETE FROM meta WHERE key IN ('bye_a','bye_b','round2_bye_source')"),
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
    A:"M7 · Team 2", B:"M1 · Team 1", C:"M1 · Team 2",
    D:"M2 · Team 1", E:"M2 · Team 2",
    F:"M3 · Team 1", G:"M3 · Team 2",
    H:"M7 · Team 1",
    I:"M4 · Team 1", J:"M4 · Team 2",
    K:"M5 · Team 1", L:"M5 · Team 2",
    M:"M6 · Team 1", N:"M6 · Team 2"
  };
  return map[letter] || "";
}
