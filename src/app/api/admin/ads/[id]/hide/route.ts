import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { assertSameOrigin, CsrfError } from "@/lib/csrf";

const bodySchema = z.object({ hidden: z.boolean() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await requireAdmin();

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }

    const ad = await prisma.ad.update({
      where: { id },
      data: { isHidden: parsed.data.hidden },
    });

    return NextResponse.json({ ad: { id: ad.id, isHidden: ad.isHidden } });
  } catch (err) {
    if (err instanceof CsrfError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error(err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
