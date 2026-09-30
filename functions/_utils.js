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
  await DB.batch([
    DB.prepare("INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t15','Kuda Adi','KDA-001',15)"),
    DB.prepare("INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t16','Precast SC','PSC-001',16)")
  ]);
}

export async function getConfig(DB) {
  const rows = await DB.prepare("SELECT key,value FROM meta WHERE key LIKE 'config_%'").all();
  const map = Object.fromEntries((rows.results||[]).map(r=>[r.key,r.value]));
  return {
    tournament_name: map.config_tournament_name || "3v3 Futsal Championship",
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
  const [teamsQ, playersQ, matchesQ, noticesQ, metaQ] = await Promise.all([
    DB.prepare(`SELECT id,name${includeCodes ? ",code" : ""} FROM teams ORDER BY sort_order`).all(),
    DB.prepare("SELECT id,name,team_id,shirt_no,position,created_at FROM players ORDER BY created_at").all(),
    DB.prepare("SELECT * FROM matches ORDER BY sort_order").all(),
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
    announcements: noticesQ.results || [],
    draw: {
      completed: meta.draw_completed === "1",
      sequence,
      bye_a: meta.bye_a || null,
      bye_b: meta.bye_b || null
    }
  };
}
