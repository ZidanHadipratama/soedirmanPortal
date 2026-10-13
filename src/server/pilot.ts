import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { pilotUnits, type PilotProfile, type PilotUnit } from "../pilot-model";

export class PilotError extends Error { constructor(message: string, public status = 400) { super(message); } }
export const cookieName = "soedirman-pilot-session";
export const pinKeys = ["PIN_GROUP_2", "PIN_GROUP_2_ELEMENT_1", "PIN_GROUP_2_ELEMENT_2", "PIN_GROUP_2_ELEMENT_3"] as const;
export function publicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new PilotError("Konfigurasi Supabase belum tersedia.", 503);
  return { url, key };
}
export function userClient(token?: string) {
  const { url, key } = publicConfig();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: token ? { headers: { Authorization: `Bearer ${token}` } } : {} });
}
export function adminClient() {
  const { url } = publicConfig();
  if (!process.env.SUPABASE_SECRET_KEY) throw new PilotError("Konfigurasi server belum tersedia.", 503);
  return createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function pinSecret() {
  const secret = process.env.PIN_AUTH_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) throw new PilotError("Rahasia autentikasi PIN belum siap.", 503);
  return secret;
}
export function credentials(unit: PilotUnit, pin: string) {
  return { email: `${unit}@pin.soedirman.invalid`, password: "Sd1_" + createHmac("sha256", pinSecret()).update(`${unit}:${pin}`).digest("hex") };
}
export function pinUnit(pin: string): PilotUnit | undefined {
  if (!/^\d{8}$/.test(pin)) return;
  const pins = pinKeys.map(key => process.env[key] || "");
  if (pins.some(p => !/^\d{8}$/.test(p)) || new Set(pins).size !== 4) throw new PilotError("Konfigurasi PIN belum siap.", 503);
  let matched: PilotUnit | undefined;
  pins.forEach((value, i) => { if (timingSafeEqual(Buffer.from(pin), Buffer.from(value))) matched = pilotUnits[i]; });
  return matched;
}
export async function requirePilot() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) throw new PilotError("Masuk dengan PIN terlebih dahulu.", 401);
  const client = userClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new PilotError("Sesi berakhir. Silakan masuk kembali.", 401);
  const profileResult = await client.from("attendance_profiles").select("*").eq("user_id", data.user.id).single();
  if (profileResult.error || !profileResult.data) throw new PilotError("Akses komandan belum disiapkan.", 403);
  const profile = profileResult.data as PilotProfile;
  if (!pilotUnits.includes(profile.unit) || profile.group_number !== 2) throw new PilotError("Akses Grup 2 diperlukan.", 403);
  return { client, token, profile };
}
export function sameOrigin(request: Request) {
  // Next dev can construct request.url with its 0.0.0.0 bind address.
  // The Host header identifies the public browser origin, including its port.
  try {
    const origin = new URL(request.headers.get("origin") || "");
    const url = new URL(request.url);
    const host = request.headers.get("host") || url.host;
    const protocol = process.env.VERCEL === "1" ? "https:" : url.protocol;
    if (origin.host === host && origin.protocol === protocol) return;
  } catch { /* Invalid and missing Origin are rejected. */ }
  throw new PilotError("Permintaan harus berasal dari aplikasi ini.", 403);
}
export function apiError(error: unknown) {
  return Response.json({ error: error instanceof PilotError ? error.message : "Layanan belum siap. Periksa migrasi dan konfigurasi Supabase." }, { status: error instanceof PilotError ? error.status : 503, headers: { "Cache-Control": "no-store" } });
}
export function checked<T>(result: { data: T; error: unknown }): NonNullable<T> {
  if (result.error || result.data == null) throw new PilotError("Data belum dapat diakses. Pastikan migrasi Supabase sudah diterapkan.", 503);
  return result.data as NonNullable<T>;
}
export async function requestBody(request: Request, maxLength = 65000) {
  const text = await request.text();
  if (text.length > maxLength) throw new PilotError("Permintaan terlalu besar.", 413);
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new PilotError("Permintaan tidak valid."); }
}
