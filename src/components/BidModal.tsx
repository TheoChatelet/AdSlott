"use client";

import { useState, type FormEvent } from "react";
import type { PublicSlot } from "@/lib/publicViews";

interface BidModalProps {
  slot: PublicSlot;
  minBidIncrementCents: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function BidModal({ slot, minBidIncrementCents, onClose, onSuccess }: BidModalProps) {
  const minimumCents = slot.currentPriceCents + minBidIncrementCents;
  const [amount, setAmount] = useState((minimumCents / 100).toFixed(2));
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const amountCents = Math.round(Number.parseFloat(amount.replace(",", ".")) * 100);

    const res = await fetch(`/api/slots/${slot.id}/bid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents, text, link: link || undefined, imageUrl: imageUrl || undefined }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Erreur lors de l'enchère");
      return;
    }

    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-neutral-900">
        <h3 className="mb-1 text-lg font-semibold">Enchérir sur « {slot.label} »</h3>
        <p className="mb-4 text-sm text-black/60 dark:text-white/60">
          Prix actuel : {(slot.currentPriceCents / 100).toFixed(2)} € — minimum requis :{" "}
          {(minimumCents / 100).toFixed(2)} €
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm">Votre offre (€)</span>
            <input
              type="text"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Texte de l&apos;annonce</span>
            <input
              type="text"
              required
              maxLength={280}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Lien (optionnel)</span>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Image (optionnel, URL)</span>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-black/20 px-3 py-2 text-sm dark:border-white/20"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {loading ? "Envoi..." : "Confirmer l'enchère"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
