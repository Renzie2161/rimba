import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getAccount } from "@/features/account/server";
import ProfileForm from "@/features/account/profile-form";
import styles from "@/features/account/profile.module.css";
import AccountUnavailable from "@/features/account/account-unavailable";

export const metadata = {
  title: "Edit profil · Rimba",
  robots: { index: false, follow: false },
};
export default async function EditProfilePage() {
  const account = await getAccount();
  if (!account) redirect("/id/login");
  if (account.unavailable) return <AccountUnavailable />;
  if (!account.profile?.username) redirect("/id/onboarding");
  return (
    <main className={styles.formPage} id="main">
      <Link className={styles.textLink} href="/profile">
        ← Kembali ke profil
      </Link>
      <h1>Edit profil</h1>
      <p>Perbarui cara kamu memperkenalkan diri kepada Rimba.</p>
      <ProfileForm profile={account.profile} now={account.checkedAt} />
    </main>
  );
}
