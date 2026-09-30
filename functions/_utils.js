const enc = new TextEncoder();

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export async function body(request) {
  try { return await request.json(); }
  catch { return {}; }
}

function bytesToB64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

async function sign(text, secret) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name:"HMAC", hash:"SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(text));
  return bytesToB64url(new Uint8Array(sig));
}

export async function issueAdminToken(env) {
  if (!env.ADMIN_SECRET) throw new Error("ADMIN_SECRET is not configured");
  const payload = bytesToB64url(enc.encode(JSON.stringify({
    role:"admin",
    exp: Date.now() + 12 * 60 * 60 * 1000
  })));
  const signature = await sign(payload, env.ADMIN_SECRET);
  return `${payload}.${signature}`;
}

export async function isAdmin(request, env) {
  try {
    if (!env.ADMIN_SECRET) return false;
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) return false;
    const token = auth.slice(7);
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return false;
    const expected = await sign(payload, env.ADMIN_SECRET);
    if (signature !== expected) return false;
    const normalized = payload.replace(/-/g,"+").replace(/_/g,"/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const obj = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), c=>c.charCodeAt(0))));
    return obj.role === "admin" && Number(obj.exp) > Date.now();
  } catch {
    return false;
  }
}

export function randomId(prefix="id") {
  const a = new Uint32Array(3);
  crypto.getRandomValues(a);
  return `${prefix}_${[...a].map(x=>x.toString(16)).join("")}`;
}

export function shuffle(items) {
  const a = [...items];
  for (let i=a.length-1; i>0; i--) {
    const u = new Uint32Array(1);
    crypto.getRandomValues(u);
    const j = u[0] % (i+1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function minutes(t) {
  const [h,m] = t.slice(0,5).split(":").map(Number);
  return h*60+m;
}

export function hhmm(n) {
  n = ((n%1440)+1440)%1440;
  return `${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;
}

export async function ensureTournamentTeams(DB) {
  const q = await DB.prepare("SELECT id,name,code,sort_order FROM teams WHERE id IN ('t9','t15','t16')").all();
  const rows = q.results || [];
  const byId = Object.fromEntries(rows.map(r => [r.id, r]));

  // One-time repair for the current database state:
  // Wanted Cow (t9) was manually renamed to Precast SC before the 16th team was added.
  if (!byId.t16 && String(byId.t9?.name || "").trim().toLowerCase() === "precast sc") {
    await DB.batch([
      DB.prepare("UPDATE teams SET name='Wanted Cow', code='WTC-267', sort_order=9 WHERE id='t9'"),
      DB.prepare("INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t15','Kuda Adi','KDA-001',16)"),
      DB.prepare("INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t16','Precast SC','PSC-001',15)")
    ]);
    return;
  }

  await DB.batch([
    DB.prepare("INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t15','Kuda Adi','KDA-001',16)"),
    DB.prepare("INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t16','Precast SC','PSC-001',15)"),
    DB.prepare("UPDATE teams SET sort_order=16 WHERE id='t15' AND name='Kuda Adi'"),
    DB.prepare("UPDATE teams SET sort_order=15 WHERE id='t16' AND name='Precast SC'"),
    DB.prepare("UPDATE meta SET value='BOATYARD PISTON CUP 26' WHERE key='config_tournament_name' AND value='3v3 Futsal Championship'")
  ]);
}

export async function ensureTournamentPlayers(DB) {
  const version="piston-cup-roster-v1";
  const marker=await DB.prepare("SELECT value FROM meta WHERE key='roster_version'").first();
  if(marker?.value===version) return;

  const roster=[{"team_id":"t5","name":"Mannan","id":"roster_t5_01"},{"team_id":"t5","name":"Amdadul","id":"roster_t5_02"},{"team_id":"t5","name":"Nasir","id":"roster_t5_03"},{"team_id":"t5","name":"Absar","id":"roster_t5_04"},{"team_id":"t5","name":"Kayum","id":"roster_t5_05"},{"team_id":"t5","name":"Alamin","id":"roster_t5_06"},{"team_id":"t6","name":"Iyaz","id":"roster_t6_01"},{"team_id":"t6","name":"Kudey","id":"roster_t6_02"},{"team_id":"t6","name":"Miu","id":"roster_t6_03"},{"team_id":"t6","name":"Bash","id":"roster_t6_04"},{"team_id":"t6","name":"Rao","id":"roster_t6_05"},{"team_id":"t6","name":"Hammad","id":"roster_t6_06"},{"team_id":"t13","name":"Ghina","id":"roster_t13_01"},{"team_id":"t13","name":"Gaumy Nishan","id":"roster_t13_02"},{"team_id":"t13","name":"Azeem","id":"roster_t13_03"},{"team_id":"t13","name":"A. Rasheed","id":"roster_t13_04"},{"team_id":"t13","name":"Ibbe Waheed","id":"roster_t13_05"},{"team_id":"t13","name":"Ahu Nishan","id":"roster_t13_06"},{"team_id":"t4","name":"Moorthy","id":"roster_t4_01"},{"team_id":"t4","name":"Annadurai","id":"roster_t4_02"},{"team_id":"t4","name":"Manikandan","id":"roster_t4_03"},{"team_id":"t4","name":"Arjun Rai","id":"roster_t4_04"},{"team_id":"t4","name":"Sathish Kaliyan","id":"roster_t4_05"},{"team_id":"t4","name":"Alhasmi","id":"roster_t4_06"},{"team_id":"t1","name":"Nozrul","id":"roster_t1_01"},{"team_id":"t1","name":"Fahim","id":"roster_t1_02"},{"team_id":"t1","name":"Saidul Miah","id":"roster_t1_03"},{"team_id":"t1","name":"Alamgir Sarker","id":"roster_t1_04"},{"team_id":"t1","name":"Arman Molla","id":"roster_t1_05"},{"team_id":"t1","name":"M. Mansoor","id":"roster_t1_06"},{"team_id":"t7","name":"Zaain","id":"roster_t7_01"},{"team_id":"t7","name":"Jailam","id":"roster_t7_02"},{"team_id":"t7","name":"Naail","id":"roster_t7_03"},{"team_id":"t7","name":"Mohamed Hassaan","id":"roster_t7_04"},{"team_id":"t7","name":"Haarish","id":"roster_t7_05"},{"team_id":"t7","name":"Shiva Kumar","id":"roster_t7_06"},{"team_id":"t10","name":"Soharab","id":"roster_t10_01"},{"team_id":"t10","name":"Azmul Hosen","id":"roster_t10_02"},{"team_id":"t10","name":"Navedul Hasan","id":"roster_t10_03"},{"team_id":"t10","name":"MD Reyaz","id":"roster_t10_04"},{"team_id":"t10","name":"Siam Miah","id":"roster_t10_05"},{"team_id":"t10","name":"Adam Fazeeh","id":"roster_t10_06"},{"team_id":"t16","name":"Ahmed Shareef","id":"roster_t16_01"},{"team_id":"t16","name":"Ayash Faiz","id":"roster_t16_02"},{"team_id":"t16","name":"Ismail Adhuham","id":"roster_t16_03"},{"team_id":"t16","name":"Krishan","id":"roster_t16_04"},{"team_id":"t16","name":"Rahim","id":"roster_t16_05"},{"team_id":"t16","name":"Aboobakuru","id":"roster_t16_06"},{"team_id":"t3","name":"Welding Ibbe","id":"roster_t3_01"},{"team_id":"t3","name":"Aflah","id":"roster_t3_02"},{"team_id":"t3","name":"Muatte","id":"roster_t3_03"},{"team_id":"t3","name":"Ammi","id":"roster_t3_04"},{"team_id":"t3","name":"Abdulla Ibrahim","id":"roster_t3_05"},{"team_id":"t3","name":"Mahfuz","id":"roster_t3_06"},{"team_id":"t11","name":"Naseembe","id":"roster_t11_01"},{"team_id":"t11","name":"Arif","id":"roster_t11_02"},{"team_id":"t11","name":"Abser","id":"roster_t11_03"},{"team_id":"t11","name":"Rakib","id":"roster_t11_04"},{"team_id":"t11","name":"Maahil","id":"roster_t11_05"},{"team_id":"t11","name":"Ranjan","id":"roster_t11_06"},{"team_id":"t12","name":"Ariful","id":"roster_t12_01"},{"team_id":"t12","name":"Aluddin","id":"roster_t12_02"},{"team_id":"t12","name":"Maksud","id":"roster_t12_03"},{"team_id":"t12","name":"Junaid","id":"roster_t12_04"},{"team_id":"t12","name":"Giasuddin","id":"roster_t12_05"},{"team_id":"t12","name":"Ali Ahmed","id":"roster_t12_06"},{"team_id":"t2","name":"Anbara","id":"roster_t2_01"},{"team_id":"t2","name":"Libin","id":"roster_t2_02"},{"team_id":"t2","name":"Rajkumar","id":"roster_t2_03"},{"team_id":"t2","name":"Rajeshkumar","id":"roster_t2_04"},{"team_id":"t2","name":"Kamarasu","id":"roster_t2_05"},{"team_id":"t2","name":"Fauzaan","id":"roster_t2_06"},{"team_id":"t8","name":"Abbe","id":"roster_t8_01"},{"team_id":"t8","name":"Umar","id":"roster_t8_02"},{"team_id":"t8","name":"Alyaan","id":"roster_t8_03"},{"team_id":"t8","name":"Momo","id":"roster_t8_04"},{"team_id":"t8","name":"Nizar","id":"roster_t8_05"},{"team_id":"t8","name":"Muaz","id":"roster_t8_06"},{"team_id":"t14","name":"Miruty","id":"roster_t14_01"},{"team_id":"t14","name":"Rayyan","id":"roster_t14_02"},{"team_id":"t14","name":"Ali Mafaaz","id":"roster_t14_03"},{"team_id":"t14","name":"Ibrahim Mohamed","id":"roster_t14_04"},{"team_id":"t14","name":"Ahmed Mohamed","id":"roster_t14_05"},{"team_id":"t14","name":"Jameela","id":"roster_t14_06"},{"team_id":"t9","name":"Ali Waheed","id":"roster_t9_01"},{"team_id":"t9","name":"Unais","id":"roster_t9_02"},{"team_id":"t9","name":"Areesh","id":"roster_t9_03"},{"team_id":"t9","name":"Inaad","id":"roster_t9_04"},{"team_id":"t9","name":"Maanu","id":"roster_t9_05"},{"team_id":"t9","name":"Aleembe","id":"roster_t9_06"},{"team_id":"t9","name":"Raaiz","id":"roster_t9_07"},{"team_id":"t9","name":"Luham","id":"roster_t9_08"},{"team_id":"t9","name":"Mausoora","id":"roster_t9_09"},{"team_id":"t9","name":"Thaanee","id":"roster_t9_10"},{"team_id":"t9","name":"Shiraany","id":"roster_t9_11"},{"team_id":"t15","name":"Haleem","id":"roster_t15_01"},{"team_id":"t15","name":"Manoon","id":"roster_t15_02"},{"team_id":"t15","name":"Rishwan","id":"roster_t15_03"},{"team_id":"t15","name":"Ali Waheed","id":"roster_t15_04"},{"team_id":"t15","name":"Hassan Hussain","id":"roster_t15_05"}];
  await DB.prepare("DELETE FROM players").run();

  const statements=roster.map(p=>
    DB.prepare("INSERT INTO players(id,name,team_id,shirt_no,position,created_at) VALUES(?,?,?,?,?,datetime('now'))")
      .bind(p.id,p.name,p.team_id,"","Player")
  );
  for(let i=0;i<statements.length;i+=40){
    await DB.batch(statements.slice(i,i+40));
  }

  await DB.prepare("INSERT INTO meta(key,value) VALUES('roster_version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    .bind(version).run();
}

export async function ensureMatchEvents(DB) {
  await DB.batch([
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS match_events (
        id TEXT PRIMARY KEY,
        match_no TEXT NOT NULL,
        event_type TEXT NOT NULL,
        team_id TEXT NOT NULL,
        player_id TEXT,
        minute INTEGER NOT NULL DEFAULT 0,
        second INTEGER NOT NULL DEFAULT 0,
        detail TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(match_no) REFERENCES matches(match_no) ON DELETE CASCADE,
        FOREIGN KEY(team_id) REFERENCES teams(id),
        FOREIGN KEY(player_id) REFERENCES players(id)
      )
    `),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_match_events_match ON match_events(match_no, created_at)")
  ]);
}

export async function getConfig(DB) {
  const rows = await DB.prepare("SELECT key,value FROM meta WHERE key LIKE 'config_%'").all();
  const map = Object.fromEntries((rows.results||[]).map(r=>[r.key,r.value]));
  return {
    tournament_name: map.config_tournament_name || "BOATYARD PISTON CUP 26",
    venue: map.config_venue || "Boatyard Futsal Area",
    date: map.config_date || "2026-10-01",
    start_time: map.config_start_time || "09:00",
    first_half: Number(map.config_first_half || 5),
    halftime: Number(map.config_halftime || 5),
    second_half: Number(map.config_second_half || 5),
    changeover: Number(map.config_changeover || 5),
    final_recovery: Number(map.config_final_recovery || 20),
    max_squad: Number(map.config_max_squad || 6),
    grace_minutes: Number(map.config_grace_minutes || 3),
    arrival_minutes: Number(map.config_arrival_minutes || 5)
  };
}

export async function getState(DB, includeCodes=false) {
  await ensureTournamentTeams(DB);
  await ensureTournamentPlayers(DB);
  await ensureMatchEvents(DB);
  const [teamsQ, playersQ, matchesQ, eventsQ, noticesQ, metaQ] = await Promise.all([
    DB.prepare(`SELECT id,name${includeCodes ? ",code" : ""} FROM teams ORDER BY sort_order`).all(),
    DB.prepare("SELECT id,name,team_id,shirt_no,position,created_at FROM players ORDER BY created_at").all(),
    DB.prepare("SELECT * FROM matches ORDER BY sort_order").all(),
    DB.prepare("SELECT id,match_no,event_type,team_id,player_id,minute,second,detail,created_at FROM match_events ORDER BY created_at, rowid").all(),
    DB.prepare("SELECT id,title,body,created_at FROM announcements ORDER BY created_at DESC").all(),
    DB.prepare("SELECT key,value FROM meta").all()
  ]);
  const meta = Object.fromEntries((metaQ.results||[]).map(r=>[r.key,r.value]));
  let sequence = [];
  try { sequence = JSON.parse(meta.draw_sequence || "[]"); } catch {}
  return {
    config: await getConfig(DB),
    teams: teamsQ.results || [],
    players: playersQ.results || [],
    matches: matchesQ.results || [],
    events: eventsQ.results || [],
    announcements: noticesQ.results || [],
    draw: {
      completed: meta.draw_completed === "1",
      sequence,
      bye_a: meta.bye_a || null,
      bye_b: meta.bye_b || null
    }
  };
}
