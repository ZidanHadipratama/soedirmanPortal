import nextEnv from "@next/env";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
try {
  const hostname = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
  const match = hostname.match(/^([a-z0-9]+)\.supabase\.co$/);
  if (!match) throw new Error("URL proyek Supabase tidak valid.");
  const args = ["db", "push", "--linked", "--project-ref", match[1], "--skip-vault", "--yes", "--output-format", "json"];
  if (process.argv.includes("--dry-run")) args.push("--dry-run");
  const { stdout } = await promisify(execFile)("node_modules/.bin/supabase", args, { timeout: 60000, maxBuffer: 1_000_000 });
  const result = JSON.parse(stdout);
  console.log(process.argv.includes("--dry-run") ? "Dry run CLI Supabase berhasil." : "Migrasi CLI Supabase selesai.");
  console.log(result.upToDate ? "Database sudah sesuai migrasi lokal." : "Migrasi pilot Grup 2 diterapkan/diperiksa.");
} catch {
  console.error("Migrasi belum berhasil. Pastikan sesi CLI Supabase memiliki akses ke proyek tujuan. Tidak ada kredensial yang ditampilkan.");
  process.exitCode = 1;
}
