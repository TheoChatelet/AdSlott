export class CsrfError extends Error {}

/**
 * Same-origin check for mutating API routes. We use cookie-based sessions
 * (SameSite=Lax) rather than CSRF tokens, so this is the defense-in-depth
 * layer against cross-site form/fetch submissions.
 */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    throw new CsrfError("Requête refusée (origine manquante)");
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new CsrfError("Requête refusée (origine invalide)");
  }

  if (originHost !== host) {
    throw new CsrfError("Requête refusée (origine invalide)");
  }
}
