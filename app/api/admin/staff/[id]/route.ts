import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { issueSession, requireApiSession } from "@/lib/auth";
import { staffUpdateSchema } from "@/lib/schemas";
import { findUserById, updateStaff } from "@/lib/store";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["owner"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = staffUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid update" }, { status: 400 });

  const result = await updateStaff(auth.session.businessId, auth.session.userId, id, parsed.data);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  // Changing your own password voids your session token; hand back a fresh one so you stay signed in.
  if (result.passwordChanged && id === auth.session.userId) {
    const fresh = await findUserById(id);
    if (fresh) await issueSession(fresh);
  }
  return NextResponse.json({ user: result.user });
}
