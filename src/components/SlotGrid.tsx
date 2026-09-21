import type { PublicSlot } from "@/lib/publicViews";
import { SlotCard } from "@/components/SlotCard";

interface SlotGridProps {
  slots: PublicSlot[];
  onBid: (slot: PublicSlot) => void;
  isAuthenticated: boolean;
}

export function SlotGrid({ slots, onBid, isAuthenticated }: SlotGridProps) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Slots publicitaires</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {slots.map((slot) => (
          <SlotCard key={slot.id} slot={slot} onBid={() => onBid(slot)} isAuthenticated={isAuthenticated} />
        ))}
      </div>
    </section>
  );
}
