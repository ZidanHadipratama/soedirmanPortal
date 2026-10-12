export async function GET() {
  return Response.json({
    status: "ok",
    application: "soedirman-portal",
    mode: "local-prototype",
    persistence: "browser-local",
    authentication: false,
  });
}
