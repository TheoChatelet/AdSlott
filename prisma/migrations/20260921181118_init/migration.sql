-- CreateEnum
CREATE TYPE "DailyContentType" AS ENUM ('CHALLENGE', 'POLL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "walletBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slot" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "currentPriceCents" INTEGER NOT NULL DEFAULT 100,
    "currentAdId" TEXT,
    "lastResetDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ad" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "link" TEXT,
    "imageUrl" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotDailyStat" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "maxPriceCents" INTEGER NOT NULL DEFAULT 0,
    "bidCount" INTEGER NOT NULL DEFAULT 0,
    "revenueCents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SlotDailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "adId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyContent" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "DailyContentType" NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB,

    CONSTRAINT "DailyContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollVote" (
    "id" TEXT NOT NULL,
    "dailyContentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optionIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Slot_position_key" ON "Slot"("position");

-- CreateIndex
CREATE UNIQUE INDEX "Slot_currentAdId_key" ON "Slot"("currentAdId");

-- CreateIndex
CREATE INDEX "Ad_slotId_createdAt_idx" ON "Ad"("slotId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SlotDailyStat_slotId_date_key" ON "SlotDailyStat"("slotId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_adId_key" ON "WalletTransaction"("adId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyContent_date_key" ON "DailyContent"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PollVote_dailyContentId_userId_key" ON "PollVote"("dailyContentId", "userId");

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_currentAdId_fkey" FOREIGN KEY ("currentAdId") REFERENCES "Ad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotDailyStat" ADD CONSTRAINT "SlotDailyStat_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_dailyContentId_fkey" FOREIGN KEY ("dailyContentId") REFERENCES "DailyContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enforce at the database level that a slot's price can never decrease
-- within the same day: a lower price is only allowed together with a
-- change of lastResetDate (i.e. the daily reset job).
CREATE OR REPLACE FUNCTION slot_price_never_decreases_within_day()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."lastResetDate" = OLD."lastResetDate" AND NEW."currentPriceCents" < OLD."currentPriceCents" THEN
    RAISE EXCEPTION 'Slot price cannot decrease within the same day (slot %, % -> %)', OLD.id, OLD."currentPriceCents", NEW."currentPriceCents";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER slot_price_never_decreases_within_day
BEFORE UPDATE ON "Slot"
FOR EACH ROW
EXECUTE FUNCTION slot_price_never_decreases_within_day();
