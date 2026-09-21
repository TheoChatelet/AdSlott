import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPublicDailyContent } from "@/lib/publicViews";

export async function GET() {
  const user = await getCurrentUser();
  const content = await getPublicDailyContent(user?.id ?? null);
  return NextResponse.json({ content });
}
