import { redirect } from "next/navigation";
import { getAccount } from "@/features/account/server";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { profileSchema } from "@/features/account/schemas";
import ProfileForm from "@/features/account/profile-form";
import { signOut } from "@/features/account/actions";
import styles from "@/features/account/profile.module.css";
import AccountUnavailable from "@/features/account/account-unavailable";

export const metadata = {
  title: "Lengkapi profil · Rimba",
  robots: { index: false, follow: false },
};
export default async function OnboardingPage() {
  const account = await getAccount();
  if (!account) redirect("/id/login");
  if (account.unavailable) return <AccountUnavailable />;
  if (account.profile?.username) redirect("/id/profile");
  const client = await createAuthClient();
  const { data, error } = await client.rpc("ensure_my_account_profile");
  const profile = !error && data ? profileSchema.parse(data) : null;
  return (
    <main className={styles.formPage} id="main">
      <p className={styles.eyebrow}>AWAL PERJALANANMU</p>
      <h1>Bagaimana kami menyapamu?</h1>
      <p>
        Pilih username unik untuk melengkapi profil. Username wajib diisi
        sebelum kamu melanjutkan dan dapat diubah setiap 7 hari.
      </p>
      {profile ? (
        <ProfileForm profile={profile} onboarding now={account.checkedAt} />
      ) : (
        <p role="alert" className={styles.error}>
          Profil belum dapat dimuat. Muat ulang halaman atau hubungi pengelola
          Rimba.
        </p>
      )}
      <form action={signOut}>
        <button type="submit" className={styles.logout}>
          Keluar dari akun
        </button>
      </form>
    </main>
  );
}
