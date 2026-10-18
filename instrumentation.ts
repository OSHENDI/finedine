// Runs once when the server starts: applies nothing to the schema (migrations run before start) but
// creates the first owner and the demo menu on an empty database, so the first visitor does not wait
// for it and a missing setting is reported in the log at boot instead of on the first request.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { initializeAndSeed } = await import("@/lib/store");
    await initializeAndSeed();
  } catch (error) {
    console.error("[finedine] startup check failed:", error instanceof Error ? error.message : error);
  }
}
