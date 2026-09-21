import { NextResponse } from "next/server";
import { AuthError, verifyCredentials } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { assertSameOrigin, CsrfError } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json().catch(() => null);
    if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }

    const rateLimitKey = `login:${body.email.toLowerCase()}`;
    const { allowed, retryAfterMs } = checkRateLimit(rateLimitKey, { limit: 10, windowMs: 60_000 });
    if (!allowed) {
      return NextResponse.json(
        { error: "Trop de tentatives, réessayez plus tard" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
      );
    }

    const user = await verifyCredentials(body.email, body.password);

    const session = await getSession();
    session.userId = user.id;
    await session.save();

    return NextResponse.json({ user: { id: user.id, email: user.email, isAdmin: user.isAdmin } });
  } catch (err) {
    if (err instanceof CsrfError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    console.error(err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
