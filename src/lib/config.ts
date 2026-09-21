function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) {
    throw new Error(`Environment variable ${name} must be an integer, got "${raw}"`);
  }
  return value;
}

export const config = {
  slotStartPriceCents: intEnv("SLOT_START_PRICE_CENTS", 100),
  minBidIncrementCents: intEnv("MIN_BID_INCREMENT_CENTS", 50),
  startingWalletCents: intEnv("STARTING_WALLET_CENTS", 5000),
  resetTimezone: process.env.RESET_TIMEZONE || "Europe/Paris",
} as const;
