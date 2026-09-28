const state={data:null,role:null,player:JSON.parse(localStorage.getItem("futsal_player")||"null"),adminToken:sessionStorage.getItem("futsal_admin_token")||"",currentPage:"home",timer:null,drawAnimating:false};
const $=id=>document.getElementById(id);
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const toast=m=>{const e=$("toast");e.textContent=m;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2500)};
const teamById=id=>state.data?.teams?.find(t=>t.id===id);
const initials=n=>String(n||"P").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();

async function api(path,opt={}){
  const headers={"content-type":"application/json",...(opt.headers||{})};
  if(state.adminToken) headers.authorization=`Bearer ${state.adminToken}`;
  const r=await fetch(path,{...opt,headers,cache:"no-store"});
  const d=await r.json();
  if(!r.ok) throw new Error(d.error||"Request failed");
  return d;
}
async function refresh(){
  state.data=await api(state.role==="admin"?"/api/admin/state":"/api/state");
  if(state.role)renderAll();
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
    state.role="player";state.player={...out.player,draw_letter:out.draw_letter};localStorage.setItem("futsal_player",JSON.stringify(state.player));await enterApp();
  }catch(err){toast(err.message)}
});
$("adminLogin").addEventListener("submit",async e=>{
  e.preventDefault();
  try{
    const out=await api("/api/admin/login",{method:"POST",body:JSON.stringify({username:$("adminUsername").value,password:$("adminPassword").value})});
    state.adminToken=out.token;sessionStorage.setItem("futsal_admin_token",out.token);state.role="admin";await enterApp();
  }catch(err){toast(err.message)}
});
$("logoutBtn").addEventListener("click",()=>{
  clearInterval(state.timer);state.role=null;state.player=null;state.adminToken="";
  localStorage.removeItem("futsal_player");sessionStorage.removeItem("futsal_admin_token");
  $("appView").classList.add("hidden");$("loginView").classList.remove("hidden");
});
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));

async function enterApp(){
  await refresh();$("loginView").classList.add("hidden");$("appView").classList.remove("hidden");
  $("adminNav").classList.toggle("hidden",state.role!=="admin");
  $("userBadge").textContent=state.role==="admin"?"Tournament Admin":`${state.player?.name||"Player"} · ${teamById(state.player?.team_id)?.name||""}`;
  showPage("home");clearInterval(state.timer);state.timer=setInterval(()=>{if(!state.drawAnimating)refresh().catch(()=>{})},4000);
}
function showPage(n){state.currentPage=n;document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===n));$(`${n}Page`).classList.remove("hidden");$("pageTitle").textContent=n[0].toUpperCase()+n.slice(1);renderAll()}
window.showPage=showPage;

function pair(m){return{h:teamById(m.home_team_id)?.name||m.source_home||"TBD",a:teamById(m.away_team_id)?.name||m.source_away||"TBD"}}
function fixture(m){const{h,a}=pair(m);let c=m.start_time||"TBD";if(["Finished","Walkover"].includes(m.status)){c=`${m.home_score}-${m.away_score}`;if(m.home_penalties!=null)c+=`<div class="muted" style="font-size:11px">pens ${m.home_penalties}-${m.away_penalties}</div>`}return `<div class="fixture"><div><div class="kicker">${esc(m.match_no)} · ${esc(m.stage)}</div><strong>${esc(h)}</strong></div><div class="score">${c}</div><div class="right"><div class="kicker">${esc(m.court)}</div><strong>${esc(a)}</strong></div></div>`}
const myTeam=()=>state.role==="player"?state.player?.team_id:null;
const myMatches=()=>{const t=myTeam();return t?state.data.matches.filter(m=>m.home_team_id===t||m.away_team_id===t):[]};
const nextMatch=()=>myMatches().find(m=>!["Finished","Walkover"].includes(m.status));
const teamDrawLetter=(teamId)=>{
  const item=state.data?.draw?.sequence?.find(x=>x.team_id===teamId);
  return item?.letter||"—";
};


function renderHome(){const c=state.data.config,n=nextMatch(),t=teamById(myTeam());$("homePage").innerHTML=`<div class="grid">
<div class="card span-3"><div class="muted">Tournament</div><div class="stat">14 Teams</div><div class="kicker">13-match knockout</div></div>
<div class="card span-3"><div class="muted">Draw</div><div class="stat">${state.data.draw.completed?"Completed":"Pending"}</div><div class="kicker">2 random byes</div></div>
<div class="card span-3"><div class="muted">${state.role==="player"?"My draw letter":"Venue"}</div><div class="stat">${state.role==="player"?esc(teamDrawLetter(myTeam())):esc(c.venue)}</div><div class="kicker">${state.role==="player"?esc(t?.name||""):"Tournament venue"}</div></div>
<div class="card span-3"><div class="muted">${state.role==="player"?"Next match":"Start"}</div><div class="stat">${state.role==="player"?(n?.start_time||"—"):esc(c.start_time)}</div><div class="kicker">${state.role==="player"?(n?.match_no||"No match yet"):esc(c.date)}</div></div>
<div class="card span-8"><div class="section-title"><h3>${state.role==="player"?"Your tournament":"Tournament status"}</h3><button class="secondary" onclick="showPage('bracket')">Open bracket</button></div>${state.role==="player"?(n?fixture(n):`<div class="notice">${state.data.draw.completed?"No upcoming match assigned.":"The official draw has not started yet."}</div>`):`<div class="notice"><strong>${state.data.draw.completed?"Draw completed.":"Ready for the official draw."}</strong><br>${state.data.draw.completed?"Enter results as matches finish.":"Open Admin and start the animated draw."}</div>`}</div>
<div class="card span-4"><h3>Match format</h3><div class="row"><span>First half</span><b>${c.first_half} min</b></div><div class="row"><span>Halftime</span><b>${c.halftime} min</b></div><div class="row"><span>Second half</span><b>${c.second_half} min</b></div><div class="row"><span>Changeover</span><b>${c.changeover} min</b></div></div>
<div class="card span-12"><div class="section-title"><h3>Latest notices</h3><button class="secondary" onclick="showPage('notices')">All notices</button></div>${state.data.announcements.slice(0,3).map(a=>`<div class="row"><div><strong>${esc(a.title)}</strong><div class="muted">${esc(a.body)}</div></div></div>`).join("")||`<p class="muted">No announcements yet.</p>`}</div>
</div>`}

function renderDraw(){const d=state.data.draw;$("drawPage").innerHTML=`<div class="card"><div class="section-title"><div><div class="kicker">OFFICIAL LETTER DRAW</div><h3>Draw results A–N</h3></div><span class="badge ${d.completed?"ok":""}">${d.completed?"Completed":"Waiting"}</span></div>${!d.completed?`<div class="notice">The organizer has not run the draw yet. Players can log in using their team letter after the official draw is completed.</div>`:`<div class="draw-history">${d.sequence.map(x=>`<div class="draw-item"><span class="kicker">LETTER ${esc(x.letter)} · ${esc(x.slot)}</span><strong>${esc(x.team_name)}</strong></div>`).join("")}</div>`}</div>`}
function bracketCard(m){if(!m)return `<div class="match-card"><div class="match-meta"><span>TBD</span><span>Pending</span></div><div class="match-team"><span>TBD</span><b>—</b></div><div class="match-team"><span>TBD</span><b>—</b></div></div>`;const{h,a}=pair(m),hw=m.winner_team_id===m.home_team_id,aw=m.winner_team_id===m.away_team_id;return `<div class="match-card"><div class="match-meta"><span>${esc(m.match_no)}</span><span>${esc(m.start_time)}</span></div><div class="match-team ${hw?"winner":""}"><span>${esc(h)}</span><b>${m.home_score??"—"}</b></div><div class="match-team ${aw?"winner":""}"><span>${esc(a)}</span><b>${m.away_score??"—"}</b></div></div>`}
function renderBracket(){const s=x=>state.data.matches.filter(m=>m.stage===x),r=s("Round 1"),q=s("Quarterfinal"),sf=s("Semifinal"),f=s("Final");$("bracketPage").innerHTML=`<div class="card"><div class="section-title"><h3>Knockout bracket</h3><span class="badge">${state.data.draw.completed?"Live":"Awaiting draw"}</span></div><div class="bracket-wrap"><div class="bracket"><div><div class="round-title">Round 1</div><div class="round">${Array.from({length:6},(_,i)=>bracketCard(r[i])).join("")}</div></div><div><div class="round-title">Quarterfinals</div><div class="round qf">${Array.from({length:4},(_,i)=>bracketCard(q[i])).join("")}</div></div><div><div class="round-title">Semifinals</div><div class="round sf">${Array.from({length:2},(_,i)=>bracketCard(sf[i])).join("")}</div></div><div><div class="round-title">Final</div><div class="round final">${bracketCard(f[0])}</div></div></div></div></div>`}
function renderMatches(){const stages=["Round 1","Quarterfinal","Semifinal","Final"];$("matchesPage").innerHTML=state.data.matches.length?stages.map(s=>{const ms=state.data.matches.filter(m=>m.stage===s);return `<div class="card"><div class="section-title"><h3>${s}</h3><span class="badge">${ms.length}</span></div>${ms.map(fixture).join("")}</div>`}).join(""):`<div class="card"><div class="notice">Matches will appear after the draw.</div></div>`}
function renderTeam(){if(state.role!=="player"){$("teamPage").innerHTML=`<div class="card"><h3>Registered players</h3>${state.data.teams.map(t=>{const ps=state.data.players.filter(p=>p.team_id===t.id);return `<div class="row"><div><strong>${esc(t.name)}</strong><div class="muted">${ps.map(p=>esc(p.name)).join(", ")||"No players registered"}</div></div><span class="badge">${ps.length}/${state.data.config.max_squad}</span></div>`}).join("")}</div>`;return}const t=teamById(state.player.team_id),ps=state.data.players.filter(p=>p.team_id===state.player.team_id);$("teamPage").innerHTML=`<div class="grid"><div class="card span-5"><div class="kicker">MY TEAM</div><h3>${esc(t?.name)}</h3>${ps.map(p=>`<div class="row"><div class="person"><div class="avatar">${esc(initials(p.name))}</div><div><strong>${esc(p.name)}</strong><div class="muted">${esc(p.position||"Player")}</div></div></div><b>#${esc(p.shirt_no||"—")}</b></div>`).join("")}</div><div class="card span-7"><h3>Team matches</h3>${myMatches().length?myMatches().map(fixture).join(""):`<p class="muted">Matches appear after the draw.</p>`}</div></div>`}

function renderGuide(){
  const c=state.data.config;
  const letterRows=[
    ["A","Direct to QF1"],
    ["B","M1 · Team 1"],["C","M1 · Team 2"],
    ["D","M2 · Team 1"],["E","M2 · Team 2"],
    ["F","M3 · Team 1"],["G","M3 · Team 2"],
    ["H","Direct to QF3"],
    ["I","M4 · Team 1"],["J","M4 · Team 2"],
    ["K","M5 · Team 1"],["L","M5 · Team 2"],
    ["M","M6 · Team 1"],["N","M6 · Team 2"]
  ];

  $("guidePage").innerHTML=`
    <div class="card">
      <div class="kicker">ONE-PAGE TOURNAMENT GUIDE</div>
      <h3>How the 3v3 tournament works</h3>
      <p class="muted">There are 14 teams in a single-elimination knockout. Every team receives one draw letter from A to N. Your letter tells you exactly where your team enters the bracket.</p>

      <div class="rule-grid">
        <div class="rule"><strong>14 teams</strong><span class="muted">Single-elimination tournament with 13 total matches.</span></div>
        <div class="rule"><strong>Letters A–N</strong><span class="muted">Every team gets one unique letter during the official draw.</span></div>
        <div class="rule"><strong>A and H</strong><span class="muted">These two letters go directly to the quarterfinals.</span></div>
        <div class="rule"><strong>All other letters</strong><span class="muted">Play one of the six Round 1 matches.</span></div>
      </div>
    </div>

    <div class="card">
      <div class="section-title"><h3>Letter → bracket position</h3><span class="badge">A–N</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Letter</th><th>Position</th><th>Meaning</th></tr></thead>
          <tbody>
            ${letterRows.map(([l,p])=>`<tr><td><b style="font-size:20px">${l}</b></td><td>${p}</td><td>${l==="A"||l==="H"?"Direct quarterfinal entry":"Round 1 position"}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h3>Knockout structure</h3>
      <div class="notice">
        <b>A</b> → QF1 vs Winner of B/C<br>
        <b>D/E</b> → M2 and <b>F/G</b> → M3 → winners meet in QF2<br><br>
        <b>H</b> → QF3 vs Winner of I/J<br>
        <b>K/L</b> → M5 and <b>M/N</b> → M6 → winners meet in QF4<br><br>
        QF1 winner vs QF2 winner → SF1<br>
        QF3 winner vs QF4 winner → SF2<br>
        SF1 winner vs SF2 winner → Final
      </div>
    </div>

    <div class="card">
      <h3>Match timing</h3>
      <div class="rule-grid">
        <div class="rule"><strong>${c.first_half} minutes</strong><span class="muted">First half</span></div>
        <div class="rule"><strong>${c.halftime} minutes</strong><span class="muted">Halftime</span></div>
        <div class="rule"><strong>${c.second_half} minutes</strong><span class="muted">Second half</span></div>
        <div class="rule"><strong>${c.changeover} minutes</strong><span class="muted">Changeover before the next scheduled match</span></div>
      </div>
      <p class="muted">If a knockout match is tied, there is no extra time: 3 penalties each, then sudden death if required.</p>
    </div>

    <div class="card">
      <h3>How players use this website</h3>
      <div class="list">
        <div class="row"><span>1. Official draw happens</span><b>Team receives A–N</b></div>
        <div class="row"><span>2. Open this website</span><b>Select Player</b></div>
        <div class="row"><span>3. Enter your name</span><b>Choose team draw letter</b></div>
        <div class="row"><span>4. Login</span><b>See your team & next match</b></div>
        <div class="row"><span>5. During tournament</span><b>Bracket/results update live</b></div>
      </div>
      <div class="notice" style="margin-top:12px"><strong>Important:</strong> Player login using a draw letter becomes available only after the official draw has been completed.</div>
    </div>
  `;
}

function renderRules(){const c=state.data.config,r=[["Players",`3 on court. Maximum squad ${c.max_squad}.`],["Match time",`${c.first_half} min first half, ${c.halftime} min halftime, ${c.second_half} min second half.`],["Substitutions","Unlimited rolling substitutions."],["Offside","No offside."],["Restart","Kick-ins instead of throw-ins."],["Sliding tackles","Not allowed."],["Drawn match","No extra time. 3 penalties each, then sudden death."],["Late team",`${c.grace_minutes}-minute grace period, then organizer may award a 3-0 walkover.`],["Cards","Second yellow = red. Serious misconduct may lead to removal."],["Referee","Referee decisions during play are final."]];$("rulesPage").innerHTML=`<div class="card"><h3>Tournament rules</h3><div class="rule-grid">${r.map(([a,b])=>`<div class="rule"><strong>${a}</strong><span class="muted">${b}</span></div>`).join("")}</div></div>`}
function renderNotices(){$("noticesPage").innerHTML=`<div class="card"><div class="section-title"><h3>Announcements</h3><span class="badge">${state.data.announcements.length}</span></div>${state.data.announcements.map(a=>`<div class="row"><div><strong>${esc(a.title)}</strong><div class="muted">${esc(a.body)}</div><div class="kicker">${esc(a.created_at)}</div></div></div>`).join("")||`<p class="muted">No announcements yet.</p>`}</div>`}

async function startDraw(){if(state.data.draw.completed&&!confirm("Run a completely new draw? Existing results will be replaced."))return;try{const out=await api("/api/admin/draw",{method:"POST",body:"{}"});state.data=out.state;state.drawAnimating=true;const o=$("drawOverlay"),roll=$("rollingName"),rev=$("revealedName"),slot=$("drawSlotLabel"),count=$("drawCounter"),bar=$("drawProgressBar");o.classList.remove("hidden");const names=state.data.teams.map(t=>t.name);for(let i=0;i<out.sequence.length;i++){const item=out.sequence[i];slot.textContent=`LETTER ${item.letter} · ${item.slot}`;rev.textContent="";const r=setInterval(()=>roll.textContent=names[Math.floor(Math.random()*names.length)],80);await new Promise(x=>setTimeout(x,750));clearInterval(r);roll.textContent="DRAWN";rev.textContent=item.team_name;rev.classList.remove("pop");void rev.offsetWidth;rev.classList.add("pop");count.textContent=`${i+1} / ${out.sequence.length}`;bar.style.width=`${((i+1)/out.sequence.length)*100}%`;await new Promise(x=>setTimeout(x,820))}slot.textContent="DRAW COMPLETE";roll.textContent="Bracket generated";await new Promise(x=>setTimeout(x,900));o.classList.add("hidden");state.drawAnimating=false;renderAll();showPage("draw")}catch(e){state.drawAnimating=false;$("drawOverlay").classList.add("hidden");toast(e.message)}}
async function enterResult(no){const m=state.data.matches.find(x=>x.match_no===no);if(!m?.home_team_id||!m?.away_team_id)return toast("Both teams must be known first.");const{h,a}=pair(m),hs=prompt(`${h} score:`);if(hs===null)return;const as=prompt(`${a} score:`);if(as===null)return;let hp=null,ap=null;if(Number(hs)===Number(as)){hp=prompt(`${h} penalties:`);if(hp===null)return;ap=prompt(`${a} penalties:`);if(ap===null)return}try{const out=await api("/api/admin/result",{method:"POST",body:JSON.stringify({match_no:no,home_score:Number(hs),away_score:Number(as),home_penalties:hp===null?null:Number(hp),away_penalties:ap===null?null:Number(ap)})});state.data=out.state;renderAll();toast("Result saved. Winner advanced.")}catch(e){toast(e.message)}}
window.enterResult=enterResult;
async function postNotice(e){e.preventDefault();try{const out=await api("/api/admin/announcement",{method:"POST",body:JSON.stringify({title:$("noticeTitle").value.trim(),body:$("noticeBody").value.trim()})});state.data=out.state;renderAll();toast("Announcement published.")}catch(e){toast(e.message)}}
async function resetAll(){if(!confirm("Reset draw, results, players and announcements?"))return;try{const out=await api("/api/admin/reset",{method:"POST",body:"{}"});state.data=out.state;renderAll();toast("Tournament reset.")}catch(e){toast(e.message)}}

function manualDrawSlots(){
  return [
    {label:"Letter A · Direct QF1", key:"A"},
    {label:"Letter B · M1 Team 1", key:"B"},
    {label:"Letter C · M1 Team 2", key:"C"},
    {label:"Letter D · M2 Team 1", key:"D"},
    {label:"Letter E · M2 Team 2", key:"E"},
    {label:"Letter F · M3 Team 1", key:"F"},
    {label:"Letter G · M3 Team 2", key:"G"},
    {label:"Letter H · Direct QF3", key:"H"},
    {label:"Letter I · M4 Team 1", key:"I"},
    {label:"Letter J · M4 Team 2", key:"J"},
    {label:"Letter K · M5 Team 1", key:"K"},
    {label:"Letter L · M5 Team 2", key:"L"},
    {label:"Letter M · M6 Team 1", key:"M"},
    {label:"Letter N · M6 Team 2", key:"N"}
  ];
}

function teamOptions(selected=""){
  return `<option value="">Select team...</option>` + state.data.teams.map(t =>
    `<option value="${esc(t.id)}" ${selected===t.id?"selected":""}>${esc(t.name)}</option>`
  ).join("");
}

function setAdminDrawMode(mode){
  const auto = $("autoDrawSection");
  const manual = $("manualDrawSection");
  if(!auto || !manual) return;
  auto.classList.toggle("hidden", mode!=="auto");
  manual.classList.toggle("hidden", mode!=="manual");
  document.querySelectorAll("[data-draw-mode]").forEach(b=>b.classList.toggle("active",b.dataset.drawMode===mode));
}
window.setAdminDrawMode=setAdminDrawMode;

async function submitManualDraw(){
  const selects=[...document.querySelectorAll("[data-manual-slot]")];
  const order=selects.map(s=>s.value);
  if(order.some(v=>!v)) return toast("Select a team for every manual draw position.");
  if(new Set(order).size!==14) return toast("Each team must be selected exactly once.");
  if(state.data.draw.completed && !confirm("Replace the existing draw with this manual draw?")) return;

  try{
    const out=await api("/api/admin/manual-draw",{method:"POST",body:JSON.stringify({team_order:order})});
    state.data=out.state;
    renderAll();
    showPage("bracket");
    toast("Manual draw saved and bracket generated.");
  }catch(e){toast(e.message)}
}
window.submitManualDraw=submitManualDraw;

async function saveTeams(){
  const rows=[...document.querySelectorAll("[data-team-editor-row]")];
  const teams=rows.map(row=>({
    id:row.dataset.teamId,
    name:row.querySelector("[data-team-name]").value.trim(),
    code:row.querySelector("[data-team-code]").value.trim().toUpperCase()
  }));

  if(teams.some(t=>!t.name||!t.code)) return toast("Every team needs a name and login code.");
  if(new Set(teams.map(t=>t.name.toLowerCase())).size!==14) return toast("Team names must be unique.");
  if(new Set(teams.map(t=>t.code)).size!==14) return toast("Team codes must be unique.");

  if(state.data.draw.completed && !confirm("Changing team names after a draw may make the existing bracket confusing. Save anyway?")) return;

  try{
    const out=await api("/api/admin/teams",{method:"POST",body:JSON.stringify({teams})});
    state.data=out.state;
    renderAll();
    toast("Team list saved.");
  }catch(e){toast(e.message)}
}
window.saveTeams=saveTeams;

function renderAdmin(){
  if(state.role!=="admin"){
    $("adminPage").innerHTML="";
    return;
  }

  const manualSlots=manualDrawSlots();

  $("adminPage").innerHTML=`
  <div class="grid">

    <div class="card span-12">
      <div class="section-title">
        <div>
          <div class="kicker">DRAW CONTROL</div>
          <h3>Tournament draw</h3>
        </div>
        <span class="badge ${state.data.draw.completed?"ok":""}">
          ${state.data.draw.completed?"Completed":"Ready"}
        </span>
      </div>

      <div class="draw-choice-tabs">
        <button class="secondary active" data-draw-mode="auto" onclick="setAdminDrawMode('auto')">Automatic animated draw</button>
        <button class="secondary" data-draw-mode="manual" onclick="setAdminDrawMode('manual')">Manual draw</button>
      </div>

      <div id="autoDrawSection">
        <p class="muted">
          The system randomly assigns one unique letter A–N to every team and reveals the letter assignments one by one.
        </p>
        <div class="actions">
          <button id="startDrawBtn" class="primary">${state.data.draw.completed?"Run new animated draw":"Start animated draw"}</button>
          <button class="secondary" onclick="showPage('bracket')">View bracket</button>
        </div>
      </div>

      <div id="manualDrawSection" class="hidden">
        <p class="muted">
          Choose which team receives each letter A–N. Every team must be used exactly once.
        </p>
        <div class="manual-draw-grid">
          ${manualSlots.map((s,i)=>`
            <div class="manual-slot">
              <div class="kicker">Position ${i+1}</div>
              <label>${esc(s.label)}
                <select data-manual-slot="${esc(s.key)}">${teamOptions()}</select>
              </label>
            </div>
          `).join("")}
        </div>
        <div class="actions" style="margin-top:14px">
          <button class="primary" onclick="submitManualDraw()">Save letter draw & generate bracket</button>
          <button class="secondary" onclick="showPage('bracket')">View bracket</button>
        </div>
      </div>
    </div>

    <div class="card span-12">
      <div class="section-title">
        <div>
          <div class="kicker">TEAM MANAGER</div>
          <h3>Enter / edit the 14 teams</h3>
        </div>
        <span class="badge">14 slots</span>
      </div>
      <p class="muted">
        Edit team names and their private player login codes. This lets you reuse the same website for a future 14-team tournament.
      </p>

      <div class="team-editor">
        ${state.data.teams.map((t,i)=>`
          <div class="team-editor-row" data-team-editor-row data-team-id="${esc(t.id)}">
            <div class="team-number">${i+1}</div>
            <label>Team name
              <input data-team-name value="${esc(t.name)}" placeholder="Team ${i+1}">
            </label>
            <label class="team-code-field">Login code
              <input data-team-code value="${esc(t.code||"")}" placeholder="TEAM-${i+1}">
            </label>
          </div>
        `).join("")}
      </div>

      <div class="actions" style="margin-top:14px">
        <button class="primary" onclick="saveTeams()">Save team list</button>
      </div>
    </div>

    <div class="card span-12">
      <div class="section-title">
        <h3>Match results</h3>
        <span class="badge">${state.data.matches.length}/13</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Match</th><th>Stage</th><th>Time</th><th>Home</th><th>Score</th><th>Away</th><th></th></tr>
          </thead>
          <tbody>
            ${state.data.matches.map(m=>{
              const{h,a}=pair(m);
              return `<tr>
                <td><b>${m.match_no}</b></td>
                <td>${m.stage}</td>
                <td>${m.start_time}</td>
                <td>${esc(h)}</td>
                <td>${m.home_score==null?"—":`${m.home_score}-${m.away_score}`}</td>
                <td>${esc(a)}</td>
                <td><button class="secondary" onclick="enterResult('${m.match_no}')">Enter result</button></td>
              </tr>`;
            }).join("") || `<tr><td colspan="7" class="muted">Run automatic or manual draw first.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card span-6">
      <h3>Post announcement</h3>
      <form id="noticeForm" class="admin-grid">
        <label class="wide">Title<input id="noticeTitle" required></label>
        <label class="wide">Message<textarea id="noticeBody" required></textarea></label>
        <div class="wide"><button class="primary">Publish</button></div>
      </form>
    </div>

    <div class="card span-6">
      <h3>Team login codes</h3>
      <div class="list">
        ${state.data.teams.map(t=>`
          <div class="row">
            <span>${esc(t.name)}</span>
            <b>${esc(t.code||"")}</b>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="card span-12">
      <div class="section-title">
        <h3>Danger zone</h3>
        <button id="resetBtn" class="danger">Reset tournament</button>
      </div>
    </div>
  </div>`;

  $("startDrawBtn").addEventListener("click",startDraw);
  $("noticeForm").addEventListener("submit",postNotice);
  $("resetBtn").addEventListener("click",resetAll);
}
function renderAll(){if(!state.data)return;renderHome();renderDraw();renderBracket();renderMatches();renderTeam();renderGuide();renderRules();renderNotices();renderAdmin()}
(async()=>{try{await refresh();if(state.player){state.role="player";await enterApp()}}catch(e){toast("Site backend is not configured yet.")}})();
