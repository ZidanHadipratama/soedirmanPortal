import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });

async function main() {
  const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "PIN_AUTH_SECRET", "PIN_GROUP_2", "PIN_GROUP_2_ELEMENT_1", "PIN_GROUP_2_ELEMENT_2", "PIN_GROUP_2_ELEMENT_3"];
  for (const key of required) if (!process.env[key]) throw new Error(`Variabel ${key} belum diisi.`);
  if (!/^[a-f0-9]{64}$/i.test(process.env.PIN_AUTH_SECRET)) throw new Error("PIN_AUTH_SECRET harus 64 karakter hexadecimal.");
  const pins = required.slice(4).map(key => process.env[key]);
  if (pins.some(pin => !/^\d{8}$/.test(pin)) || new Set(pins).size !== 4) throw new Error("Empat PIN harus unik dan masing-masing delapan digit.");
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const check = await client.from("attendance_profiles").select("user_id").limit(1);
  if (check.error) throw new Error("Migrasi belum tersedia. Jalankan SQL di supabase/migrations sebelum setup akun.");
  const lines = (await readFile("private/group-2-members.csv", "utf8")).trim().split(/\r?\n/).slice(1);
  const members = lines.map(line => {
    const [number, name, group, element] = line.split(",");
    return { participant_number: Number(number), full_name: name, group_number: Number(group), element_number: Number(element) };
  });
  if (members.length !== 90 || new Set(members.map(m => m.participant_number)).size !== 90 || [1,2,3].some(e => members.filter(m => m.element_number === e).length !== 30)) throw new Error("Data roster tidak valid.");
  const commanders = JSON.parse(await readFile("private/group-2-commanders.json", "utf8"));
  const units = ["group-2", "group-2-element-1", "group-2-element-2", "group-2-element-3"];
  const memberResult = await client.from("attendance_members").upsert(members);
  if (memberResult.error) throw new Error("Impor anggota gagal.");
  const users = [];
  for (let page = 1; ; page++) {
    const result = await client.auth.admin.listUsers({ page, perPage: 100 });
    if (result.error) throw new Error("Tidak dapat membaca akun Supabase Auth.");
    users.push(...result.data.users);
    if (result.data.users.length < 100) break;
  }
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    const commander = commanders.find(c => i === 0 ? c.role === "dangroup" : c.role === "danelemen" && c.element_number === i);
    if (!commander || !members.some(m => m.participant_number === Number(commander.participant_number) && (i === 0 || m.element_number === i))) throw new Error("Pemetaan komandan tidak valid.");
    const email = `${unit}@pin.soedirman.invalid`;
    const password = "Sd1_" + createHmac("sha256", process.env.PIN_AUTH_SECRET).update(`${unit}:${pins[i]}`).digest("hex");
    const previous = users.find(u => u.email === email);
    const result = previous
      ? await client.auth.admin.updateUserById(previous.id, { password, email_confirm: true })
      : await client.auth.admin.createUser({ email, password, email_confirm: true });
    if (result.error || !result.data.user) throw new Error(`Penyiapan akun ${unit} gagal.`);
    const profileResult = await client.from("attendance_profiles").upsert({
      user_id: result.data.user.id, unit, role: commander.role, group_number: 2, element_number: i === 0 ? null : i,
      display_name: commander.full_name, participant_number: Number(commander.participant_number),
    }, { onConflict: "unit" });
    if (profileResult.error) throw new Error(`Penyiapan cakupan ${unit} gagal.`);
    console.log(`${unit}: akun dan cakupan siap`);
  }
  const groupResult = await client.from("attendance_groups").upsert({ group_number: 2, commander_name: commanders.find(c => c.role === "dangroup").full_name });
  if (groupResult.error) throw new Error("Penyiapan komandan grup gagal.");
  console.log("Pilot siap: 90 anggota, empat akun PIN. Tidak ada kredensial Supabase yang ditampilkan.");
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
