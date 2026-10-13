import { cookies } from "next/headers";
import { createHmac } from "node:crypto";
import { adminClient, apiError, checked, cookieName, credentials, pinSecret, pinUnit, PilotError, publicConfig, requirePilot, requestBody, sameOrigin, userClient } from "../../../../src/server/pilot";
export const runtime = "nodejs";
export async function GET() {
  try {
    const { token, profile } = await requirePilot();
    return Response.json({ token, profile, config: publicConfig() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await requestBody(request, 1024);
    const ip = process.env.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for") || "vercel-pilot" : "local-pilot";
    const fingerprint = createHmac("sha256", pinSecret()).update(ip).digest("hex");
    const allowed = checked(await adminClient().rpc("consume_pin_attempt", { p_fingerprint: fingerprint }));
    if (!allowed) throw new PilotError("Terlalu banyak percobaan. Coba kembali dalam 10 menit.", 429);
    const unit = typeof body.pin === "string" ? pinUnit(body.pin) : undefined;
    if (!unit) throw new PilotError("PIN tidak sesuai.", 401);
    const { data, error } = await userClient().auth.signInWithPassword(credentials(unit, body.pin));
    if (error || !data.session) throw new PilotError("Akun PIN belum siap atau PIN tidak sesuai.", 401);
    const session = data.session;
    (await cookies()).set(cookieName, session.access_token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: session.expires_in });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const token = (await cookies()).get(cookieName)?.value;
    if (token) await adminClient().auth.admin.signOut(token, "local");
    (await cookies()).delete(cookieName);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
