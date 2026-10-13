import { readFile, writeFile, chmod, mkdir } from "node:fs/promises";
import { randomInt, randomBytes } from "node:crypto";
import { parseEnv } from "node:util";
import path from "node:path";

// Values from the uploaded env are used only by this program, never printed.
// Run again deliberately to rotate all four PINs, then run the account setup.
const input = process.argv[2];
const target = path.resolve(".env.local");
let existing = "";
try { existing = await readFile(target, "utf8"); } catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const incoming = input ? parseEnv(await readFile(input, "utf8")) : {};
if (!(incoming.PIN_AUTH_SECRET || parseEnv(existing).PIN_AUTH_SECRET)?.trim()) {
  incoming.PIN_AUTH_SECRET = randomBytes(32).toString("hex");
  console.log("PIN_AUTH_SECRET dibuat otomatis dan tidak ditampilkan.");
}
const keys = ["PIN_GROUP_2", "PIN_GROUP_2_ELEMENT_1", "PIN_GROUP_2_ELEMENT_2", "PIN_GROUP_2_ELEMENT_3"];
const used = new Set();
for (const key of keys) {
  let pin;
  do { pin = randomInt(0, 100_000_000).toString().padStart(8, "0"); } while (used.has(pin));
  used.add(pin);
  incoming[key] = pin;
}
const replacements = new Map(Object.entries(incoming));
const lines = existing.split(/\r?\n/).filter((line) => {
  const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
  return !match || !replacements.has(match[1]);
});
const result = lines.join("\n").trimEnd() + "\n" + [...replacements].map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n") + "\n";
await writeFile(target, result, { mode: 0o600 });
await chmod(target, 0o600);
const config = parseEnv(result);
for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "PIN_AUTH_SECRET"]) {
  console.log(`${key}: ${config[key]?.trim() ? "terisi" : "belum diisi"}`);
}
await mkdir("private", { recursive: true });
console.log("Empat PIN unik tersimpan di .env.local:");
for (const key of keys) console.log(`${key}=${incoming[key]}`);
