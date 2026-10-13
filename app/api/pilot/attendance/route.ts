import { apiError, checked, PilotError, requirePilot, requestBody, sameOrigin } from "../../../../src/server/pilot";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const { client, profile } = await requirePilot();
    const date = new URL(request.url).searchParams.get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new PilotError("Tanggal tidak valid.");
    const [membersResult, sessionsResult, commanderResult] = await Promise.all([
      client.from("attendance_members").select("*").order("participant_number"),
      client.from("attendance_sessions").select("*").eq("date", date).order("time"),
      client.rpc("attendance_commander"),
    ]);
    const members = checked(membersResult);
    const sessions = checked(sessionsResult);
    const ids = sessions.map(s => s.id);
    const records = ids.length ? checked(await client.from("attendance_records").select("*").in("session_id", ids)) : [];
    const commander = checked(commanderResult);
    return Response.json({ profile, members, sessions, records, commander }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { client, profile } = await requirePilot();
    if (profile.role !== "danelemen") throw new PilotError("Pencatatan hanya dilakukan DanElemen.", 403);
    const body = await requestBody(request);
    const data = checked(await client.rpc("save_element_attendance", { p_date: body.date, p_kind: body.kind, p_label: body.label || "", p_time: body.time, p_entries: body.entries }));
    return Response.json({ session_id: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
