const isProjectorMode=new URLSearchParams(window.location.search).get("projector")==="1";
document.body.classList.toggle("projector-mode",isProjectorMode);

const state={
  data:null, role:null,
  player:JSON.parse(localStorage.getItem("futsal_player")||"null"),
  adminToken:sessionStorage.getItem("futsal_admin_token")||"",
  currentPage:"home", timer:null, publicTimer:null, drawAnimating:false,
  adminDrawMode:"auto", manualDrawDraft:null
};
const $=id=>document.getElementById(id);
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const toast=m=>{const e=$("toast");e.textContent=m;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2600)};
const teamById=id=>state.data?.teams?.find(t=>t.id===id);
const initials=n=>String(n||"P").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();

async function api(path,opt={}){
  const headers={"content-type":"application/json",...(opt.headers||{})};
  if(state.adminToken) headers.authorization=`Bearer ${state.adminToken}`;
  const r=await fetch(path,{...opt,headers,cache:"no-store"});
  const raw=await r.text();
  let d; try{d=JSON.parse(raw)}catch{throw new Error(`Server returned non-JSON response (${r.status})`)}
  if(!r.ok) throw new Error(d.error||"Request failed");
  return d;
}
function renderPlayerTeamOptions(){
  const select=$("playerTeam");
  if(!select||!state.data)return;
  const current=select.value;
  const teams=[...(state.data.teams||[])].sort((a,b)=>a.name.localeCompare(b.name));

  if(!teams.length){
    select.innerHTML='<option value="">No teams available</option>';
    select.disabled=true;
    return;
  }

  select.disabled=false;
  select.innerHTML='<option value="">Select your team...</option>'+teams
    .map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`)
    .join("");
  if(teams.some(t=>t.id===current))select.value=current;
}

function teamRosterDetails(t,open=false){
  const ps=(state.data.players||[]).filter(p=>p.team_id===t.id);
  const letter=teamDrawLetter(t.id);
  return `<details class="team-roster-card" data-team-id="${esc(t.id)}" ${open?"open":""}>
    <summary>
      <span class="team-roster-title"><strong>${esc(t.name)}</strong><small>${letter!=="—"?"Letter "+esc(letter):"Team roster"}</small></span>
      <span class="badge">${ps.length} players</span>
    </summary>
    <div class="team-roster-players">${ps.length?ps.map((p,i)=>`<div class="roster-player"><span class="roster-no">${i+1}</span><span>${esc(p.name)}</span></div>`).join(""):`<div class="muted">No players listed.</div>`}</div>
  </details>`;
}

function renderPublicTeams(){
  const panel=$("publicTeamsPanel");
  if(!panel||!state.data)return;

  // Preserve expanded teams when the public data auto-refreshes.
  const openTeams=new Set(
    [...panel.querySelectorAll("details.team-roster-card[open][data-team-id]")]
      .map(d=>d.dataset.teamId)
  );

  panel.innerHTML=`<div class="section-title public-teams-head"><div><div class="eyebrow">TEAMS & PLAYERS</div><h2>Team Rosters</h2></div><span class="badge">${state.data.teams.length} teams</span></div>
    <p class="muted public-teams-help">Tap or click a team to see its players.</p>
    <div class="team-roster-grid">${state.data.teams.map(t=>teamRosterDetails(t,openTeams.has(t.id))).join("")}</div>`;
}
async function refresh(){
  state.data=await api(state.role==="admin"?"/api/admin/state":"/api/state");
  renderPlayerTeamOptions();
  renderPublicTeams();
  if(state.role){
    // Keep Admin forms stable during the 3.5-second background refresh.
    renderAll({skipAdmin: state.role==="admin" && state.currentPage==="admin"});
  }
  renderPublicBoard();
}
async function refreshPublicOnly(){
  try{state.data=await api("/api/state");renderPlayerTeamOptions();renderPublicTeams();renderPublicBoard()}
  catch(e){if($("publicBoardBody"))$("publicBoardBody").innerHTML=`<div class="notice">Live board unavailable: ${esc(e.message)}</div>`}
}

document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));
  $("playerLogin").classList.toggle("hidden",b.dataset.tab!=="player");
  $("adminLogin").classList.toggle("hidden",b.dataset.tab!=="admin");
}));
$("playerLogin").addEventListener("submit",async e=>{
  e.preventDefault();
  try{
    const out=await api("/api/player/login",{method:"POST",body:JSON.stringify({
      team_id:$("playerTeam").value
    })});
    state.role="player";state.player={...out.player,draw_letter:out.draw_letter};
    localStorage.setItem("futsal_player",JSON.stringify(state.player));await enterApp();
  }catch(e){toast(e.message)}
});
$("adminLogin").addEventListener("submit",async e=>{
  e.preventDefault();
  try{
    const out=await api("/api/admin/login",{method:"POST",body:JSON.stringify({
      username:$("adminUsername").value,password:$("adminPassword").value
    })});
    state.adminToken=out.token;sessionStorage.setItem("futsal_admin_token",out.token);
    state.role="admin";await enterApp();
  }catch(e){toast(e.message)}
});
$("logoutBtn").addEventListener("click",()=>{
  clearInterval(state.timer);state.role=null;state.player=null;state.adminToken="";
  localStorage.removeItem("futsal_player");sessionStorage.removeItem("futsal_admin_token");
  $("appView").classList.add("hidden");$("loginView").classList.remove("hidden");setPublicLogin(false);refreshPublicOnly();
});
$("publicRefreshBtn")?.addEventListener("click",refreshPublicOnly);
function setPublicLogin(open){
  const card=$("loginCard");
  const show=$("showLoginBtn");
  if(!card||!show)return;
  if(isProjectorMode)open=false;
  card.classList.toggle("hidden",!open);
  show.setAttribute("aria-expanded",open?"true":"false");
  show.textContent=open?"Login open":"Open login";
  if(open) card.scrollIntoView({behavior:"smooth",block:"start"});
}
$("showLoginBtn")?.addEventListener("click",()=>setPublicLogin($("loginCard")?.classList.contains("hidden")));
$("hideLoginBtn")?.addEventListener("click",()=>setPublicLogin(false));
const projectorLink=$("projectorViewLink");
if(projectorLink){
  if(isProjectorMode){
    projectorLink.textContent="Exit projector view";
    projectorLink.href=window.location.pathname;
  }else{
    projectorLink.href=window.location.pathname+"?projector=1";
  }
}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));

async function enterApp(){
  await refresh();$("loginView").classList.add("hidden");$("appView").classList.remove("hidden");
  $("adminNav").classList.toggle("hidden",state.role!=="admin");
  $("userBadge").textContent=state.role==="admin"?"Tournament Admin":`Team: ${teamById(state.player?.team_id)?.name||state.player?.name||""}`;
  showPage("home");clearInterval(state.timer);
  state.timer=setInterval(()=>{
    if(state.drawAnimating) return;
    if(state.role==="admin" && state.currentPage==="admin") return;
    refresh().catch(()=>{});
  },3500);
}
function showPage(n){
  state.currentPage=n;document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===n));
  $(`${n}Page`).classList.remove("hidden");$("pageTitle").textContent=n[0].toUpperCase()+n.slice(1);renderAll();
}
window.showPage=showPage;

function pair(m){return{h:teamById(m.home_team_id)?.name||m.source_home||"TBD",a:teamById(m.away_team_id)?.name||m.source_away||"TBD"}}
function fixture(m){
  const{h,a}=pair(m);let c=m.start_time||"TBD";
  if(m.status==="Live")c=`<span class="badge live">LIVE</span><div>${m.home_score??0} - ${m.away_score??0}</div>`;
  else if(["Finished","Walkover"].includes(m.status)){c=`${m.home_score}-${m.away_score}`;if(m.home_penalties!=null)c+=`<div class="muted" style="font-size:11px">pens ${m.home_penalties}-${m.away_penalties}</div>`}
  return `<div class="fixture"><div><div class="kicker">${esc(m.match_no)} · ${esc(m.stage)}</div><strong>${esc(h)}</strong></div><div class="score">${c}</div><div class="right"><div class="kicker">${esc(m.court)}</div><strong>${esc(a)}</strong></div></div>`;
}
function statusBadge(m){
  if(m.status==="Live")return `<span class="public-status live">● LIVE</span>`;
  if(m.status==="Finished")return `<span class="public-status">FINAL</span>`;
  if(m.status==="Walkover")return `<span class="public-status">W/O</span>`;
  return `<span class="public-status">${esc(m.start_time||"Scheduled")}</span>`;
}
function matchEvents(no){
  return (state.data?.events||[]).filter(e=>e.match_no===no);
}
function eventPlayerName(e){
  return state.data?.players?.find(p=>p.id===e.player_id)?.name||"";
}
function eventTeamName(e){
  return teamById(e.team_id)?.name||"";
}
function eventTime(e){
  const m=Number(e.minute||0),s=Number(e.second||0);
  return `${m}:${String(s).padStart(2,"0")}`;
}
function eventLabel(e){
  const p=eventPlayerName(e);
  if(e.event_type==="goal")return `⚽ Goal${p?" · "+p:""}`;
  if(e.event_type==="penalty_goal")return `⚽ Penalty goal${p?" · "+p:""}`;
  if(e.event_type==="penalty_miss")return `✕ Penalty missed${p?" · "+p:""}`;
  if(e.event_type==="foul")return `⚠ Foul${p?" · "+p:""}`;
  if(e.event_type==="yellow_card")return `🟨 Yellow card${p?" · "+p:""}`;
  if(e.event_type==="red_card")return `🟥 Red card${p?" · "+p:""}`;
  return e.event_type;
}
function matchFoulCount(no,teamId){
  return matchEvents(no).filter(e=>e.event_type==="foul"&&e.team_id===teamId).length;
}
function playerOptionsForTeam(teamId){
  const ps=(state.data.players||[]).filter(p=>p.team_id===teamId);
  return `<option value="">Select player...</option>`+ps.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("");
}

function topScorers(){
  const counts=new Map();
  for(const e of (state.data?.events||[])){
    if(e.event_type!=="goal"||!e.player_id)continue;
    counts.set(e.player_id,(counts.get(e.player_id)||0)+1);
  }
  return [...counts.entries()].map(([player_id,goals])=>{
    const p=(state.data?.players||[]).find(x=>x.id===player_id);
    return {
      player_id,
      name:p?.name||"Unknown player",
      team_id:p?.team_id||"",
      team_name:teamById(p?.team_id)?.name||"",
      goals
    };
  }).sort((a,b)=>b.goals-a.goals||a.name.localeCompare(b.name));
}
function scorerRows(limit=5){
  const rows=topScorers().slice(0,limit);
  if(!rows.length)return `<p class="muted">No goals recorded yet.</p>`;
  let lastGoals=null,rank=0,shown=0;
  return rows.map(s=>{
    shown++;
    if(s.goals!==lastGoals){rank=shown;lastGoals=s.goals;}
    return `<div class="scorer-row ${rank===1?"leader":""}">
      <span class="scorer-rank">${rank}</span>
      <div class="scorer-player"><strong>${esc(s.name)}</strong><small>${esc(s.team_name)}</small></div>
      <b class="scorer-goals">${s.goals}</b>
    </div>`;
  }).join("");
}
function renderPublicBoard(){
  const body=$("publicBoardBody");if(!body||!state.data)return;
  const ms=state.data.matches||[];
  const live=ms.find(m=>m.status==="Live");
  const upcoming=ms.filter(m=>m.status==="Scheduled"&&m.home_team_id&&m.away_team_id);
  const finished=ms.filter(m=>["Finished","Walkover"].includes(m.status)).slice(-4).reverse();
  const current=live||upcoming[0]||finished[0]||null;

  const info=`<div class="public-match public-info-panel">
    <div class="kicker">TOURNAMENT INFO</div>
    <div class="public-small-list">
      <div class="public-small-item"><span>Venue</span><strong>${esc(state.data.config.venue)}</strong></div>
      <div class="public-small-item"><span>Date</span><strong>${esc(state.data.config.date)}</strong></div>
      <div class="public-small-item"><span>Start</span><strong>${esc(state.data.config.start_time)}</strong></div>
      <div class="public-small-item"><span>Teams</span><strong>16</strong></div>
      <div class="public-small-item"><span>Draw</span><strong>${state.data.draw.completed?"Completed":"Pending"}</strong></div>
    </div>
  </div>`;

  let feature;
  if(current){
    const{h,a}=pair(current);
    const score=current.status==="Scheduled"
      ? `<span class="next-kickoff">${esc(current.start_time)}</span>`
      : `${current.home_score??0} - ${current.away_score??0}`;
    const title=current.status==="Live"?"LIVE NOW":current.status==="Scheduled"?"NEXT MATCH":"LATEST RESULT";
    feature=`<div class="public-match public-feature-match">
      <div class="section-title">
        <div><div class="kicker">${esc(current.match_no)} · ${esc(current.stage)}</div><h3>${title}</h3></div>
        ${statusBadge(current)}
      </div>
      <div class="public-scoreline public-scoreline-feature">
        <div class="team"><strong>${esc(h)}</strong></div>
        <div class="public-score">${score}</div>
        <div class="team"><strong>${esc(a)}</strong></div>
      </div>
      <div class="public-feature-meta">${esc(current.match_date||"")} · ${esc(current.court||"Court 1")}${current.status==="Scheduled"?` · Kickoff ${esc(current.start_time)}`:""}</div>
      ${matchEvents(current.match_no).length?`<div class="public-event-strip">
        ${matchEvents(current.match_no).slice(-6).reverse().map(e=>`<div class="public-event-item"><b>${eventTime(e)}</b><span>${esc(eventTeamName(e))}</span><strong>${esc(eventLabel(e))}</strong>${e.detail?`<small>${esc(e.detail)}</small>`:""}</div>`).join("")}
      </div>`:""}
    </div>`;
  }else{
    feature=`<div class="public-match public-feature-match"><div class="kicker">NEXT MATCH</div><h3>Tournament draw pending</h3><div class="notice">Match information will appear here as soon as the draw is applied.</div></div>`;
  }

  body.innerHTML=`${feature}
    <div class="public-details-grid">
      ${info}
      <div class="public-match"><div class="section-title"><h3>Upcoming</h3><span class="badge">${upcoming.length}</span></div>${upcoming.slice(live?0:1,live?4:5).map(fixture).join("")||`<p class="muted">No other upcoming matches assigned.</p>`}</div>
      <div class="public-match"><div class="section-title"><h3>Recent results</h3><span class="badge">${finished.length}</span></div>${finished.length?finished.map(fixture).join(""):`<p class="muted">No results yet.</p>`}</div>
      <div class="public-match public-scorer-card"><div class="section-title"><div><div class="kicker">GOLDEN BOOT</div><h3>Top Scorers</h3></div><span class="badge">Goals</span></div>${scorerRows(5)}</div>
    </div>`;
}
const myTeam=()=>state.role==="player"?state.player?.team_id:null;
const myMatches=()=>{const t=myTeam();return t?state.data.matches.filter(m=>m.home_team_id===t||m.away_team_id===t):[]};
const nextMatch=()=>myMatches().find(m=>!["Finished","Walkover"].includes(m.status));
const teamDrawLetter=teamId=>state.data?.draw?.sequence?.find(x=>x.team_id===teamId)?.letter||"—";
function shiftClock(time,delta){
  if(!/^\d{2}:\d{2}$/.test(String(time||"")))return "—";
  const [h,m]=time.split(":").map(Number);let n=h*60+m+Number(delta||0);n=((n%1440)+1440)%1440;
  return `${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;
}
const arrivalMinutes=()=>Number(state.data?.config?.arrival_minutes??5);
const arrivalTime=m=>m?.start_time?shiftClock(m.start_time,-arrivalMinutes()):"—";
function arrivalNote(m){
  if(!m||["Finished","Walkover"].includes(m.status))return "";
  return `<div class="arrival-note"><b>Be at the stadium by ${esc(arrivalTime(m))}</b><span>${arrivalMinutes()} min before the ${esc(m.start_time)} match start.</span></div>`;
}

function renderHome(){
  const c=state.data.config,n=nextMatch(),t=teamById(myTeam()),arr=n?arrivalTime(n):"—";
  $("homePage").innerHTML=`<div class="grid">
    <div class="card span-3"><div class="muted">Tournament</div><div class="stat">16 Teams</div><div class="kicker">15-match knockout</div></div>
    <div class="card span-3"><div class="muted">Draw</div><div class="stat">${state.data.draw.completed?"Completed":"Pending"}</div><div class="kicker">Letters A–P</div></div>
    <div class="card span-3"><div class="muted">${state.role==="player"?"My draw letter":"Venue"}</div><div class="stat">${state.role==="player"?esc(teamDrawLetter(myTeam())):esc(c.venue)}</div><div class="kicker">${state.role==="player"?esc(t?.name||""):"Tournament venue"}</div></div>
    <div class="card span-3"><div class="muted">${state.role==="player"?"Be at stadium by":"Start"}</div><div class="stat">${state.role==="player"?esc(arr):esc(c.start_time)}</div><div class="kicker">${state.role==="player"?(n?`${esc(n.match_no)} starts ${esc(n.start_time)}`:"No match yet"):esc(c.date)}</div></div>
    <div class="card span-8"><div class="section-title"><h3>${state.role==="player"?"Your tournament":"Tournament status"}</h3><button class="secondary" onclick="showPage('bracket')">Open bracket</button></div>${state.role==="player"?(n?`${arrivalNote(n)}${fixture(n)}`:`<div class="notice">${state.data.draw.completed?"No upcoming match assigned.":"The official draw has not started yet."}</div>`):`<div class="notice"><strong>${state.data.draw.completed?"Draw completed.":"Ready for the official draw."}</strong><br>${state.data.draw.completed?"Use Live Match Control in Admin to publish scores instantly.":"Open Admin and start the draw."}</div>`}</div>
    <div class="card span-4"><h3>Match format</h3><div class="row"><span>First half</span><b>${c.first_half} min</b></div><div class="row"><span>Halftime</span><b>${c.halftime} min</b></div><div class="row"><span>Second half</span><b>${c.second_half} min</b></div><div class="row"><span>Changeover</span><b>${c.changeover} min</b></div>${state.role==="player"?`<div class="row"><span>Arrive before kickoff</span><b>${arrivalMinutes()} min</b></div>`:""}</div>
    <div class="card span-4"><div class="section-title"><div><div class="kicker">GOLDEN BOOT</div><h3>Top scorers</h3></div><span class="badge">Goals</span></div>${scorerRows(5)}</div>
    <div class="card span-8"><div class="section-title"><h3>Latest notices</h3><button class="secondary" onclick="showPage('notices')">All notices</button></div>${state.data.announcements.slice(0,3).map(a=>`<div class="row"><div><strong>${esc(a.title)}</strong><div class="muted">${esc(a.body)}</div></div></div>`).join("")||`<p class="muted">No announcements yet.</p>`}</div>
  </div>`;
}
function renderDraw(){
  const d=state.data.draw;$("drawPage").innerHTML=`<div class="card"><div class="section-title"><div><div class="kicker">OFFICIAL LETTER DRAW</div><h3>Draw results A–P</h3></div><span class="badge ${d.completed?"ok":""}">${d.completed?"Completed":"Waiting"}</span></div>${!d.completed?`<div class="notice">The organizer has not run the draw yet. Player login by letter becomes available after the draw.</div>`:`<div class="draw-history">${d.sequence.map(x=>`<div class="draw-item"><span class="kicker">LETTER ${esc(x.letter)} · ${esc(x.slot)}</span><strong>${esc(x.team_name)}</strong></div>`).join("")}</div>`}</div>`;
}
function bracketCard(m){
  if(!m)return `<div class="match-card"><div class="match-meta"><span>TBD</span><span>Pending</span></div><div class="match-team"><span>TBD</span><b>—</b></div><div class="match-team"><span>TBD</span><b>—</b></div></div>`;
  const{h,a}=pair(m),hw=m.winner_team_id===m.home_team_id,aw=m.winner_team_id===m.away_team_id;
  return `<div class="match-card"><div class="match-meta"><span>${esc(m.match_no)}</span><span>${m.status==="Live"?"● LIVE":esc(m.start_time)}</span></div><div class="match-team ${hw?"winner":""}"><span>${esc(h)}</span><b>${m.home_score??"—"}</b></div><div class="match-team ${aw?"winner":""}"><span>${esc(a)}</span><b>${m.away_score??"—"}</b></div></div>`;
}
function renderBracket(){
  const s=x=>state.data.matches.filter(m=>m.stage===x),r=s("Round 1"),q=s("Quarterfinal"),sf=s("Semifinal"),f=s("Final");
  $("bracketPage").innerHTML=`<div class="card bracket-card"><div class="section-title"><h3>Knockout bracket</h3><span class="badge">${state.data.draw.completed?"Live":"Awaiting draw"}</span></div><div class="bracket-wrap"><div class="bracket">
    <div class="bracket-column"><div class="round-title">Round 1</div><div class="round r1">${Array.from({length:8},(_,i)=>bracketCard(r[i])).join("")}</div></div>
    <div class="bracket-column"><div class="round-title">Quarterfinals</div><div class="round qf">${Array.from({length:4},(_,i)=>bracketCard(q[i])).join("")}</div></div>
    <div class="bracket-column"><div class="round-title">Semifinals</div><div class="round sf">${Array.from({length:2},(_,i)=>bracketCard(sf[i])).join("")}</div></div>
    <div class="bracket-column"><div class="round-title">Final</div><div class="round final">${bracketCard(f[0])}</div></div>
  </div></div></div>`;
}
function renderMatches(){
  const stages=["Round 1","Quarterfinal","Semifinal","Final"];
  $("matchesPage").innerHTML=state.data.matches.length?stages.map(s=>{const ms=state.data.matches.filter(m=>m.stage===s);return `<div class="card"><div class="section-title"><h3>${s}</h3><span class="badge">${ms.length}</span></div>${ms.map(fixture).join("")}</div>`}).join(""):`<div class="card"><div class="notice">Matches will appear after the draw.</div></div>`;
}
function renderTeam(){
  if(state.role!=="player"){
    $("teamPage").innerHTML=`<div class="card"><div class="section-title"><div><div class="kicker">TEAM ROSTERS</div><h3>Teams & players</h3></div><span class="badge">${state.data.teams.length} teams</span></div><p class="muted">Tap or click a team to show its players.</p><div class="team-roster-grid">${state.data.teams.map(t=>teamRosterDetails(t)).join("")}</div></div>`;return;
  }

  const t=teamById(state.player.team_id);
  $("teamPage").innerHTML=`<div class="grid">
    <div class="card span-5"><div class="kicker">MY TEAM · LETTER ${esc(teamDrawLetter(state.player.team_id))}</div><h3>${esc(t?.name||"Team")}</h3>${t?teamRosterDetails(t,true):""}</div>
    <div class="card span-7"><h3>Team matches</h3>${myMatches().length?myMatches().map(m=>`<div class="player-match-block">${arrivalNote(m)}${fixture(m)}</div>`).join(""):`<p class="muted">Matches appear after the draw.</p>`}</div>
  </div>`;
}
function renderGuide(){
  const c=state.data.config,rows=[
    ["A","M7 Team 2"],["B","M1 Team 1"],["C","M1 Team 2"],
    ["D","M2 Team 1"],["E","M2 Team 2"],["F","M3 Team 1"],["G","M3 Team 2"],
    ["H","M7 Team 1"],["I","M4 Team 1"],["J","M4 Team 2"],
    ["K","M5 Team 1"],["L","M5 Team 2"],["M","M6 Team 1"],["N","M6 Team 2"],
    ["O","M8 Team 1"],["P","M8 Team 2"]
  ];
  $("guidePage").innerHTML=`<div class="card"><div class="kicker">ONE-PAGE TOURNAMENT GUIDE</div><h3>How the tournament works</h3><p class="muted">16 teams play single elimination using draw letters A–P. M8 uses letters O and P.</p><div class="notice"><b>M1:</b> B vs C · <b>M2:</b> D vs E · <b>M3:</b> F vs G · <b>M4:</b> I vs J<br><b>M5:</b> K vs L · <b>M6:</b> M vs N · <b>M7:</b> H vs A · <b>M8:</b> O vs P<br><br><b>QF1:</b> Winner M1 vs Winner M2<br><b>QF2:</b> Winner M3 vs Winner M4<br><b>QF3:</b> Winner M5 vs Winner M6<br><b>QF4:</b> Winner M7 vs Winner M8<br><br><b>SF1:</b> Winner QF1 vs Winner QF2<br><b>SF2:</b> Winner QF3 vs Winner QF4<br>Then Final.</div></div>
  <div class="card"><div class="section-title"><h3>Letter positions</h3><span class="badge">A–P</span></div><div class="table-wrap"><table><thead><tr><th>Letter</th><th>Position</th></tr></thead><tbody>${rows.map(([a,b])=>`<tr><td><b>${a}</b></td><td>${b}</td></tr>`).join("")}<tr><td><b>KDA</b></td><td>M8 · Kuda Adi</td></tr><tr><td><b>WTC</b></td><td>M8 · Wanted Cow</td></tr></tbody></table></div></div>
  <div class="card"><h3>Timing & login</h3><div class="rule-grid"><div class="rule"><strong>${c.first_half}+${c.halftime}+${c.second_half} min</strong><span class="muted">First half + halftime + second half</span></div><div class="rule"><strong>${c.changeover} min</strong><span class="muted">Changeover</span></div><div class="rule"><strong>Arrive ${c.arrival_minutes??5} min early</strong><span class="muted">Players see a “be at stadium by” time for every upcoming team match.</span></div><div class="rule"><strong>Public live board</strong><span class="muted">Scores can be viewed before login.</span></div><div class="rule"><strong>Player login</strong><span class="muted">Players use their assigned draw letter A–P.</span></div></div></div>`;
}
function renderRules(){
  const c=state.data.config,r=[["Players",`3 on court. Maximum squad ${c.max_squad}.`],["Match time",`${c.first_half} min first half, ${c.halftime} min halftime, ${c.second_half} min second half.`],["Substitutions","Unlimited rolling substitutions."],["Offside","No offside."],["Restart","Kick-ins instead of throw-ins."],["Sliding tackles","Not allowed."],["Drawn match","No extra time. 3 penalties each, then sudden death."],["Late team",`${c.grace_minutes}-minute grace period, then organizer may award a 3-0 walkover.`],["Cards","Second yellow = red. Serious misconduct may lead to removal."],["Referee","Referee decisions during play are final."]];
  $("rulesPage").innerHTML=`<div class="card"><h3>Tournament rules</h3><div class="rule-grid">${r.map(([a,b])=>`<div class="rule"><strong>${a}</strong><span class="muted">${b}</span></div>`).join("")}</div></div>`;
}
function renderNotices(){
  $("noticesPage").innerHTML=`<div class="card"><div class="section-title"><h3>Announcements</h3><span class="badge">${state.data.announcements.length}</span></div>${state.data.announcements.map(a=>`<div class="row"><div><strong>${esc(a.title)}</strong><div class="muted">${esc(a.body)}</div><div class="kicker">${esc(a.created_at)}</div></div></div>`).join("")||`<p class="muted">No announcements yet.</p>`}</div>`;
}

async function startDraw(){
  if(state.data.draw.completed&&!confirm("Run a completely new automatic draw? Existing match results will be replaced."))return;
  try{
    const out=await api("/api/admin/draw",{method:"POST",body:"{}"});state.data=out.state;state.drawAnimating=true;
    const o=$("drawOverlay"),roll=$("rollingName"),rev=$("revealedName"),slot=$("drawSlotLabel"),count=$("drawCounter"),bar=$("drawProgressBar");
    o.classList.remove("hidden");const names=state.data.teams.map(t=>t.name);
    for(let i=0;i<out.sequence.length;i++){
      const item=out.sequence[i];slot.textContent=`LETTER ${item.letter} · ${item.slot}`;rev.textContent="";
      const r=setInterval(()=>roll.textContent=names[Math.floor(Math.random()*names.length)],80);
      await new Promise(x=>setTimeout(x,750));clearInterval(r);roll.textContent="DRAWN";rev.textContent=item.team_name;
      rev.classList.remove("pop");void rev.offsetWidth;rev.classList.add("pop");count.textContent=`${i+1} / ${out.sequence.length}`;bar.style.width=`${((i+1)/out.sequence.length)*100}%`;
      await new Promise(x=>setTimeout(x,820));
    }
    slot.textContent="DRAW COMPLETE";roll.textContent="Bracket generated";await new Promise(x=>setTimeout(x,900));o.classList.add("hidden");state.drawAnimating=false;renderAll();showPage("draw");
  }catch(e){state.drawAnimating=false;$("drawOverlay").classList.add("hidden");toast(e.message)}
}
async function enterResult(no){
  const m=state.data.matches.find(x=>x.match_no===no);if(!m?.home_team_id||!m?.away_team_id)return toast("Both teams must be known first.");
  const{h,a}=pair(m),hs=prompt(`${h} FINAL score:`,m.home_score??0);if(hs===null)return;
  const as=prompt(`${a} FINAL score:`,m.away_score??0);if(as===null)return;
  let hp=null,ap=null;if(Number(hs)===Number(as)){hp=prompt(`${h} penalties:`);if(hp===null)return;ap=prompt(`${a} penalties:`);if(ap===null)return}
  try{const out=await api("/api/admin/result",{method:"POST",body:JSON.stringify({match_no:no,home_score:Number(hs),away_score:Number(as),home_penalties:hp===null?null:Number(hp),away_penalties:ap===null?null:Number(ap)})});state.data=out.state;renderAll();renderPublicBoard();toast("Final result saved. Winner advanced.")}catch(e){toast(e.message)}
}
window.enterResult=enterResult;

function manualDrawSlots(){
  return [
    {letter:"A",label:"M7 Team 2"},{letter:"B",label:"M1 Team 1"},{letter:"C",label:"M1 Team 2"},
    {letter:"D",label:"M2 Team 1"},{letter:"E",label:"M2 Team 2"},
    {letter:"F",label:"M3 Team 1"},{letter:"G",label:"M3 Team 2"},
    {letter:"H",label:"M7 Team 1"},
    {letter:"I",label:"M4 Team 1"},{letter:"J",label:"M4 Team 2"},
    {letter:"K",label:"M5 Team 1"},{letter:"L",label:"M5 Team 2"},
    {letter:"M",label:"M6 Team 1"},{letter:"N",label:"M6 Team 2"},
    {letter:"O",label:"M8 Team 1"},{letter:"P",label:"M8 Team 2"}
  ];
}
const presetManualDrawByLetter={
  A:"Boot Hoist",
  B:"Gina Vaahaka",
  C:"Team Inventory",
  D:"Everest",
  E:"Bangladesh Tiger",
  F:"Emme Baaru",
  G:"Short Circuit FC",
  H:"Precast SC",
  I:"150 Bar",
  J:"Vihssaagendhaa Current",
  K:"Team RMD Lions",
  L:"Thala Thalapathi",
  M:"Team Korakali",
  N:"Jehee Jehee",
  O:"Wanted Cow",
  P:"Kuda Adi"
};
function currentTeamForLetter(letter){
  const existing=state.data.draw?.sequence?.find(x=>x.letter===letter)?.team_id;
  if(existing)return existing;
  const wantedName=presetManualDrawByLetter[letter];
  return state.data.teams.find(t=>t.name===wantedName)?.id||"";
}
function teamOptions(selected=""){return `<option value="">Select team...</option>`+state.data.teams.map(t=>`<option value="${esc(t.id)}" ${selected===t.id?"selected":""}>${esc(t.name)}</option>`).join("")}
function setAdminDrawMode(mode){
  state.adminDrawMode=mode;
  if(mode==="manual" && !state.manualDrawDraft){
    state.manualDrawDraft=Object.fromEntries(manualDrawSlots().map(x=>[x.letter,currentTeamForLetter(x.letter)]));
  }
  $("autoDrawSection")?.classList.toggle("hidden",mode!=="auto");
  $("manualDrawSection")?.classList.toggle("hidden",mode!=="manual");
  document.querySelectorAll("[data-draw-mode]").forEach(b=>b.classList.toggle("active",b.dataset.drawMode===mode));
}
window.setAdminDrawMode=setAdminDrawMode;

async function submitManualDraw(){
  const selects=[...document.querySelectorAll("[data-manual-slot]")];
  const order=selects.map(x=>x.value);
  if(order.some(v=>!v))return toast("Assign a team to every letter A–P.");
  if(new Set(order).size!==16)return toast("Each team must appear exactly once.");
  state.manualDrawDraft=Object.fromEntries(selects.map(x=>[x.dataset.manualSlot,x.value]));
  if(state.data.draw.completed&&!confirm("Replace the existing draw and clear all current match results with this manual draw?"))return;
  try{
    const out=await api("/api/admin/manual-draw",{method:"POST",body:JSON.stringify({team_order:order})});
    state.data=out.state;state.manualDrawDraft=null;state.adminDrawMode="manual";
    renderAll();renderPublicBoard();showPage("admin");setAdminDrawMode("manual");
    toast("Manual draw applied. Bracket regenerated.");
  }catch(e){toast(e.message)}
}
window.submitManualDraw=submitManualDraw;

async function saveTeams(){
  const teams=[...document.querySelectorAll("[data-team-editor-row]")].map(row=>({
    id:row.dataset.teamId,name:row.querySelector("[data-team-name]").value.trim(),code:row.querySelector("[data-team-code]").value.trim().toUpperCase()
  }));
  if(teams.some(t=>!t.name||!t.code))return toast("Every team needs a name and internal code.");
  if(new Set(teams.map(t=>t.name.toLowerCase())).size!==16)return toast("Team names must be unique.");
  if(new Set(teams.map(t=>t.code)).size!==16)return toast("Internal codes must be unique.");
  try{const out=await api("/api/admin/teams",{method:"POST",body:JSON.stringify({teams})});state.data=out.state;renderAll();toast("Team list saved.")}
  catch(e){toast(e.message)}
}
window.saveTeams=saveTeams;

async function editAdminPlayer(playerId){
  const input=document.querySelector(`[data-admin-player-name="${CSS.escape(playerId)}"]`);
  const name=input?.value.trim();
  if(!name)return toast("Player name cannot be empty.");
  try{
    const out=await api("/api/admin/players",{method:"POST",body:JSON.stringify({action:"edit",player_id:playerId,name})});
    state.data=out.state;
    renderAdmin();renderPublicTeams();
    setTimeout(()=>scrollAdminSection("adminPlayersSection"),0);
    toast("Player name updated.");
  }catch(e){toast(e.message)}
}
window.editAdminPlayer=editAdminPlayer;

async function addAdminPlayer(teamId){
  const input=document.querySelector(`[data-admin-new-player="${CSS.escape(teamId)}"]`);
  const name=input?.value.trim();
  if(!name)return toast("Enter the new player name.");
  try{
    const out=await api("/api/admin/players",{method:"POST",body:JSON.stringify({action:"add",team_id:teamId,name})});
    state.data=out.state;
    renderAdmin();renderPublicTeams();
    setTimeout(()=>scrollAdminSection("adminPlayersSection"),0);
    toast("Player added.");
  }catch(e){toast(e.message)}
}
window.addAdminPlayer=addAdminPlayer;

async function saveSettings(e){
  e.preventDefault();
  const payload={
    tournament_name:$("setName").value.trim(),venue:$("setVenue").value.trim(),date:$("setDate").value,
    start_time:$("setStart").value,first_half:Number($("setFirstHalf").value),halftime:Number($("setHalftime").value),
    second_half:Number($("setSecondHalf").value),changeover:Number($("setChangeover").value),
    final_recovery:Number($("setFinalRecovery").value),max_squad:Number($("setMaxSquad").value),
    grace_minutes:Number($("setGrace").value),arrival_minutes:Number($("setArrival").value),rebuild_schedule:$("setRebuild").checked
  };
  try{const out=await api("/api/admin/settings",{method:"POST",body:JSON.stringify(payload)});state.data=out.state;renderAll();renderPublicBoard();toast("Tournament settings saved.")}
  catch(e){toast(e.message)}
}
const officialTimerKey=no=>`piston_official_timer_${no}`;
let officialTimerTicker=null;

function readOfficialTimer(no){
  try{
    const raw=JSON.parse(localStorage.getItem(officialTimerKey(no))||"null");
    return raw&&typeof raw==="object"?raw:{elapsedMs:0,running:false,startedAt:0};
  }catch{
    return {elapsedMs:0,running:false,startedAt:0};
  }
}
function writeOfficialTimer(no,t){
  localStorage.setItem(officialTimerKey(no),JSON.stringify(t));
}
function officialElapsedMs(no){
  const t=readOfficialTimer(no);
  return Math.max(0,Number(t.elapsedMs||0)+(t.running?Date.now()-Number(t.startedAt||Date.now()):0));
}
function officialTimerParts(no){
  const total=Math.floor(officialElapsedMs(no)/1000);
  return {minute:Math.floor(total/60),second:total%60,total};
}
function formatOfficialTimer(no){
  const p=officialTimerParts(no);
  return `${String(p.minute).padStart(2,"0")}:${String(p.second).padStart(2,"0")}`;
}
function syncOfficialTimerDom(no){
  const display=$(`officialTimer_${no}`);
  if(display)display.textContent=formatOfficialTimer(no);
  const t=readOfficialTimer(no);
  if(t.running){
    const p=officialTimerParts(no);
    const min=$(`officialMin_${no}`),sec=$(`officialSec_${no}`);
    if(min)min.value=p.minute;
    if(sec)sec.value=p.second;
  }
  const btn=$(`officialTimerStart_${no}`);
  if(btn)btn.textContent=t.running?"Running…":"▶ Start";
}
function ensureOfficialTimerTicker(){
  if(officialTimerTicker)return;
  officialTimerTicker=setInterval(()=>{
    document.querySelectorAll("[data-official-timer]").forEach(el=>syncOfficialTimerDom(el.dataset.officialTimer));
  },500);
}
function startOfficialTimer(no){
  const t=readOfficialTimer(no);
  if(!t.running){
    t.running=true;t.startedAt=Date.now();writeOfficialTimer(no,t);
  }
  ensureOfficialTimerTicker();syncOfficialTimerDom(no);
}
window.startOfficialTimer=startOfficialTimer;

function pauseOfficialTimer(no){
  const t=readOfficialTimer(no);
  if(t.running){
    t.elapsedMs=Math.max(0,Number(t.elapsedMs||0)+(Date.now()-Number(t.startedAt||Date.now())));
    t.running=false;t.startedAt=0;writeOfficialTimer(no,t);
  }
  syncOfficialTimerDom(no);
}
window.pauseOfficialTimer=pauseOfficialTimer;

function resetOfficialTimer(no){
  if(!confirm("Reset this match stopwatch to 00:00?"))return;
  writeOfficialTimer(no,{elapsedMs:0,running:false,startedAt:0});
  const min=$(`officialMin_${no}`),sec=$(`officialSec_${no}`);
  if(min)min.value=0;if(sec)sec.value=0;
  syncOfficialTimerDom(no);
}
window.resetOfficialTimer=resetOfficialTimer;

function useOfficialTimerTime(no){
  const p=officialTimerParts(no);
  const min=$(`officialMin_${no}`),sec=$(`officialSec_${no}`);
  if(min)min.value=p.minute;if(sec)sec.value=p.second;
  toast(`Event time set to ${p.minute}:${String(p.second).padStart(2,"0")}.`);
}
window.useOfficialTimerTime=useOfficialTimerTime;

function clearAllOfficialTimers(){
  (state.data?.matches||[]).forEach(m=>localStorage.removeItem(officialTimerKey(m.match_no)));
}

async function addMatchEvent(matchNo,eventType,teamId,side){
  const minute=Number($(`officialMin_${matchNo}`)?.value||0);
  const second=Number($(`officialSec_${matchNo}`)?.value||0);
  const playerId=$(side==="home"?`officialHomePlayer_${matchNo}`:`officialAwayPlayer_${matchNo}`)?.value||"";

  if(["goal","penalty_goal"].includes(eventType)&&!playerId){
    return toast("Select the player who scored.");
  }

  try{
    const out=await api("/api/admin/match-events",{method:"POST",body:JSON.stringify({
      action:"add",match_no:matchNo,event_type:eventType,team_id:teamId,player_id:playerId,minute,second
    })});
    state.data=out.state;
    renderAdmin();renderPublicBoard();
    setTimeout(()=>scrollAdminSection("adminOfficialSection"),0);
    if(out.penalty_awarded)toast("5th team foul reached — penalty awarded.");
    else toast(eventType==="goal"||eventType==="penalty_goal"?"Goal recorded and score updated.":"Match event recorded.");
  }catch(e){toast(e.message)}
}
window.addMatchEvent=addMatchEvent;

async function undoMatchEvent(matchNo){
  if(!confirm("Undo the latest recorded event for this match?"))return;
  try{
    const out=await api("/api/admin/match-events",{method:"POST",body:JSON.stringify({action:"undo",match_no:matchNo})});
    state.data=out.state;
    renderAdmin();renderPublicBoard();
    setTimeout(()=>scrollAdminSection("adminOfficialSection"),0);
    toast("Latest event undone.");
  }catch(e){toast(e.message)}
}
window.undoMatchEvent=undoMatchEvent;

async function saveLiveScore(no,status="Live"){
  const hs=Number($(`liveHome_${no}`).value),as=Number($(`liveAway_${no}`).value);
  try{const out=await api("/api/admin/live-score",{method:"POST",body:JSON.stringify({match_no:no,home_score:hs,away_score:as,status})});state.data=out.state;renderAll();renderPublicBoard();toast(status==="Live"?"Live score published.":"Match returned to scheduled.")}
  catch(e){toast(e.message)}
}
window.saveLiveScore=saveLiveScore;
function stepScore(id,delta){const el=$(id);el.value=Math.max(0,Number(el.value||0)+delta)}
window.stepScore=stepScore;

function nudgeMatchTime(no,delta){
  const el=$(`scheduleTime_${no}`);if(!el)return;
  el.value=shiftClock(el.value||state.data.matches.find(m=>m.match_no===no)?.start_time,delta);
}
window.nudgeMatchTime=nudgeMatchTime;
async function saveMatchTime(no){
  const el=$(`scheduleTime_${no}`),shift=$(`shiftFollowing_${no}`);
  if(!el?.value)return toast("Choose a match time first.");
  try{
    const out=await api("/api/admin/match-time",{method:"POST",body:JSON.stringify({match_no:no,start_time:el.value,shift_following:!!shift?.checked})});
    state.data=out.state;renderAdmin();renderPublicBoard();
    const moved=Number(out.delta_minutes||0);
    toast(moved===0?"Match time saved.":`Schedule updated ${moved>0?"+":""}${moved} min${shift?.checked?" for following matches too":""}.`);
  }catch(e){toast(e.message)}
}
window.saveMatchTime=saveMatchTime;
function scrollAdminSection(id){$(id)?.scrollIntoView({behavior:"smooth",block:"start"})}
window.scrollAdminSection=scrollAdminSection;
async function refreshAdminNow(){
  try{state.data=await api("/api/admin/state");renderAdmin();renderPublicBoard();toast("Admin data refreshed.")}catch(e){toast(e.message)}
}
window.refreshAdminNow=refreshAdminNow;

async function resetScoresOnly(){
  if(!state.data.draw?.completed)return toast("Complete the draw first.");
  if(!confirm("Clear ALL test scores/results and restart from M1?\n\nTeams, players, draw letters, match times and tournament settings will NOT be changed."))return;
  try{
    const out=await api("/api/admin/reset-scores",{method:"POST",body:"{}"});
    state.data=out.state;
    clearAllOfficialTimers();
    renderAll();renderPublicBoard();
    showPage("admin");
    setTimeout(()=>scrollAdminSection("adminLiveSection"),0);
    toast("Scores cleared. Restarted from M1.");
  }catch(e){toast(e.message)}
}
window.resetScoresOnly=resetScoresOnly;

async function restartDraw(){
  const password=$("restartPassword").value;
  if(!password)return toast("Enter the admin password to restart the draw.");
  if(!confirm("Restart the draw? This clears the draw and every match score/result so you can test again."))return;
  try{
    const out=await api("/api/admin/restart-draw",{method:"POST",body:JSON.stringify({
      password,clear_players:$("restartPlayers").checked,clear_announcements:$("restartNotices").checked
    })});
    state.data=out.state;state.manualDrawDraft=null;state.adminDrawMode="auto";renderAll();renderPublicBoard();toast("Draw and match results cleared. Ready for a fresh test draw.");
  }catch(e){toast(e.message)}
}
window.restartDraw=restartDraw;

async function postNotice(e){
  e.preventDefault();try{const out=await api("/api/admin/announcement",{method:"POST",body:JSON.stringify({title:$("noticeTitle").value.trim(),body:$("noticeBody").value.trim()})});state.data=out.state;renderAll();toast("Announcement published.")}
  catch(e){toast(e.message)}
}

function renderAdmin(){
  if(state.role!=="admin"){$("adminPage").innerHTML="";return}
  const c=state.data.config,slots=manualDrawSlots(),matches=state.data.matches||[];
  const playable=matches.filter(m=>m.home_team_id&&m.away_team_id&&!["Finished","Walkover"].includes(m.status));
  const sortedPlayable=[...playable].sort((a,b)=>(a.status==="Live"?-1:0)-(b.status==="Live"?-1:0)||a.sort_order-b.sort_order);
  $("adminPage").innerHTML=`<div class="admin-quick-nav">
      <button type="button" class="secondary" onclick="scrollAdminSection('adminLiveSection')">⚽ Live score</button>
      <button type="button" class="secondary" onclick="scrollAdminSection('adminOfficialSection')">📝 Match official</button>
      <button type="button" class="secondary" onclick="scrollAdminSection('adminScheduleSection')">🕒 Match times</button>
      <button type="button" class="secondary" onclick="scrollAdminSection('adminDrawSection')">🎲 Draw</button>
      <button type="button" class="secondary" onclick="scrollAdminSection('adminSettingsSection')">⚙ Settings</button>
      <button type="button" class="secondary" onclick="scrollAdminSection('adminTeamsSection')">👥 Teams</button>
      <button type="button" class="secondary" onclick="scrollAdminSection('adminPlayersSection')">🧑 Players</button>
      <button type="button" class="ghost" onclick="refreshAdminNow()">↻ Refresh</button>
    </div>
    <div class="grid admin-page-grid">

    <div id="adminLiveSection" class="card span-12 admin-section"><div class="section-title"><div><div class="kicker">LIVE MATCH CONTROL</div><h3>Current score & final result</h3></div><span class="badge ${playable.some(m=>m.status==="Live")?"live":""}">${playable.some(m=>m.status==="Live")?"LIVE NOW":`${playable.length} playable`}</span></div>
      <p class="muted">Start a match LIVE, update the score during play, then save the final result. The public page updates without player login.</p>
      <div class="test-score-reset">
        <div><div class="kicker">SAFE TEST RESET</div><strong>Testing scores/results?</strong><div class="muted">Clears only match scores and winners, then starts again from M1. Players, rosters, draw letters, teams, settings and match times stay unchanged.</div></div>
        <button type="button" class="secondary" onclick="resetScoresOnly()">↻ Clear scores & restart M1</button>
      </div>
      <div class="grid live-control-grid">${sortedPlayable.map(m=>{const{h,a}=pair(m);return `<div class="live-control span-6 ${m.status==="Live"?"is-live":""}"><div class="section-title"><div><div class="kicker">${m.match_no} · ${m.stage} · ${esc(m.start_time)}</div><strong>${esc(h)} vs ${esc(a)}</strong></div><span class="badge ${m.status==="Live"?"live":""}">${m.status}</span></div>
        <div class="live-score-inputs">
          <label>${esc(h)}<div class="score-stepper"><button type="button" onclick="stepScore('liveHome_${m.match_no}',-1)">−</button><input id="liveHome_${m.match_no}" type="number" min="0" inputmode="numeric" value="${m.home_score??0}"><button type="button" onclick="stepScore('liveHome_${m.match_no}',1)">+</button></div></label>
          <label>${esc(a)}<div class="score-stepper"><button type="button" onclick="stepScore('liveAway_${m.match_no}',-1)">−</button><input id="liveAway_${m.match_no}" type="number" min="0" inputmode="numeric" value="${m.away_score??0}"><button type="button" onclick="stepScore('liveAway_${m.match_no}',1)">+</button></div></label>
        </div>
        <div class="live-actions"><button type="button" class="primary" onclick="saveLiveScore('${m.match_no}','Live')">${m.status==="Live"?"Update LIVE score":"Start LIVE"}</button><button type="button" class="secondary" onclick="saveLiveScore('${m.match_no}','Scheduled')">Stop live</button><button type="button" class="secondary" onclick="enterResult('${m.match_no}')">Final result</button></div>
      </div>`}).join("")||`<div class="notice span-12">${state.data.draw.completed?"No playable matches are available yet. Finish the feeder match so the next teams advance.":"Run the draw first. Live score controls will appear here immediately."}</div>`}</div>
    </div>

    <div id="adminOfficialSection" class="card span-12 admin-section">
      <div class="section-title"><div><div class="kicker">MATCH OFFICIAL</div><h3>Goals, scorers, time, fouls & cards</h3></div><span class="badge">5th foul = penalty</span></div>
      <p class="muted">Use this during each match. Recording a goal automatically adds 1 to the live score. Record the match minute/second, scorer or player involved, fouls and cards. The 5th team foul is flagged as a penalty.</p>
      <div class="official-match-grid">${sortedPlayable.map(m=>{
        const {h,a}=pair(m);
        const ev=matchEvents(m.match_no);
        const hf=matchFoulCount(m.match_no,m.home_team_id),af=matchFoulCount(m.match_no,m.away_team_id);
        return `<div class="official-match-card ${m.status==="Live"?"is-live":""}">
          <div class="section-title">
            <div><div class="kicker">${m.match_no} · ${esc(m.stage)} · ${esc(m.start_time)}</div><strong>${esc(h)} vs ${esc(a)}</strong></div>
            <span class="badge ${m.status==="Live"?"live":""}">${esc(m.status)}</span>
          </div>

          <div class="official-score-summary">
            <div><span>${esc(h)}</span><b>${m.home_score??0}</b><small class="${hf>=5?"foul-penalty":""}">Fouls: ${hf}${hf>=5?" · PENALTY":""}</small></div>
            <div class="official-vs">VS</div>
            <div><span>${esc(a)}</span><b>${m.away_score??0}</b><small class="${af>=5?"foul-penalty":""}">Fouls: ${af}${af>=5?" · PENALTY":""}</small></div>
          </div>

          <div class="official-stopwatch">
            <div class="official-stopwatch-display" id="officialTimer_${m.match_no}" data-official-timer="${m.match_no}">${formatOfficialTimer(m.match_no)}</div>
            <div class="official-stopwatch-actions">
              <button id="officialTimerStart_${m.match_no}" type="button" class="primary" onclick="startOfficialTimer('${m.match_no}')">${readOfficialTimer(m.match_no).running?"Running…":"▶ Start"}</button>
              <button type="button" class="secondary" onclick="pauseOfficialTimer('${m.match_no}')">Ⅱ Pause</button>
              <button type="button" class="secondary" onclick="useOfficialTimerTime('${m.match_no}')">Use time</button>
              <button type="button" class="ghost" onclick="resetOfficialTimer('${m.match_no}')">↺ Reset</button>
            </div>
            <div class="muted official-stopwatch-note">While running, the goal/foul event time below follows the stopwatch automatically. Pause it for halftime or stoppages.</div>
          </div>

          <div class="official-clock-inputs">
            <label>Event minute<input id="officialMin_${m.match_no}" type="number" min="0" max="99" inputmode="numeric" value="${officialTimerParts(m.match_no).minute}"></label>
            <label>Event second<input id="officialSec_${m.match_no}" type="number" min="0" max="59" inputmode="numeric" value="${officialTimerParts(m.match_no).second}"></label>
          </div>

          <div class="official-team-actions">
            <div class="official-team-panel">
              <strong>${esc(h)}</strong>
              <select id="officialHomePlayer_${m.match_no}">${playerOptionsForTeam(m.home_team_id)}</select>
              <div class="official-event-buttons">
                <button type="button" class="primary" onclick="addMatchEvent('${m.match_no}','goal','${m.home_team_id}','home')">⚽ Goal</button>
                <button type="button" class="secondary" onclick="addMatchEvent('${m.match_no}','foul','${m.home_team_id}','home')">⚠ Foul</button>
                <button type="button" class="secondary" onclick="addMatchEvent('${m.match_no}','penalty_goal','${m.home_team_id}','home')">Penalty goal</button>
                <button type="button" class="secondary" onclick="addMatchEvent('${m.match_no}','penalty_miss','${m.home_team_id}','home')">Penalty miss</button>
                <button type="button" class="secondary" onclick="addMatchEvent('${m.match_no}','yellow_card','${m.home_team_id}','home')">🟨 Yellow</button>
                <button type="button" class="danger" onclick="addMatchEvent('${m.match_no}','red_card','${m.home_team_id}','home')">🟥 Red</button>
              </div>
            </div>
            <div class="official-team-panel">
              <strong>${esc(a)}</strong>
              <select id="officialAwayPlayer_${m.match_no}">${playerOptionsForTeam(m.away_team_id)}</select>
              <div class="official-event-buttons">
                <button type="button" class="primary" onclick="addMatchEvent('${m.match_no}','goal','${m.away_team_id}','away')">⚽ Goal</button>
                <button type="button" class="secondary" onclick="addMatchEvent('${m.match_no}','foul','${m.away_team_id}','away')">⚠ Foul</button>
                <button type="button" class="secondary" onclick="addMatchEvent('${m.match_no}','penalty_goal','${m.away_team_id}','away')">Penalty goal</button>
                <button type="button" class="secondary" onclick="addMatchEvent('${m.match_no}','penalty_miss','${m.away_team_id}','away')">Penalty miss</button>
                <button type="button" class="secondary" onclick="addMatchEvent('${m.match_no}','yellow_card','${m.away_team_id}','away')">🟨 Yellow</button>
                <button type="button" class="danger" onclick="addMatchEvent('${m.match_no}','red_card','${m.away_team_id}','away')">🟥 Red</button>
              </div>
            </div>
          </div>

          <div class="official-event-log">
            <div class="section-title"><strong>Event log</strong><button type="button" class="ghost compact" onclick="undoMatchEvent('${m.match_no}')">Undo latest</button></div>
            ${ev.length?ev.slice().reverse().map(e=>`<div class="official-event-row"><b>${eventTime(e)}</b><span>${esc(eventTeamName(e))}</span><strong>${esc(eventLabel(e))}</strong>${e.detail?`<small>${esc(e.detail)}</small>`:""}</div>`).join(""):`<div class="muted">No events recorded yet.</div>`}
          </div>
        </div>`;
      }).join("")||`<div class="notice">No playable matches yet. Complete the draw or finish the previous feeder match.</div>`}</div>
    </div>

    <div id="adminScheduleSection" class="card span-12 admin-section"><div class="section-title"><div><div class="kicker">SCHEDULE CONTROL</div><h3>Adjust match times during the tournament</h3></div><span class="badge">±5 min quick shift</span></div>
      <p class="muted">If a match is delayed or finishes early, change the next match time. Keep “shift following matches” checked to move the rest of the schedule by the same amount.</p>
      <div class="schedule-grid">${matches.map(m=>{const{h,a}=pair(m);return `<div class="schedule-card"><div class="schedule-card-head"><div><b>${m.match_no}</b><span>${esc(m.stage)}</span></div><span class="badge ${m.status==="Live"?"live":""}">${esc(m.status)}</span></div><div class="schedule-teams">${esc(h)} <span>vs</span> ${esc(a)}</div><div class="schedule-time-row"><input id="scheduleTime_${m.match_no}" type="time" value="${esc(m.start_time)}" aria-label="${m.match_no} start time"><button type="button" class="secondary compact" onclick="nudgeMatchTime('${m.match_no}',-5)">−5</button><button type="button" class="secondary compact" onclick="nudgeMatchTime('${m.match_no}',5)">+5</button></div><label class="check-row schedule-shift"><input id="shiftFollowing_${m.match_no}" type="checkbox" checked> Shift later unfinished matches too</label><button type="button" class="primary schedule-save" onclick="saveMatchTime('${m.match_no}')">Save time</button></div>`}).join("")||`<div class="notice">Run the draw first to create the match schedule.</div>`}</div>
    </div>

    <div id="adminDrawSection" class="card span-12 admin-section"><div class="section-title"><div><div class="kicker">DRAW CONTROL</div><h3>Automatic or manual letter draw</h3></div><span class="badge ${state.data.draw.completed?"ok":""}">${state.data.draw.completed?"Draw exists":"Ready"}</span></div>
      <div class="draw-choice-tabs"><button type="button" class="secondary ${state.adminDrawMode==="auto"?"active":""}" data-draw-mode="auto" onclick="setAdminDrawMode('auto')">Automatic animated draw</button><button type="button" class="secondary ${state.adminDrawMode==="manual"?"active":""}" data-draw-mode="manual" onclick="setAdminDrawMode('manual')">Manual / edit draw</button></div>
      <div id="autoDrawSection" class="${state.adminDrawMode==="auto"?"":"hidden"}"><p class="muted">Draw uses letters A–P. O and P are the M8 positions; automatic draw keeps Kuda Adi vs Wanted Cow there, while manual draw lets Admin edit all 16 letters.</p><div class="actions"><button id="startDrawBtn" type="button" class="primary">${state.data.draw.completed?"Run another automatic draw":"Start animated draw"}</button>${state.data.draw.completed?`<button type="button" class="secondary" onclick="setAdminDrawMode('manual')">Edit current draw manually</button>`:""}<button type="button" class="secondary" onclick="showPage('draw')">View current draw</button></div></div>
      <div id="manualDrawSection" class="${state.adminDrawMode==="manual"?"":"hidden"}"><div class="notice manual-stable-note"><b>Assigned letters are pre-filled automatically.</b><br>A–P are loaded with the approved team-letter assignments. Change only what you need, then apply the manual draw.</div>
        <div class="manual-draw-grid">${slots.map(slot=>{const selected=state.manualDrawDraft?.[slot.letter]??currentTeamForLetter(slot.letter);return `<div class="manual-slot"><div class="kicker">LETTER ${slot.letter} · ${slot.label}</div><select data-manual-slot="${slot.letter}">${teamOptions(selected)}</select></div>`}).join("")}</div>
        <div class="actions" style="margin-top:14px"><button type="button" class="primary" onclick="submitManualDraw()">Apply manual letter draw</button></div>
      </div>
    </div>

    <div id="adminSettingsSection" class="card span-12 admin-section"><div class="section-title"><div><div class="kicker">TOURNAMENT SETTINGS</div><h3>Date, venue & timing rules</h3></div><span class="badge">Editable</span></div>
      <form id="settingsForm" class="settings-grid">
        <label class="wide">Tournament name<input id="setName" value="${esc(c.tournament_name)}"></label>
        <label class="wide">Venue<input id="setVenue" value="${esc(c.venue)}"></label>
        <label>Date<input id="setDate" type="date" value="${esc(c.date)}"></label>
        <label>Starting time<input id="setStart" type="time" value="${esc(c.start_time)}"></label>
        <label>First half (min)<input id="setFirstHalf" type="number" min="1" value="${c.first_half}"></label>
        <label>Halftime (min)<input id="setHalftime" type="number" min="0" value="${c.halftime}"></label>
        <label>Second half (min)<input id="setSecondHalf" type="number" min="1" value="${c.second_half}"></label>
        <label>Changeover (min)<input id="setChangeover" type="number" min="0" value="${c.changeover}"></label>
        <label>Final recovery (min)<input id="setFinalRecovery" type="number" min="0" value="${c.final_recovery}"></label>
        <label>Player arrival early (min)<input id="setArrival" type="number" min="0" value="${c.arrival_minutes??5}"></label>
        <label>Max squad<input id="setMaxSquad" type="number" min="3" value="${c.max_squad}"></label>
        <label>Late grace (min)<input id="setGrace" type="number" min="0" value="${c.grace_minutes}"></label>
        <label class="wide check-row"><input id="setRebuild" type="checkbox" checked> Recalculate the full schedule from the starting time</label>
        <div class="wide"><button class="primary">Save tournament settings</button></div>
      </form>
    </div>

    <div id="adminResultsSection" class="card span-12 admin-section"><div class="section-title"><h3>All match results</h3><span class="badge">${matches.length}/15</span></div>
      <div class="table-wrap desktop-only"><table><thead><tr><th>Match</th><th>Stage</th><th>Time</th><th>Home</th><th>Score</th><th>Away</th><th>Status</th><th></th></tr></thead><tbody>${matches.map(m=>{const{h,a}=pair(m);return `<tr><td><b>${m.match_no}</b></td><td>${m.stage}</td><td>${m.start_time}</td><td>${esc(h)}</td><td>${m.home_score==null?"—":`${m.home_score}-${m.away_score}`}</td><td>${esc(a)}</td><td>${m.status}</td><td>${m.home_team_id&&m.away_team_id?`<button type="button" class="secondary" onclick="enterResult('${m.match_no}')">Update final</button>`:""}</td></tr>`}).join("")||`<tr><td colspan="8" class="muted">Run the draw first.</td></tr>`}</tbody></table></div>
      <div class="mobile-only mobile-results">${matches.map(m=>{const{h,a}=pair(m);return `<div class="mobile-result-card"><div class="section-title"><b>${m.match_no} · ${esc(m.stage)}</b><span class="badge">${esc(m.status)}</span></div><div class="muted">${esc(m.start_time)}</div><div class="mobile-result-teams"><span>${esc(h)}</span><strong>${m.home_score==null?"—":`${m.home_score}-${m.away_score}`}</strong><span>${esc(a)}</span></div>${m.home_team_id&&m.away_team_id?`<button type="button" class="secondary" onclick="enterResult('${m.match_no}')">Update final result</button>`:""}</div>`}).join("")||`<div class="notice">Run the draw first.</div>`}</div>
    </div>

    <div id="adminTeamsSection" class="card span-12 admin-section"><div class="section-title"><div><div class="kicker">TEAM MANAGER</div><h3>Edit all 16 teams</h3></div><span class="badge">16 slots</span></div><div class="team-editor">${state.data.teams.map((t,i)=>`<div class="team-editor-row" data-team-editor-row data-team-id="${esc(t.id)}"><div class="team-number">${i+1}</div><label>Team name<input data-team-name value="${esc(t.name)}"></label><label class="team-code-field">Internal code<input data-team-code value="${esc(t.code||"TEAM"+(i+1))}"></label></div>`).join("")}</div><div class="actions" style="margin-top:14px"><button type="button" class="primary" onclick="saveTeams()">Save team list</button></div></div>

    <div id="adminPlayersSection" class="card span-12 admin-section">
      <div class="section-title"><div><div class="kicker">PLAYER MANAGER</div><h3>Add or edit player names</h3></div><span class="badge">${state.data.players.length} players</span></div>
      <p class="muted">Open a team, edit any existing player name and save it, or add a new player to that team.</p>
      <div class="admin-player-teams">${state.data.teams.map(t=>{
        const ps=state.data.players.filter(p=>p.team_id===t.id);
        return `<details class="admin-player-team">
          <summary><span><strong>${esc(t.name)}</strong><small>${ps.length} players</small></span><span class="badge">${ps.length}</span></summary>
          <div class="admin-player-list">
            ${ps.map((p,i)=>`<div class="admin-player-row"><span class="roster-no">${i+1}</span><input data-admin-player-name="${esc(p.id)}" value="${esc(p.name)}" aria-label="Player name"><button type="button" class="secondary compact" onclick="editAdminPlayer('${esc(p.id)}')">Save</button></div>`).join("")||`<div class="muted">No players listed.</div>`}
            <div class="admin-add-player"><input data-admin-new-player="${esc(t.id)}" placeholder="New player name" aria-label="New player name"><button type="button" class="primary" onclick="addAdminPlayer('${esc(t.id)}')">+ Add player</button></div>
          </div>
        </details>`;
      }).join("")}</div>
    </div>

    <div class="card span-6 admin-section"><h3>Post announcement</h3><form id="noticeForm" class="admin-grid"><label class="wide">Title<input id="noticeTitle" required></label><label class="wide">Message<textarea id="noticeBody" required></textarea></label><div class="wide"><button class="primary">Publish</button></div></form></div>
    <div class="card span-6 admin-section"><div class="restart-box"><div class="kicker">FULL DRAW RESET</div><h3>Password-protected restart draw</h3><p class="muted">Clears the draw and every match score/result, but keeps your team names and tournament settings.</p><label>Admin password<input id="restartPassword" type="password" placeholder="Enter admin password"></label><label class="check-row"><input id="restartPlayers" type="checkbox"> Also clear registered test players</label><label class="check-row"><input id="restartNotices" type="checkbox"> Also clear announcements</label><div class="actions" style="margin-top:12px"><button type="button" class="danger" onclick="restartDraw()">Restart draw & clear results</button></div></div></div>
  </div>`;
  ensureOfficialTimerTicker();
  document.querySelectorAll("[data-official-timer]").forEach(el=>syncOfficialTimerDom(el.dataset.officialTimer));
  $("startDrawBtn")?.addEventListener("click",startDraw);
  $("settingsForm")?.addEventListener("submit",saveSettings);
  $("noticeForm")?.addEventListener("submit",postNotice);
  document.querySelectorAll("[data-manual-slot]").forEach(sel=>sel.addEventListener("change",()=>{
    state.manualDrawDraft=state.manualDrawDraft||{};
    state.manualDrawDraft[sel.dataset.manualSlot]=sel.value;
  }));
}
function renderAll(opts={}){if(!state.data)return;renderHome();renderDraw();renderBracket();renderMatches();renderTeam();renderGuide();renderRules();renderNotices();if(!opts.skipAdmin)renderAdmin()}

(async()=>{
  await refreshPublicOnly();
  clearInterval(state.publicTimer);state.publicTimer=setInterval(()=>{if(!state.role)refreshPublicOnly()},4000);
  if(!isProjectorMode && state.player){state.role="player";try{await enterApp()}catch{state.role=null}}
})();
