import { json, body, isAdmin, getState } from "../../_utils.js";

export async function onRequestPost(context) {
  if (!(await isAdmin(context.request, context.env))) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const data = await body(context.request);
    const teams = Array.isArray(data.teams) ? data.teams : [];

    if (teams.length !== 16) {
      return json({ error: "Exactly 16 team entries are required" }, 400);
    }

    const names = teams.map(t => String(t.name || "").trim());
    const codes = teams.map(t => String(t.code || "").trim().toUpperCase());

    if (names.some(x => !x)) {
      return json({ error: "Every team must have a name" }, 400);
    }
    if (codes.some(x => !x)) {
      return json({ error: "Every team must have a login code" }, 400);
    }
    if (new Set(names.map(x => x.toLowerCase())).size !== 16) {
      return json({ error: "Team names must be unique" }, 400);
    }
    if (new Set(codes).size !== 16) {
      return json({ error: "Team login codes must be unique" }, 400);
    }

    const DB = context.env.DB;
    const statements = teams.map((t, i) =>
      DB.prepare("UPDATE teams SET name=?, code=?, sort_order=? WHERE id=?")
        .bind(names[i], codes[i], i + 1, String(t.id))
    );

    await DB.batch(statements);
    return json({ ok: true, state: await getState(DB, true) });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
