import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth";
import { updateBranch } from "@/lib/store";

const schema = z.object({
  isOpen: z.boolean().optional(),
  name: z.string().trim().min(1).max(80).optional(),
  nameAr: z.string().trim().max(80).optional(),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(32).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional()
});

export async function PATCH(request: NextRequest) {
  const auth = await requireApiSession();
  if (auth.error) return auth.error;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) return NextResponse.json({ error: "Invalid update" }, { status: 400 });

  // Any staff member may open or close the shop; venue details are for owner and manager.
  const onlyOpenToggle = Object.keys(parsed.data).every((key) => key === "isOpen");
  if (!onlyOpenToggle && auth.session.role === "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const branch = await updateBranch(auth.session.businessId, parsed.data);
  if (!branch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ branch });
}
