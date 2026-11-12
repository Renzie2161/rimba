import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccount, getAccountActivities } from "@/features/account/server";
import AccountUnavailable from "@/features/account/account-unavailable";
import ProfileContent from "@/features/account/profile-content";

export const metadata: Metadata = {
  title: "Profil saya · Rimba",
  robots: { index: false, follow: false },
};
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; saved?: string; error?: string }>;
}) {
  const account = await getAccount();
  if (!account) redirect("/id/login");
  if (account.unavailable) return <AccountUnavailable />;
  if (!account.profile?.username) redirect("/id/onboarding");
  const activityState = await getAccountActivities();
  return (
    <ProfileContent
      profile={account.profile}
      email={account.user.email ?? ""}
      activities={activityState.activities}
      activitiesUnavailable={activityState.unavailable}
      {...await searchParams}
    />
  );
}
