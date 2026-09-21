import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAdminSlotsOverview } from "@/lib/adminViews";
import { prisma } from "@/lib/prisma";
import { currentDateKey, dateKeyToUtcDate } from "@/lib/date";
import { AdminDashboard } from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  const [slots, todayContent] = await Promise.all([
    getAdminSlotsOverview(),
    prisma.dailyContent.findUnique({ where: { date: dateKeyToUtcDate(currentDateKey()) } }),
  ]);

  return (
    <AdminDashboard
      initialSlots={slots}
      initialContent={
        todayContent
          ? {
              type: todayContent.type,
              question: todayContent.question,
              options: (todayContent.options as string[] | null) ?? [],
            }
          : null
      }
    />
  );
}
