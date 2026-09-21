import { getCurrentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { getPublicActivity, getPublicDailyContent, getPublicSlots } from "@/lib/publicViews";
import { HomeClient } from "@/components/HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  const [slots, activity, dailyContent] = await Promise.all([
    getPublicSlots(),
    getPublicActivity(),
    getPublicDailyContent(user?.id ?? null),
  ]);

  return (
    <HomeClient
      initialSlots={slots}
      initialActivity={activity}
      initialDailyContent={dailyContent}
      isAuthenticated={Boolean(user)}
      minBidIncrementCents={config.minBidIncrementCents}
    />
  );
}
