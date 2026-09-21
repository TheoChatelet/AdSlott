import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { config } from "@/lib/config";

const BCRYPT_ROUNDS = 10;

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

export class AuthError extends Error {}

export async function registerUser(email: string, password: string) {
  const parsed = credentialsSchema.safeParse({ email, password });
  if (!parsed.success) {
    throw new AuthError(parsed.error.issues[0]?.message ?? "Entrée invalide");
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    throw new AuthError("Un compte existe déjà avec cet email");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      walletBalanceCents: config.startingWalletCents,
    },
  });
  return user;
}

export async function verifyCredentials(email: string, password: string) {
  const parsed = credentialsSchema.safeParse({ email, password });
  if (!parsed.success) {
    throw new AuthError(parsed.error.issues[0]?.message ?? "Entrée invalide");
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    throw new AuthError("Email ou mot de passe incorrect");
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    throw new AuthError("Email ou mot de passe incorrect");
  }

  return user;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    session.destroy();
    return null;
  }
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Authentification requise");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) {
    throw new AuthError("Accès administrateur requis");
  }
  return user;
}
