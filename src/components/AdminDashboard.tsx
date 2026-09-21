"use client";

import { useState } from "react";
import type { AdminSlotOverview } from "@/lib/adminViews";

interface DailyContentForm {
  type: "CHALLENGE" | "POLL";
  question: string;
  options: string[];
}

interface AdminDashboardProps {
  initialSlots: AdminSlotOverview[];
  initialContent: DailyContentForm | null;
}

export function AdminDashboard({ initialSlots, initialContent }: AdminDashboardProps) {
  const [slots, setSlots] = useState(initialSlots);
  const [form, setForm] = useState<DailyContentForm>(
    initialContent ?? { type: "POLL", question: "", options: ["", ""] }
  );
  const [contentStatus, setContentStatus] = useState<string | null>(null);

  async function refreshSlots() {
    const res = await fetch("/api/admin/slots", { cache: "no-store" });
    if (res.ok) setSlots((await res.json()).slots);
  }

  async function toggleAd(adId: string, hidden: boolean) {
    await fetch(`/api/admin/ads/${adId}/hide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden }),
    });
    refreshSlots();
  }

  async function saveDailyContent(event: React.FormEvent) {
    event.preventDefault();
    setContentStatus(null);

    const payload =
      form.type === "POLL"
        ? { type: "POLL", question: form.question, options: form.options.filter((o) => o.trim() !== "") }
        : { type: "CHALLENGE", question: form.question };

    const res = await fetch("/api/admin/daily-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setContentStatus("Enregistré.");
    } else {
      const data = await res.json().catch(() => null);
      setContentStatus(data?.error ?? "Erreur lors de l'enregistrement");
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8">
      <h1 className="text-2xl font-bold">Administration</h1>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Slots</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left dark:border-white/10">
                <th className="py-2 pr-4">Slot</th>
                <th className="py-2 pr-4">Prix actuel</th>
                <th className="py-2 pr-4">Annonce</th>
                <th className="py-2 pr-4">Enchères (jour)</th>
                <th className="py-2 pr-4">Revenu (jour)</th>
                <th className="py-2 pr-4">Record du jour</th>
                <th className="py-2 pr-4">Record historique</th>
                <th className="py-2 pr-4">Modération</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-2 pr-4">{slot.label}</td>
                  <td className="py-2 pr-4">{(slot.currentPriceCents / 100).toFixed(2)} €</td>
                  <td className="py-2 pr-4">
                    {slot.currentAd ? (
                      <span className={slot.currentAd.isHidden ? "text-red-600" : ""}>
                        {slot.currentAd.text} — {slot.currentAd.advertiser}
                        {slot.currentAd.isHidden && " (masquée)"}
                      </span>
                    ) : (
                      <span className="text-black/40 dark:text-white/40">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">{slot.today.bidCount}</td>
                  <td className="py-2 pr-4">{(slot.today.revenueCents / 100).toFixed(2)} €</td>
                  <td className="py-2 pr-4">{(slot.today.maxPriceCents / 100).toFixed(2)} €</td>
                  <td className="py-2 pr-4">{(slot.allTimeRecordCents / 100).toFixed(2)} €</td>
                  <td className="py-2 pr-4">
                    {slot.currentAd && (
                      <button
                        onClick={() => toggleAd(slot.currentAd!.id, !slot.currentAd!.isHidden)}
                        className="rounded border border-black/20 px-2 py-1 text-xs dark:border-white/20"
                      >
                        {slot.currentAd.isHidden ? "Réafficher" : "Masquer"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Contenu du jour</h2>
        <form onSubmit={saveDailyContent} className="flex max-w-lg flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm">Type</span>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as "CHALLENGE" | "POLL" })}
              className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
            >
              <option value="POLL">Sondage</option>
              <option value="CHALLENGE">Défi</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Question</span>
            <input
              type="text"
              required
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
            />
          </label>

          {form.type === "POLL" && (
            <div className="flex flex-col gap-2">
              <span className="text-sm">Options</span>
              {form.options.map((option, index) => (
                <input
                  key={index}
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const options = [...form.options];
                    options[index] = e.target.value;
                    setForm({ ...form, options });
                  }}
                  className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
                />
              ))}
              <button
                type="button"
                onClick={() => setForm({ ...form, options: [...form.options, ""] })}
                className="self-start text-xs underline"
              >
                + Ajouter une option
              </button>
            </div>
          )}

          {contentStatus && <p className="text-sm">{contentStatus}</p>}

          <button
            type="submit"
            className="self-start rounded bg-black px-3 py-2 text-sm text-white dark:bg-white dark:text-black"
          >
            Enregistrer
          </button>
        </form>
      </section>
    </main>
  );
}
