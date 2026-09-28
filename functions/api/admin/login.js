import { json, body, issueAdminToken } from "../../_utils.js";
export async function onRequestPost(context) {
  const data = await body(context.request);
  const expectedUser = context.env.ADMIN_USERNAME || "admin";
  const expectedPass = context.env.ADMIN_PASSWORD;
  if (!expectedPass) return json({error:"ADMIN_PASSWORD is not configured in Cloudflare"},500);
  if (data.username !== expectedUser || data.password !== expectedPass) return json({error:"Invalid username or password"},401);
  try { return json({ok:true,token:await issueAdminToken(context.env)}); }
  catch(e) { return json({error:e.message},500); }
}
