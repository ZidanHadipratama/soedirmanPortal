import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const base = process.env.PILOT_TEST_BASE_URL || "http://localhost:3001";
const pinKeys = ["PIN_GROUP_2", "PIN_GROUP_2_ELEMENT_1", "PIN_GROUP_2_ELEMENT_2", "PIN_GROUP_2_ELEMENT_3"];
const date = "2099-12-30";
const label = `uji-integrasi-${randomUUID().slice(0, 8)}`;
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const sessions = [];
const clients = [];
let testSession;
async function request(path, cookie, payload, method = payload ? "POST" : "GET") {
  const response = await fetch(base + path, {
    method, headers: { Origin: base, ...(cookie ? { Cookie: cookie } : {}), ...(payload ? { "Content-Type": "application/json" } : {}) },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  return { response, body: await response.json() };
}
async function main() {
  const health = await request("/api/health"); assert.equal(health.response.status, 200);
  const unauth = await request(`/api/pilot/attendance?date=${date}`); assert.equal(unauth.response.status, 401);
  for (let i = 0; i < pinKeys.length; i++) {
    const login = await request("/api/pilot/session", undefined, { pin: process.env[pinKeys[i]] });
    assert.equal(login.response.status, 200, "Login PIN harus berhasil");
    const cookie = login.response.headers.get("set-cookie").split(";")[0];
    assert.ok(login.response.headers.get("set-cookie").includes("HttpOnly"));
    const access = await request("/api/pilot/session", cookie); assert.equal(access.response.status, 200);
    const data = await request(`/api/pilot/attendance?date=${date}`, cookie); assert.equal(data.response.status, 200);
    assert.equal(data.body.members.length, i === 0 ? 90 : 30);
    sessions.push({ cookie, access: access.body, data: data.body });
    console.log(`${i === 0 ? "DanGrup" : `DanElemen ${i}`}: login berhasil, cakupan ${data.body.members.length} anggota`);
  }
  const groupClient = createClient(sessions[0].access.config.url, sessions[0].access.config.key, { auth: { persistSession: false, autoRefreshToken: false }, accessToken: async () => sessions[0].access.token });
  const otherClient = createClient(sessions[2].access.config.url, sessions[2].access.config.key, { auth: { persistSession: false, autoRefreshToken: false }, accessToken: async () => sessions[2].access.token });
  clients.push(groupClient, otherClient);
  await Promise.all([groupClient.realtime.setAuth(sessions[0].access.token), otherClient.realtime.setAuth(sessions[2].access.token)]);
  let groupEvents = 0, otherEvents = 0;
  const groupChannel = groupClient.channel(`verify-group-${label}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance_records" }, () => { groupEvents++; }).on("system", {}, event => { console.log("Realtime grup:", event.status, event.message); });
  const otherChannel = otherClient.channel(`verify-element-${label}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance_records" }, () => { otherEvents++; });
  const subscribe = channel => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Realtime belum tersambung")), 20000);
    channel.subscribe(status => {
      if (status === "SUBSCRIBED") { clearTimeout(timeout); resolve(); }
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { clearTimeout(timeout); reject(new Error("Realtime gagal tersambung")); }
    });
  });
  await Promise.all([subscribe(groupChannel), subscribe(otherChannel)]);
  const entries = sessions[1].data.members.map(m => ({ participant_number: m.participant_number, status: "Hadir", reason: "", revision: 0 }));
  entries[0].status = "Dinas Dalam";
  entries[0].reason = "Penugasan internal untuk sesi uji";
  entries[entries.length - 1].status = null;
  const payload = { date, kind: "insidental", label, time: "12:00", entries };
  const denied = await request("/api/pilot/attendance", sessions[0].cookie, payload); assert.equal(denied.response.status, 403);
  const saved = await request("/api/pilot/attendance", sessions[1].cookie, payload);
  assert.equal(saved.response.status, 200, "Penyimpanan DanElemen harus berhasil");
  testSession = saved.body.session_id;
  const start = Date.now();
  while (groupEvents < 30 && Date.now() - start < 15000) await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(groupEvents, 30, "DanGrup menerima pembaruan 30 anggota"); assert.equal(otherEvents, 0, "DanElemen lain tidak menerima catatan di luar elemennya");
  const monitored = await request(`/api/pilot/attendance?date=${date}`, sessions[0].cookie);
  assert.equal(monitored.body.records.filter(r => r.session_id === testSession).length, 30);
  assert.equal(monitored.body.records.find(r => r.session_id === testSession && r.participant_number === entries[0].participant_number).status, "Dinas Dalam");
  assert.equal(monitored.body.records.find(r => r.session_id === testSession && r.participant_number === entries[entries.length - 1].participant_number).status, null);
  const scopeCheck = await otherClient.from("attendance_records").select("*").eq("session_id", testSession);
  assert.ifError(scopeCheck.error); assert.equal(scopeCheck.data.length, 0);
  const stale = await request("/api/pilot/attendance", sessions[1].cookie, payload); assert.notEqual(stale.response.status, 200);
  const cross = await request("/api/pilot/attendance", sessions[1].cookie, { ...payload, entries: sessions[2].data.members.map(m => ({ participant_number: m.participant_number, status: "Hadir", reason: "", revision: 0 })) });
  assert.notEqual(cross.response.status, 200);
  console.log("API nyata: simpan atomik, DanGrup hanya baca, revisi lama dan anggota luar elemen ditolak.");
  console.log("Realtime nyata: DanGrup menerima 30 pembaruan, elemen lain menerima 0 catatan.");
}
try { await main(); }
catch (error) { console.error(error instanceof assert.AssertionError ? `${error.message} (actual: ${error.actual}, expected: ${error.expected})` : "Verifikasi integrasi gagal; kredensial tidak ditampilkan."); process.exitCode = 1; }
finally {
  // Only remove the uniquely named, future-dated session created by this script.
  if (!testSession) {
    const result = await admin.from("attendance_sessions").select("id").eq("date", date).eq("kind", "insidental").eq("label", label);
    if (!result.error && result.data.length === 1) testSession = result.data[0].id;
  }
  if (testSession) {
    const records = await admin.from("attendance_records").delete().eq("session_id", testSession);
    const session = !records.error && await admin.from("attendance_sessions").delete().eq("id", testSession).eq("date", date).eq("label", label);
    if (records.error || !session || session.error) { console.error("Pembersihan sesi uji belum berhasil."); process.exitCode = 1; }
    else console.log("Data sesi uji dibersihkan; tidak meninggalkan absensi contoh.");
  }
  for (const session of sessions) await request("/api/pilot/session", session.cookie, undefined, "DELETE").catch(() => {});
  for (const client of clients) await client.removeAllChannels();
}
