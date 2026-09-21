"use client";

import { useState } from "react";
import type { PublicDailyContent } from "@/lib/publicViews";

interface DailyContentPanelProps {
  content: PublicDailyContent;
  isAuthenticated: boolean;
  onVoted: (content: PublicDailyContent) => void;
}

export function DailyContentPanel({ content, isAuthenticated, onVoted }: DailyContentPanelProps) {
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!content) return null;

  async function vote(optionIndex: number) {
    setVoting(true);
    setError(null);
    const res = await fetch("/api/daily-content/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionIndex }),
    });
    setVoting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Erreur lors du vote");
      return;
    }

    const refreshed = await fetch("/api/daily-content", { cache: "no-store" });
    if (refreshed.ok) onVoted((await refreshed.json()).content);
  }

  const totalVotes = content.results?.reduce((sum, count) => sum + count, 0) ?? 0;

  return (
    <section className="rounded-lg border border-black/10 p-5 dark:border-white/10">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
        {content.type === "POLL" ? "Sondage du jour" : "Défi du jour"}
      </p>
      <h2 className="mb-4 text-xl font-semibold">{content.question}</h2>

      {content.type === "POLL" && content.options && (
        <div className="flex flex-col gap-2">
          {content.options.map((option, index) => {
            const count = content.results?.[index] ?? 0;
            const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isMine = content.myVote === index;

            return (
              <button
                key={option}
                onClick={() => isAuthenticated && vote(index)}
                disabled={!isAuthenticated || voting}
                className={`relative overflow-hidden rounded border px-3 py-2 text-left text-sm disabled:opacity-70 ${
                  isMine ? "border-black dark:border-white" : "border-black/20 dark:border-white/20"
                }`}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-black/5 dark:bg-white/10"
                  style={{ width: `${percent}%` }}
                />
                <div className="relative flex items-center justify-between">
                  <span>
                    {option} {isMine && "✓"}
                  </span>
                  <span className="text-black/50 dark:text-white/50">
                    {percent}% ({count})
                  </span>
                </div>
              </button>
            );
          })}
          {!isAuthenticated && (
            <p className="text-xs text-black/50 dark:text-white/50">Connectez-vous pour voter.</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </section>
  );
}
