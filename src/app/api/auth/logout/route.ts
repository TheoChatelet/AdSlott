import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { assertSameOrigin, CsrfError } from "@/lib/csrf";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getSession();
    session.destroy();
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CsrfError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error(err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
