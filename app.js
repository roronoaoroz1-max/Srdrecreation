const state={
  data:null, role:null,
  player:JSON.parse(localStorage.getItem("futsal_player")||"null"),
  adminToken:sessionStorage.getItem("futsal_admin_token")||"",
  currentPage:"home", timer:null, publicTimer:null, drawAnimating:false
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
async function refresh(){
  state.data=await api(state.role==="admin"?"/api/admin/state":"/api/state");
  if(state.role) renderAll();
  renderPublicBoard();
}
async function refreshPublicOnly(){
  try{state.data=await api("/api/state");renderPublicBoard()}
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
      name:$("playerName").value.trim(),draw_letter:$("playerDrawLetter").value,
      shirt_no:$("playerShirt").value.trim(),position:$("playerPosition").value
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
  $("appView").classList.add("hidden");$("loginView").classList.remove("hidden");refreshPublicOnly();
});
$("publicRefreshBtn")?.addEventListener("click",refreshPublicOnly);
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));

async function enterApp(){
  await refresh();$("loginView").classList.add("hidden");$("appView").classList.remove("hidden");
  $("adminNav").classList.toggle("hidden",state.role!=="admin");
  $("userBadge").textContent=state.role==="admin"?"Tournament Admin":`${state.player?.name||"Player"} · ${teamById(state.player?.team_id)?.name||""}`;
  showPage("home");clearInterval(state.timer);
  state.timer=setInterval(()=>{if(!state.drawAnimating)refresh().catch(()=>{})},3500);
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
function renderPublicBoard(){
  const body=$("publicBoardBody");if(!body||!state.data)return;
  const ms=state.data.matches||[],live=ms.filter(m=>m.status==="Live");
  const upcoming=ms.filter(m=>m.status==="Scheduled"&&m.home_team_id&&m.away_team_id).slice(0,4);
  const finished=ms.filter(m=>["Finished","Walkover"].includes(m.status)).slice(-4).reverse();
  const current=live[0]||upcoming[0]||finished[0];
  if(!current){
    body.innerHTML=`<div class="notice"><strong>${state.data.draw.completed?"Draw completed.":"Tournament draw not completed yet."}</strong><br>Live score, latest results and upcoming matches will appear here without login.</div>`;return;
  }
  const{h,a}=pair(current);
  const score=current.status==="Scheduled"?current.start_time:`${current.home_score??0} - ${current.away_score??0}`;
  body.innerHTML=`<div class="public-live-grid">
    <div class="public-match"><div class="section-title"><div><div class="kicker">${esc(current.match_no)} · ${esc(current.stage)}</div><strong>${current.status==="Live"?"Current match":current.status==="Scheduled"?"Next match":"Latest result"}</strong></div>${statusBadge(current)}</div>
      <div class="public-scoreline"><div class="team"><strong>${esc(h)}</strong></div><div class="public-score">${score}</div><div class="team"><strong>${esc(a)}</strong></div></div>
      <div class="muted" style="text-align:center;margin-top:8px">${esc(current.match_date||"")} · ${esc(current.court||"Court 1")}</div>
    </div>
    <div class="public-match"><div class="kicker">TOURNAMENT INFO</div><div class="public-small-list">
      <div class="public-small-item"><span>Venue</span><strong>${esc(state.data.config.venue)}</strong></div>
      <div class="public-small-item"><span>Date</span><strong>${esc(state.data.config.date)}</strong></div>
      <div class="public-small-item"><span>Start</span><strong>${esc(state.data.config.start_time)}</strong></div>
      <div class="public-small-item"><span>Draw</span><strong>${state.data.draw.completed?"Completed":"Pending"}</strong></div>
    </div></div></div>
    <div class="grid" style="margin-top:14px">
      <div class="card span-6" style="box-shadow:none"><h3>Recent results</h3>${finished.length?finished.map(fixture).join(""):`<p class="muted">No results yet.</p>`}</div>
      <div class="card span-6" style="box-shadow:none"><h3>Upcoming</h3>${upcoming.length?upcoming.map(fixture).join(""):`<p class="muted">No upcoming matches assigned.</p>`}</div>
    </div>`;
}

const myTeam=()=>state.role==="player"?state.player?.team_id:null;
const myMatches=()=>{const t=myTeam();return t?state.data.matches.filter(m=>m.home_team_id===t||m.away_team_id===t):[]};
const nextMatch=()=>myMatches().find(m=>!["Finished","Walkover"].includes(m.status));
const teamDrawLetter=teamId=>state.data?.draw?.sequence?.find(x=>x.team_id===teamId)?.letter||"—";

function renderHome(){
  const c=state.data.config,n=nextMatch(),t=teamById(myTeam());
  $("homePage").innerHTML=`<div class="grid">
    <div class="card span-3"><div class="muted">Tournament</div><div class="stat">14 Teams</div><div class="kicker">13-match knockout</div></div>
    <div class="card span-3"><div class="muted">Draw</div><div class="stat">${state.data.draw.completed?"Completed":"Pending"}</div><div class="kicker">Letters A–N</div></div>
    <div class="card span-3"><div class="muted">${state.role==="player"?"My draw letter":"Venue"}</div><div class="stat">${state.role==="player"?esc(teamDrawLetter(myTeam())):esc(c.venue)}</div><div class="kicker">${state.role==="player"?esc(t?.name||""):"Tournament venue"}</div></div>
    <div class="card span-3"><div class="muted">${state.role==="player"?"Next match":"Start"}</div><div class="stat">${state.role==="player"?(n?.start_time||"—"):esc(c.start_time)}</div><div class="kicker">${state.role==="player"?(n?.match_no||"No match yet"):esc(c.date)}</div></div>
    <div class="card span-8"><div class="section-title"><h3>${state.role==="player"?"Your tournament":"Tournament status"}</h3><button class="secondary" onclick="showPage('bracket')">Open bracket</button></div>${state.role==="player"?(n?fixture(n):`<div class="notice">${state.data.draw.completed?"No upcoming match assigned.":"The official draw has not started yet."}</div>`):`<div class="notice"><strong>${state.data.draw.completed?"Draw completed.":"Ready for the official draw."}</strong><br>${state.data.draw.completed?"Use Live Match Control in Admin to publish scores instantly.":"Open Admin and start the draw."}</div>`}</div>
    <div class="card span-4"><h3>Match format</h3><div class="row"><span>First half</span><b>${c.first_half} min</b></div><div class="row"><span>Halftime</span><b>${c.halftime} min</b></div><div class="row"><span>Second half</span><b>${c.second_half} min</b></div><div class="row"><span>Changeover</span><b>${c.changeover} min</b></div></div>
    <div class="card span-12"><div class="section-title"><h3>Latest notices</h3><button class="secondary" onclick="showPage('notices')">All notices</button></div>${state.data.announcements.slice(0,3).map(a=>`<div class="row"><div><strong>${esc(a.title)}</strong><div class="muted">${esc(a.body)}</div></div></div>`).join("")||`<p class="muted">No announcements yet.</p>`}</div>
  </div>`;
}
function renderDraw(){
  const d=state.data.draw;$("drawPage").innerHTML=`<div class="card"><div class="section-title"><div><div class="kicker">OFFICIAL LETTER DRAW</div><h3>Draw results A–N</h3></div><span class="badge ${d.completed?"ok":""}">${d.completed?"Completed":"Waiting"}</span></div>${!d.completed?`<div class="notice">The organizer has not run the draw yet. Player login by letter becomes available after the draw.</div>`:`<div class="draw-history">${d.sequence.map(x=>`<div class="draw-item"><span class="kicker">LETTER ${esc(x.letter)} · ${esc(x.slot)}</span><strong>${esc(x.team_name)}</strong></div>`).join("")}</div>`}</div>`;
}
function bracketCard(m){
  if(!m)return `<div class="match-card"><div class="match-meta"><span>TBD</span><span>Pending</span></div><div class="match-team"><span>TBD</span><b>—</b></div><div class="match-team"><span>TBD</span><b>—</b></div></div>`;
  const{h,a}=pair(m),hw=m.winner_team_id===m.home_team_id,aw=m.winner_team_id===m.away_team_id;
  return `<div class="match-card"><div class="match-meta"><span>${esc(m.match_no)}</span><span>${m.status==="Live"?"● LIVE":esc(m.start_time)}</span></div><div class="match-team ${hw?"winner":""}"><span>${esc(h)}</span><b>${m.home_score??"—"}</b></div><div class="match-team ${aw?"winner":""}"><span>${esc(a)}</span><b>${m.away_score??"—"}</b></div></div>`;
}
function renderBracket(){
  const s=x=>state.data.matches.filter(m=>m.stage===x),r=s("Round 1"),q=s("Quarterfinal"),sf=s("Semifinal"),f=s("Final");
  $("bracketPage").innerHTML=`<div class="card"><div class="section-title"><h3>Knockout bracket</h3><span class="badge">${state.data.draw.completed?"Live":"Awaiting draw"}</span></div><div class="bracket-wrap"><div class="bracket"><div><div class="round-title">Round 1</div><div class="round">${Array.from({length:6},(_,i)=>bracketCard(r[i])).join("")}</div></div><div><div class="round-title">Quarterfinals</div><div class="round qf">${Array.from({length:4},(_,i)=>bracketCard(q[i])).join("")}</div></div><div><div class="round-title">Semifinals</div><div class="round sf">${Array.from({length:2},(_,i)=>bracketCard(sf[i])).join("")}</div></div><div><div class="round-title">Final</div><div class="round final">${bracketCard(f[0])}</div></div></div></div></div>`;
}
function renderMatches(){
  const stages=["Round 1","Quarterfinal","Semifinal","Final"];
  $("matchesPage").innerHTML=state.data.matches.length?stages.map(s=>{const ms=state.data.matches.filter(m=>m.stage===s);return `<div class="card"><div class="section-title"><h3>${s}</h3><span class="badge">${ms.length}</span></div>${ms.map(fixture).join("")}</div>`}).join(""):`<div class="card"><div class="notice">Matches will appear after the draw.</div></div>`;
}
function renderTeam(){
  if(state.role!=="player"){
    $("teamPage").innerHTML=`<div class="card"><h3>Registered players</h3>${state.data.teams.map(t=>{const ps=state.data.players.filter(p=>p.team_id===t.id);return `<div class="row"><div><strong>${esc(t.name)}</strong><div class="muted">${ps.map(p=>esc(p.name)).join(", ")||"No players registered"}</div></div><span class="badge">${ps.length}/${state.data.config.max_squad}</span></div>`}).join("")}</div>`;return;
  }
  const t=teamById(state.player.team_id),ps=state.data.players.filter(p=>p.team_id===state.player.team_id);
  $("teamPage").innerHTML=`<div class="grid"><div class="card span-5"><div class="kicker">MY TEAM · LETTER ${esc(teamDrawLetter(state.player.team_id))}</div><h3>${esc(t?.name)}</h3>${ps.map(p=>`<div class="row"><div class="person"><div class="avatar">${esc(initials(p.name))}</div><div><strong>${esc(p.name)}</strong><div class="muted">${esc(p.position||"Player")}</div></div></div><b>#${esc(p.shirt_no||"—")}</b></div>`).join("")}</div><div class="card span-7"><h3>Team matches</h3>${myMatches().length?myMatches().map(fixture).join(""):`<p class="muted">Matches appear after the draw.</p>`}</div></div>`;
}
function renderGuide(){
  const c=state.data.config,rows=[["A","Direct to QF1"],["B","M1 Team 1"],["C","M1 Team 2"],["D","M2 Team 1"],["E","M2 Team 2"],["F","M3 Team 1"],["G","M3 Team 2"],["H","Direct to QF3"],["I","M4 Team 1"],["J","M4 Team 2"],["K","M5 Team 1"],["L","M5 Team 2"],["M","M6 Team 1"],["N","M6 Team 2"]];
  $("guidePage").innerHTML=`<div class="card"><div class="kicker">ONE-PAGE TOURNAMENT GUIDE</div><h3>How the tournament works</h3><p class="muted">14 teams play single elimination. Every team receives one draw letter A–N. A and H enter the quarterfinals directly.</p><div class="notice"><b>A</b> → QF1 vs Winner B/C<br><b>D/E</b> and <b>F/G</b> feed QF2<br><b>H</b> → QF3 vs Winner I/J<br><b>K/L</b> and <b>M/N</b> feed QF4<br>Then QF → SF → Final.</div></div>
  <div class="card"><div class="section-title"><h3>Letter positions</h3><span class="badge">A–N</span></div><div class="table-wrap"><table><thead><tr><th>Letter</th><th>Position</th></tr></thead><tbody>${rows.map(([a,b])=>`<tr><td><b>${a}</b></td><td>${b}</td></tr>`).join("")}</tbody></table></div></div>
  <div class="card"><h3>Timing & login</h3><div class="rule-grid"><div class="rule"><strong>${c.first_half}+${c.halftime}+${c.second_half} min</strong><span class="muted">First half + halftime + second half</span></div><div class="rule"><strong>${c.changeover} min</strong><span class="muted">Changeover</span></div><div class="rule"><strong>Public live board</strong><span class="muted">Scores can be viewed before login.</span></div><div class="rule"><strong>Player login</strong><span class="muted">Name + team draw letter after the draw.</span></div></div></div>`;
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
    {letter:"A",label:"Direct QF1"},{letter:"B",label:"M1 Team 1"},{letter:"C",label:"M1 Team 2"},
    {letter:"D",label:"M2 Team 1"},{letter:"E",label:"M2 Team 2"},{letter:"F",label:"M3 Team 1"},
    {letter:"G",label:"M3 Team 2"},{letter:"H",label:"Direct QF3"},{letter:"I",label:"M4 Team 1"},
    {letter:"J",label:"M4 Team 2"},{letter:"K",label:"M5 Team 1"},{letter:"L",label:"M5 Team 2"},
    {letter:"M",label:"M6 Team 1"},{letter:"N",label:"M6 Team 2"}
  ];
}
function currentTeamForLetter(letter){return state.data.draw?.sequence?.find(x=>x.letter===letter)?.team_id||""}
function teamOptions(selected=""){return `<option value="">Select team...</option>`+state.data.teams.map(t=>`<option value="${esc(t.id)}" ${selected===t.id?"selected":""}>${esc(t.name)}</option>`).join("")}
function setAdminDrawMode(mode){
  $("autoDrawSection")?.classList.toggle("hidden",mode!=="auto");$("manualDrawSection")?.classList.toggle("hidden",mode!=="manual");
  document.querySelectorAll("[data-draw-mode]").forEach(b=>b.classList.toggle("active",b.dataset.drawMode===mode));
}
window.setAdminDrawMode=setAdminDrawMode;

async function submitManualDraw(){
  const order=[...document.querySelectorAll("[data-manual-slot]")].map(x=>x.value);
  if(order.some(v=>!v))return toast("Assign a team to every letter A–N.");
  if(new Set(order).size!==14)return toast("Each team must appear exactly once.");
  if(state.data.draw.completed&&!confirm("Replace the existing automatic/manual draw and all current match results with this manual draw?"))return;
  try{const out=await api("/api/admin/manual-draw",{method:"POST",body:JSON.stringify({team_order:order})});state.data=out.state;renderAll();renderPublicBoard();showPage("bracket");toast("Manual draw applied.")}
  catch(e){toast(e.message)}
}
window.submitManualDraw=submitManualDraw;

async function saveTeams(){
  const teams=[...document.querySelectorAll("[data-team-editor-row]")].map(row=>({
    id:row.dataset.teamId,name:row.querySelector("[data-team-name]").value.trim(),code:row.querySelector("[data-team-code]").value.trim().toUpperCase()
  }));
  if(teams.some(t=>!t.name||!t.code))return toast("Every team needs a name and internal code.");
  if(new Set(teams.map(t=>t.name.toLowerCase())).size!==14)return toast("Team names must be unique.");
  if(new Set(teams.map(t=>t.code)).size!==14)return toast("Internal codes must be unique.");
  try{const out=await api("/api/admin/teams",{method:"POST",body:JSON.stringify({teams})});state.data=out.state;renderAll();toast("Team list saved.")}
  catch(e){toast(e.message)}
}
window.saveTeams=saveTeams;

async function saveSettings(e){
  e.preventDefault();
  const payload={
    tournament_name:$("setName").value.trim(),venue:$("setVenue").value.trim(),date:$("setDate").value,
    start_time:$("setStart").value,first_half:Number($("setFirstHalf").value),halftime:Number($("setHalftime").value),
    second_half:Number($("setSecondHalf").value),changeover:Number($("setChangeover").value),
    final_recovery:Number($("setFinalRecovery").value),max_squad:Number($("setMaxSquad").value),
    grace_minutes:Number($("setGrace").value),rebuild_schedule:$("setRebuild").checked
  };
  try{const out=await api("/api/admin/settings",{method:"POST",body:JSON.stringify(payload)});state.data=out.state;renderAll();renderPublicBoard();toast("Tournament settings saved.")}
  catch(e){toast(e.message)}
}
async function saveLiveScore(no,status="Live"){
  const hs=Number($(`liveHome_${no}`).value),as=Number($(`liveAway_${no}`).value);
  try{const out=await api("/api/admin/live-score",{method:"POST",body:JSON.stringify({match_no:no,home_score:hs,away_score:as,status})});state.data=out.state;renderAll();renderPublicBoard();toast(status==="Live"?"Live score published.":"Match returned to scheduled.")}
  catch(e){toast(e.message)}
}
window.saveLiveScore=saveLiveScore;
function stepScore(id,delta){const el=$(id);el.value=Math.max(0,Number(el.value||0)+delta)}
window.stepScore=stepScore;

async function restartDraw(){
  const password=$("restartPassword").value;
  if(!password)return toast("Enter the admin password to restart the draw.");
  if(!confirm("Restart the draw? This clears the draw and every match score/result so you can test again."))return;
  try{
    const out=await api("/api/admin/restart-draw",{method:"POST",body:JSON.stringify({
      password,clear_players:$("restartPlayers").checked,clear_announcements:$("restartNotices").checked
    })});
    state.data=out.state;renderAll();renderPublicBoard();toast("Draw and match results cleared. Ready for a fresh test draw.");
  }catch(e){toast(e.message)}
}
window.restartDraw=restartDraw;

async function postNotice(e){
  e.preventDefault();try{const out=await api("/api/admin/announcement",{method:"POST",body:JSON.stringify({title:$("noticeTitle").value.trim(),body:$("noticeBody").value.trim()})});state.data=out.state;renderAll();toast("Announcement published.")}
  catch(e){toast(e.message)}
}

function renderAdmin(){
  if(state.role!=="admin"){$("adminPage").innerHTML="";return}
  const c=state.data.config,slots=manualDrawSlots();
  const playable=state.data.matches.filter(m=>m.home_team_id&&m.away_team_id&&!["Finished","Walkover"].includes(m.status));
  $("adminPage").innerHTML=`<div class="grid">
    <div class="card span-12"><div class="section-title"><div><div class="kicker">TOURNAMENT SETTINGS</div><h3>Date, venue & match timing</h3></div><span class="badge">Editable</span></div>
      <form id="settingsForm" class="settings-grid">
        <label class="wide">Tournament name<input id="setName" value="${esc(c.tournament_name)}"></label>
        <label class="wide">Venue<input id="setVenue" value="${esc(c.venue)}"></label>
        <label>Date<input id="setDate" type="date" value="${esc(c.date)}"></label>
        <label>Start time<input id="setStart" type="time" value="${esc(c.start_time)}"></label>
        <label>First half (min)<input id="setFirstHalf" type="number" min="1" value="${c.first_half}"></label>
        <label>Halftime (min)<input id="setHalftime" type="number" min="0" value="${c.halftime}"></label>
        <label>Second half (min)<input id="setSecondHalf" type="number" min="1" value="${c.second_half}"></label>
        <label>Changeover (min)<input id="setChangeover" type="number" min="0" value="${c.changeover}"></label>
        <label>Final recovery (min)<input id="setFinalRecovery" type="number" min="0" value="${c.final_recovery}"></label>
        <label>Max squad<input id="setMaxSquad" type="number" min="3" value="${c.max_squad}"></label>
        <label>Late grace (min)<input id="setGrace" type="number" min="0" value="${c.grace_minutes}"></label>
        <label class="wide check-row"><input id="setRebuild" type="checkbox" checked> Recalculate all match times if a draw already exists</label>
        <div class="wide"><button class="primary">Save tournament settings</button></div>
      </form>
    </div>

    <div class="card span-12"><div class="section-title"><div><div class="kicker">DRAW CONTROL</div><h3>Automatic or manual letter draw</h3></div><span class="badge ${state.data.draw.completed?"ok":""}">${state.data.draw.completed?"Draw exists":"Ready"}</span></div>
      <div class="draw-choice-tabs"><button class="secondary active" data-draw-mode="auto" onclick="setAdminDrawMode('auto')">Automatic animated draw</button><button class="secondary" data-draw-mode="manual" onclick="setAdminDrawMode('manual')">Manual / edit draw</button></div>
      <div id="autoDrawSection"><p class="muted">Randomly assigns A–N and shows the animated reveal. A and H go directly to quarterfinals.</p><div class="actions"><button id="startDrawBtn" class="primary">${state.data.draw.completed?"Run another automatic draw":"Start animated draw"}</button><button class="secondary" onclick="showPage('draw')">View current draw</button></div></div>
      <div id="manualDrawSection" class="hidden"><p class="muted">You can use this even after an automatic draw. Current assignments are pre-selected; change only the letters you need, making sure every team appears once.</p>
        <div class="manual-draw-grid">${slots.map((s,i)=>`<div class="manual-slot"><div class="kicker">LETTER ${s.letter} · ${s.label}</div><select data-manual-slot="${s.letter}">${teamOptions(currentTeamForLetter(s.letter))}</select></div>`).join("")}</div>
        <div class="actions" style="margin-top:14px"><button class="primary" onclick="submitManualDraw()">Apply manual letter draw</button></div>
      </div>
    </div>

    <div class="card span-12"><div class="section-title"><div><div class="kicker">LIVE MATCH CONTROL</div><h3>Publish score before login</h3></div><span class="badge">${playable.length} available</span></div>
      <p class="muted">Mark one match LIVE and update the score during play. Everyone sees it on the public board without logging in. When the match ends, use Final Result to advance the winner.</p>
      <div class="grid">${playable.map(m=>{const{h,a}=pair(m);return `<div class="live-control span-6"><div class="section-title"><div><div class="kicker">${m.match_no} · ${m.stage}</div><strong>${esc(h)} vs ${esc(a)}</strong></div><span class="badge ${m.status==="Live"?"live":""}">${m.status}</span></div>
        <div class="live-score-inputs">
          <label>${esc(h)}<div class="score-stepper"><button type="button" onclick="stepScore('liveHome_${m.match_no}',-1)">−</button><input id="liveHome_${m.match_no}" type="number" min="0" value="${m.home_score??0}"><button type="button" onclick="stepScore('liveHome_${m.match_no}',1)">+</button></div></label>
          <label>${esc(a)}<div class="score-stepper"><button type="button" onclick="stepScore('liveAway_${m.match_no}',-1)">−</button><input id="liveAway_${m.match_no}" type="number" min="0" value="${m.away_score??0}"><button type="button" onclick="stepScore('liveAway_${m.match_no}',1)">+</button></div></label>
        </div>
        <div class="live-actions"><button class="primary" onclick="saveLiveScore('${m.match_no}','Live')">${m.status==="Live"?"Update live score":"Start LIVE"}</button><button class="secondary" onclick="saveLiveScore('${m.match_no}','Scheduled')">Stop live</button><button class="secondary" onclick="enterResult('${m.match_no}')">Final result</button></div>
      </div>`}).join("")||`<div class="notice span-12">Run the draw first, or all available matches have been completed.</div>`}</div>
    </div>

    <div class="card span-12"><div class="section-title"><h3>All match results</h3><span class="badge">${state.data.matches.length}/13</span></div><div class="table-wrap"><table><thead><tr><th>Match</th><th>Stage</th><th>Time</th><th>Home</th><th>Score</th><th>Away</th><th>Status</th><th></th></tr></thead><tbody>
      ${state.data.matches.map(m=>{const{h,a}=pair(m);return `<tr><td><b>${m.match_no}</b></td><td>${m.stage}</td><td>${m.start_time}</td><td>${esc(h)}</td><td>${m.home_score==null?"—":`${m.home_score}-${m.away_score}`}</td><td>${esc(a)}</td><td>${m.status}</td><td>${m.home_team_id&&m.away_team_id?`<button class="secondary" onclick="enterResult('${m.match_no}')">Update final</button>`:""}</td></tr>`}).join("")||`<tr><td colspan="8" class="muted">Run the draw first.</td></tr>`}
    </tbody></table></div></div>

    <div class="card span-12"><div class="section-title"><div><div class="kicker">TEAM MANAGER</div><h3>Edit the 14 teams</h3></div><span class="badge">14 slots</span></div><div class="team-editor">
      ${state.data.teams.map((t,i)=>`<div class="team-editor-row" data-team-editor-row data-team-id="${esc(t.id)}"><div class="team-number">${i+1}</div><label>Team name<input data-team-name value="${esc(t.name)}"></label><label class="team-code-field">Internal code<input data-team-code value="${esc(t.code||"TEAM"+(i+1))}"></label></div>`).join("")}
      </div><div class="actions" style="margin-top:14px"><button class="primary" onclick="saveTeams()">Save team list</button></div>
    </div>

    <div class="card span-6"><h3>Post announcement</h3><form id="noticeForm" class="admin-grid"><label class="wide">Title<input id="noticeTitle" required></label><label class="wide">Message<textarea id="noticeBody" required></textarea></label><div class="wide"><button class="primary">Publish</button></div></form></div>
    <div class="card span-6"><div class="restart-box"><div class="kicker">TESTING / RESTART</div><h3>Password-protected restart draw</h3><p class="muted">Clears the draw and every match score/result, but keeps your team names and tournament settings. Use this after test draws.</p><label>Admin password<input id="restartPassword" type="password" placeholder="Enter admin password"></label><label class="check-row"><input id="restartPlayers" type="checkbox"> Also clear registered test players</label><label class="check-row"><input id="restartNotices" type="checkbox"> Also clear announcements</label><div class="actions" style="margin-top:12px"><button class="danger" onclick="restartDraw()">Restart draw & clear results</button></div></div></div>
  </div>`;
  $("startDrawBtn")?.addEventListener("click",startDraw);
  $("settingsForm")?.addEventListener("submit",saveSettings);
  $("noticeForm")?.addEventListener("submit",postNotice);
}
function renderAll(){if(!state.data)return;renderHome();renderDraw();renderBracket();renderMatches();renderTeam();renderGuide();renderRules();renderNotices();renderAdmin()}

(async()=>{
  await refreshPublicOnly();
  clearInterval(state.publicTimer);state.publicTimer=setInterval(()=>{if(!state.role)refreshPublicOnly()},4000);
  if(state.player){state.role="player";try{await enterApp()}catch{state.role=null}}
})();
