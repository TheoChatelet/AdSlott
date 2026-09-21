import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

export async function NavBar() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          AdSlott
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <span title="Solde du portefeuille">
                💰 {(user.walletBalanceCents / 100).toFixed(2)} €
              </span>
              {user.isAdmin && (
                <Link href="/admin" className="underline hover:no-underline">
                  Admin
                </Link>
              )}
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="underline hover:no-underline">
                Connexion
              </Link>
              <Link href="/register" className="underline hover:no-underline">
                Inscription
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
