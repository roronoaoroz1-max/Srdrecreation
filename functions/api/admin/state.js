import { json, getState, isAdmin } from "../../_utils.js";
export async function onRequestGet(context) {
  if (!(await isAdmin(context.request,context.env))) return json({error:"Unauthorized"},401);
  try { return json(await getState(context.env.DB,true)); }
  catch(e) { return json({error:e.message},500); }
}
