import Link from "next/link";
import type { PublicSlot } from "@/lib/publicViews";

interface SlotCardProps {
  slot: PublicSlot;
  onBid: () => void;
  isAuthenticated: boolean;
}

export function SlotCard({ slot, onBid, isAuthenticated }: SlotCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{slot.label}</h3>
        <span className="text-sm font-semibold">{(slot.currentPriceCents / 100).toFixed(2)} €</span>
      </div>

      <div className="flex min-h-20 flex-col justify-center rounded border border-dashed border-black/10 p-3 text-sm dark:border-white/10">
        {slot.currentAd ? (
          <>
            {slot.currentAd.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slot.currentAd.imageUrl} alt="" className="mb-2 max-h-24 w-full rounded object-cover" />
            )}
            <p className="font-medium">{slot.currentAd.text}</p>
            {slot.currentAd.link && (
              <a
                href={slot.currentAd.link}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-1 truncate text-xs text-blue-600 underline dark:text-blue-400"
              >
                {slot.currentAd.link}
              </a>
            )}
            <p className="mt-2 text-xs text-black/50 dark:text-white/50">par {slot.currentAd.advertiser}</p>
          </>
        ) : (
          <p className="text-black/40 dark:text-white/40">Aucune annonce pour l&apos;instant</p>
        )}
      </div>

      {isAuthenticated ? (
        <button
          onClick={onBid}
          className="rounded bg-black px-3 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          Enchérir
        </button>
      ) : (
        <Link
          href="/login"
          className="rounded border border-black/20 px-3 py-2 text-center text-sm dark:border-white/20"
        >
          Se connecter pour enchérir
        </Link>
      )}
    </div>
  );
}
