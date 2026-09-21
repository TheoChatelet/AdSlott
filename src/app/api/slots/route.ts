import { NextResponse } from "next/server";
import { getPublicSlots } from "@/lib/publicViews";

export async function GET() {
  const slots = await getPublicSlots();
  return NextResponse.json({ slots });
}
