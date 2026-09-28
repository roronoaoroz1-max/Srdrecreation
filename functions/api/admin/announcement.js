import { json, body, isAdmin, randomId, getState } from "../../_utils.js";
export async function onRequestPost(context) {
  if (!(await isAdmin(context.request,context.env))) return json({error:"Unauthorized"},401);
  try {
    const d=await body(context.request);
    const title=String(d.title||"").trim(), msg=String(d.body||"").trim();
    if(!title||!msg) return json({error:"Title and message are required"},400);
    await context.env.DB.prepare(
      "INSERT INTO announcements(id,title,body,created_at) VALUES(?,?,?,datetime('now'))"
    ).bind(randomId("a"),title,msg).run();
    return json({ok:true,state:await getState(context.env.DB,true)});
  } catch(e) { return json({error:e.message},500); }
}
