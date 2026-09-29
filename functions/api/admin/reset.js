import { json, isAdmin, getState } from "../../_utils.js";
export async function onRequestPost(context) {
  if (!(await isAdmin(context.request,context.env))) return json({error:"Unauthorized"},401);
  try {
    const DB=context.env.DB;
    await DB.batch([
      DB.prepare("DELETE FROM matches"),
      DB.prepare("DELETE FROM players"),
      DB.prepare("DELETE FROM announcements"),
      DB.prepare("INSERT INTO meta(key,value) VALUES('draw_completed','0') ON CONFLICT(key) DO UPDATE SET value=excluded.value"),
      DB.prepare("INSERT INTO meta(key,value) VALUES('draw_sequence','[]') ON CONFLICT(key) DO UPDATE SET value=excluded.value"),
      DB.prepare("DELETE FROM meta WHERE key IN ('bye_a','bye_b','round2_bye_source')")
    ]);
    return json({ok:true,state:await getState(DB,true)});
  } catch(e) { return json({error:e.message},500); }
}
