import { requireApiSession } from "@/lib/auth";
import { eventStream } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (auth.error) return auth.error;
  return eventStream(request, `business:${auth.session.businessId}`);
}
