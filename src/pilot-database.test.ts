import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const db = new PGlite();
const authBootstrap = `create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;`;
const user = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
const entries = (element = 1, revision = 0) => Array.from({ length: 30 }, (_, n) => ({ participant_number: element * 100 + n + 1, status: "Hadir", reason: "", revision }));
async function asUser(i: number, fn: () => Promise<void>) {
  await db.exec(`begin; set local role authenticated; select set_config('request.jwt.claim.sub', '${user(i)}', true);`);
  try { await fn(); } finally { await db.exec("rollback"); }
}
async function save(rows: unknown = entries(), kind = "pagi", label = "") {
  return db.query<{ id: string }>("select public.save_element_attendance('2026-10-13', $1, $2, '06:00', $3::jsonb) as id", [kind, label, JSON.stringify(rows)]);
}
async function rejected(fn: () => Promise<unknown>, message: RegExp) {
  await db.exec("savepoint invalid_action");
  try { await expect(fn()).rejects.toThrow(message); } finally { await db.exec("rollback to savepoint invalid_action"); }
}
beforeAll(async () => {
  await db.exec(authBootstrap);
  await db.exec(await readFile("supabase/migrations/20261013113341_group_2_attendance.sql", "utf8"));
  await db.exec(await readFile("supabase/migrations/20261013120601_attendance_dinas_dalam.sql", "utf8"));
  await db.exec(await readFile("supabase/migrations/20261013121143_attendance_nullable_status.sql", "utf8"));
  for (let i = 1; i <= 4; i++) await db.query("insert into auth.users values ($1)", [user(i)]);
  for (let e = 1; e <= 3; e++) for (let n = 1; n <= 30; n++) await db.query("insert into attendance_members values ($1,$2,2,$3)", [e * 100 + n, `Anggota ${e}-${n}`, e]);
  for (let i = 1; i <= 4; i++) await db.query("insert into attendance_profiles values ($1,$2,$3,2,$4,$5,$6)", [user(i), i === 4 ? "group-2" : `group-2-element-${i}`, i === 4 ? "dangroup" : "danelemen", i === 4 ? null : i, `Komandan ${i}`, i === 4 ? 301 : i * 100 + 1]);
  await db.exec("insert into attendance_groups values (2, 'Komandan Grup 2')");
}, 30000);
afterAll(async () => { await db.close(); });
describe("Pilot database authorization and atomic recording", () => {
  it("persists SQL null for unselected members and rejects the removed placeholder status", async () => {
    await asUser(1, async () => {
      const rows: { participant_number: number; status: string | null; reason: string; revision: number }[] = entries();
      rows[0].status = null; await save(rows);
      expect((await db.query<{ status: string | null }>("select status from attendance_records where participant_number=101")).rows[0].status).toBeNull();
      const old = entries(1, 1); old[0].status = "Belum dicatat";
      await rejected(() => save(old), /check constraint/i);
    });
  });
  it("migrates old duty records while preserving reason, author, time and revision", async () => {
    const legacyDb = new PGlite();
    try {
      await legacyDb.exec(authBootstrap);
      await legacyDb.exec(await readFile("supabase/migrations/20261013113341_group_2_attendance.sql", "utf8"));
      await legacyDb.query("insert into auth.users values ($1)", [user(1)]);
      await legacyDb.exec("insert into attendance_members values (101,'Anggota',2,1)");
      await legacyDb.query("insert into attendance_profiles values ($1,'group-2-element-1','danelemen',2,1,'Komandan',101)", [user(1)]);
      await legacyDb.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${user(1)}',false);
        insert into attendance_sessions(date,kind,time) values ('2026-10-13','pagi','06:00');
        insert into attendance_records(session_id,participant_number,group_number,element_number,status,reason,recorded_by)
        select id,101,2,1,'Dinas Luar','Penugasan',auth.uid() from attendance_sessions; reset role;`);
      const before = (await legacyDb.query<Record<string, unknown>>("select * from attendance_records")).rows[0];
      await legacyDb.exec(await readFile("supabase/migrations/20261013120601_attendance_dinas_dalam.sql", "utf8"));
      const after = (await legacyDb.query<Record<string, unknown>>("select * from attendance_records")).rows[0];
      expect(after).toEqual({ ...before, status: "Dinas Dalam" });
      await legacyDb.exec("update attendance_records set status='Belum dicatat'");
      const pending = (await legacyDb.query<Record<string, unknown>>("select * from attendance_records")).rows[0];
      await legacyDb.exec(await readFile("supabase/migrations/20261013121143_attendance_nullable_status.sql", "utf8"));
      expect((await legacyDb.query<Record<string, unknown>>("select * from attendance_records")).rows[0]).toEqual({ ...pending, status: null });
    } finally { await legacyDb.close(); }
  });
  it("accepts Dinas Dalam and rejects the previous Dinas Luar status", async () => {
    await asUser(1, async () => {
      const rows = entries(); rows[0].status = "Dinas Dalam"; rows[0].reason = "Penugasan internal";
      await save(rows);
      expect((await db.query<{ status: string }>("select status from attendance_records where participant_number=101")).rows[0].status).toBe("Dinas Dalam");
      const old = entries(1, 1); old[0].status = "Dinas Luar"; old[0].reason = "Penugasan";
      await rejected(() => save(old), /check constraint/i);
    });
  });
  it.each([1,2,3,4])("limits commander %i to the correct roster", async i => {
    await asUser(i, async () => {
      const result = await db.query("select * from attendance_members");
      expect(result.rows).toHaveLength(i === 4 ? 90 : 30);
      expect((await db.query("select * from attendance_profiles")).rows).toHaveLength(1);
    });
  });
  it("denies anonymous access", async () => {
    await db.exec("begin; set local role anon");
    try { await expect(db.query("select * from attendance_members")).rejects.toThrow(/permission denied/i); } finally { await db.exec("rollback"); }
  });
  it("denies DanGrup recording and session creation", async () => {
    await asUser(4, async () => {
      await rejected(() => save(), /Only DanElemen/i);
      await rejected(() => db.exec("insert into attendance_sessions(date,kind,time) values ('2026-10-13','pagi','06:00')"), /row-level security/i);
    });
  });
  it("rejects another element's roster, duplicate members, incomplete and null entries", async () => {
    await asUser(1, async () => {
      await rejected(() => save(entries(2)), /outside element scope/i);
      const duplicate = entries(); duplicate[1] = duplicate[0];
      await rejected(() => save(duplicate), /duplicate member/i);
      await rejected(() => save(entries().slice(1)), /Complete element roster/i);
      await rejected(() => save(null), /Invalid entries/i);
    });
  });
  it("rolls back the whole save including session creation on invalid absence reasons", async () => {
    await asUser(1, async () => {
      const invalid = entries(); invalid[29].status = "Sakit";
      await rejected(() => save(invalid), /check constraint/i);
      expect((await db.query("select * from attendance_sessions")).rows).toHaveLength(0);
      expect((await db.query("select * from attendance_records")).rows).toHaveLength(0);
    });
  });
  it("uses one shared session across elements and preserves element boundaries", async () => {
    await asUser(1, async () => {
      const first = (await save()).rows[0].id;
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [user(2)]);
      expect((await save(entries(2))).rows[0].id).toBe(first);
      expect((await db.query("select * from attendance_records")).rows).toHaveLength(30);
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [user(4)]);
      expect((await db.query("select * from attendance_records")).rows).toHaveLength(60);
      expect((await db.query("select * from attendance_sessions")).rows).toHaveLength(1);
    });
  });
  it("rejects stale revisions without overwriting saved records", async () => {
    await asUser(1, async () => {
      await save();
      await rejected(() => save(), /Data changed/i);
      await save(entries(1, 1));
      const result = await db.query<{ revision: number; recorded_by: string }>("select revision,recorded_by from attendance_records");
      expect(result.rows.every(r => r.revision === 2 && r.recorded_by === user(1))).toBe(true);
    });
  });
  it("keeps morning, night and named incidental sessions separate", async () => {
    await asUser(1, async () => {
      await save(); await save(entries(), "malam"); await save(entries(), "insidental", " Latihan ");
      await save(entries(), "insidental", "Pengarahan");
      expect((await db.query("select * from attendance_sessions")).rows).toHaveLength(4);
      await rejected(() => save(entries(), "insidental", "LATIHAN"), /Data changed/i);
    });
  });
  it("rejects direct writes to another element and profile escalation", async () => {
    await asUser(1, async () => {
      const session = (await save()).rows[0].id;
      await rejected(() => db.query("insert into attendance_records(session_id,participant_number,group_number,element_number,status,recorded_by) values ($1,201,2,2,'Hadir',$2)", [session,user(1)]), /row-level security/i);
      await rejected(() => db.exec("update attendance_profiles set role='dangroup',element_number=null,unit='group-2'"), /permission denied/i);
      await rejected(() => db.query("select consume_pin_attempt('forged')"), /permission denied/i);
    });
  });
  it("limits login attempts atomically and permits only the server role", async () => {
    await db.exec("begin; set local role service_role");
    try {
      for (let n = 0; n < 20; n++) expect((await db.query<{ allowed: boolean }>("select consume_pin_attempt('test') as allowed")).rows[0].allowed).toBe(true);
      expect((await db.query<{ allowed: boolean }>("select consume_pin_attempt('test') as allowed")).rows[0].allowed).toBe(false);
    } finally { await db.exec("rollback"); }
  });
});
