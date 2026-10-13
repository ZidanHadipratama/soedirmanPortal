export async function GET() {
  const pilot = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return Response.json({
    status: "ok",
    application: "soedirman-portal",
    mode: pilot ? "attendance-supabase-pilot" : "local-prototype",
    persistence: pilot ? "attendance-supabase; other-apps-browser-local" : "browser-local",
    authentication: pilot ? "attendance-pin; other-apps-role-simulation" : false,
    // Configuration presence is not a database-readiness check.
    databaseVerified: false,
  });
}
