import { json, getState } from "../_utils.js";
export async function onRequestGet(context) {
  try { return json(await getState(context.env.DB, false)); }
  catch (e) { return json({error:e.message},500); }
}
