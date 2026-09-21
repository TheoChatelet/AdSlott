"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicActivityEntry, PublicDailyContent, PublicSlot } from "@/lib/publicViews";
import { SlotGrid } from "@/components/SlotGrid";
import { DailyContentPanel } from "@/components/DailyContentPanel";
import { ActivityFeed } from "@/components/ActivityFeed";
import { BidModal } from "@/components/BidModal";

const POLL_INTERVAL_MS = 5000;

interface HomeClientProps {
  initialSlots: PublicSlot[];
  initialActivity: PublicActivityEntry[];
  initialDailyContent: PublicDailyContent;
  isAuthenticated: boolean;
  minBidIncrementCents: number;
}

export function HomeClient({
  initialSlots,
  initialActivity,
  initialDailyContent,
  isAuthenticated,
  minBidIncrementCents,
}: HomeClientProps) {
  const [slots, setSlots] = useState(initialSlots);
  const [activity, setActivity] = useState(initialActivity);
  const [dailyContent, setDailyContent] = useState(initialDailyContent);
  const [bidSlot, setBidSlot] = useState<PublicSlot | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [slotsRes, activityRes] = await Promise.all([
        fetch("/api/slots", { cache: "no-store" }),
        fetch("/api/activity", { cache: "no-store" }),
      ]);
      if (slotsRes.ok) setSlots((await slotsRes.json()).slots);
      if (activityRes.ok) setActivity((await activityRes.json()).activity);
    } catch {
      // Transient network error: the next poll tick will retry.
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const king = slots.reduce<PublicSlot | null>((best, slot) => {
    if (!slot.currentAd) return best;
    if (!best || slot.currentPriceCents > best.currentPriceCents) return slot;
    return best;
  }, null);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
      {king && (
        <div className="rounded-lg border border-amber-400/60 bg-amber-50 px-4 py-3 text-sm dark:bg-amber-950/30">
          👑 Roi du jour : <strong>{king.currentAd?.advertiser}</strong> sur « {king.label} » à{" "}
          <strong>{(king.currentPriceCents / 100).toFixed(2)} €</strong>
        </div>
      )}

      <DailyContentPanel
        content={dailyContent}
        isAuthenticated={isAuthenticated}
        onVoted={(updated) => setDailyContent(updated)}
      />

      <SlotGrid slots={slots} onBid={(slot) => setBidSlot(slot)} isAuthenticated={isAuthenticated} />

      <ActivityFeed activity={activity} />

      {bidSlot && (
        <BidModal
          slot={bidSlot}
          minBidIncrementCents={minBidIncrementCents}
          onClose={() => setBidSlot(null)}
          onSuccess={() => {
            setBidSlot(null);
            refresh();
          }}
        />
      )}
    </main>
  );
}
