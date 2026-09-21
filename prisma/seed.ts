import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SLOT_START_PRICE_CENTS = Number.parseInt(process.env.SLOT_START_PRICE_CENTS ?? "100", 10);

function todayUtcDate(): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.RESET_TIMEZONE || "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return new Date(`${formatter.format(now)}T00:00:00.000Z`);
}

async function main() {
  const slots = [
    { position: 1, label: "Bandeau du haut" },
    { position: 2, label: "Carré principal" },
    { position: 3, label: "Barre latérale" },
    { position: 4, label: "Pied de page" },
  ];

  for (const slot of slots) {
    await prisma.slot.upsert({
      where: { position: slot.position },
      update: {},
      create: {
        ...slot,
        currentPriceCents: SLOT_START_PRICE_CENTS,
        lastResetDate: todayUtcDate(),
      },
    });
  }

  const adminEmail = "admin@adslott.local";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash("adminpassword", 10),
        isAdmin: true,
        walletBalanceCents: 100_000,
      },
    });
    console.log(`Created admin user: ${adminEmail} / adminpassword`);
  }

  const existingContent = await prisma.dailyContent.findUnique({ where: { date: todayUtcDate() } });
  if (!existingContent) {
    await prisma.dailyContent.create({
      data: {
        date: todayUtcDate(),
        type: "POLL",
        question: "Quel est ton langage de programmation préféré ?",
        options: ["TypeScript", "Python", "Rust", "Go"],
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
