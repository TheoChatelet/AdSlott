import { NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth";
import { getAdminSlotsOverview } from "@/lib/adminViews";

export async function GET() {
  try {
    await requireAdmin();
    const slots = await getAdminSlotsOverview();
    return NextResponse.json({ slots });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error(err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
