import { NextResponse } from "next/server";
import { getPublicActivity } from "@/lib/publicViews";

export async function GET() {
  const activity = await getPublicActivity();
  return NextResponse.json({ activity });
}
