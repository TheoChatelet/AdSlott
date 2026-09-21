/**
 * Standalone script meant to be run by a scheduled system cron job at
 * midnight Europe/Paris (see README). Idempotent: safe to run multiple
 * times or to miss a run entirely, since `resetAllStaleSlots` is also
 * invoked lazily on the first `GET /api/slots` of the day.
 */
import { resetAllStaleSlots } from "../src/lib/slots";
import { prisma } from "../src/lib/prisma";

async function main() {
  const resetCount = await resetAllStaleSlots();
  console.log(`[daily-reset] ${new Date().toISOString()} — ${resetCount} slot(s) reset`);
}

main()
  .catch((err) => {
    console.error("[daily-reset] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
