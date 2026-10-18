import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { categorySchema } from "@/lib/schemas";
import { createCategory } from "@/lib/store";

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(["owner", "manager"]);
  if (auth.error) return auth.error;

  const parsed = categorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the category name" }, { status: 400 });

  const category = await createCategory(auth.session.businessId, { nameEn: parsed.data.nameEn, nameAr: parsed.data.nameAr });
  if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id: category.id }, { status: 201 });
}
