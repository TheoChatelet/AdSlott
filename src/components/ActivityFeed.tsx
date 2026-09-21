import type { PublicActivityEntry } from "@/lib/publicViews";

interface ActivityFeedProps {
  activity: PublicActivityEntry[];
}

export function ActivityFeed({ activity }: ActivityFeedProps) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Fil des enchères</h2>
      {activity.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">Aucune enchère pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {activity.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10"
            >
              <span>
                <strong>{entry.advertiser}</strong> a pris « {entry.slotLabel} » pour{" "}
                <strong>{(entry.priceCents / 100).toFixed(2)} €</strong>
              </span>
              <time className="text-xs text-black/50 dark:text-white/50">
                {new Date(entry.createdAt).toLocaleTimeString("fr-FR")}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
