import { json, body, isAdmin, getState } from "../../_utils.js";

export async function onRequestPost(context){
  if(!(await isAdmin(context.request,context.env))) return json({error:"Unauthorized"},401);
  try{
    const d=await body(context.request),DB=context.env.DB;
    const expected=context.env.ADMIN_PASSWORD;
    if(!expected) return json({error:"ADMIN_PASSWORD is not configured in Cloudflare"},500);
    if(String(d.password||"")!==expected) return json({error:"Incorrect admin password"},401);

    const q=[
      DB.prepare("DELETE FROM matches"),
      DB.prepare("INSERT INTO meta(key,value) VALUES('draw_completed','0') ON CONFLICT(key) DO UPDATE SET value=excluded.value"),
      DB.prepare("INSERT INTO meta(key,value) VALUES('draw_sequence','[]') ON CONFLICT(key) DO UPDATE SET value=excluded.value"),
      DB.prepare("DELETE FROM meta WHERE key IN ('bye_a','bye_b')")
    ];
    if(d.clear_players) q.push(DB.prepare("DELETE FROM players"));
    if(d.clear_announcements) q.push(DB.prepare("DELETE FROM announcements"));
    await DB.batch(q);
    return json({ok:true,state:await getState(DB,true)});
  }catch(e){return json({error:e.message},500)}
}
