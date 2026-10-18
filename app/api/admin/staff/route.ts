import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { staffCreateSchema } from "@/lib/schemas";
import { createStaff, listStaff } from "@/lib/store";

export async function GET() {
  const auth = await requireApiSession(["owner"]);
  if (auth.error) return auth.error;
  return NextResponse.json({ staff: await listStaff(auth.session.businessId) });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(["owner"]);
  if (auth.error) return auth.error;

  const parsed = staffCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid staff account" }, { status: 400 });

  const result = await createStaff(auth.session.businessId, auth.session.userId, parsed.data);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ user: result.user }, { status: 201 });
}
