import { redirect } from "next/navigation";
import { Leaf } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getAccount } from "@/features/account/server";
import { signInWithGoogle } from "@/features/account/actions";
import styles from "@/features/account/profile.module.css";
import AccountUnavailable from "@/features/account/account-unavailable";

export const metadata = {
  title: "Masuk ke Rimba",
  robots: { index: false, follow: false },
};
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const account = await getAccount();
  if (account?.unavailable) return <AccountUnavailable />;
  if (account)
    redirect(account.profile?.username ? "/id/profile" : "/id/onboarding");
  const { error } = await searchParams;
  return (
    <main id="main" className={styles.formPage}>
      <Leaf size={30} color="var(--brand-600)" aria-hidden="true" />
      <h1>Selamat datang di Rimba.</h1>
      <p>
        Satu akun untuk melanjutkan perjalananmu mengenal alam. Masuk atau
        daftar dengan akun Google, lalu pilih username milikmu.
      </p>
      {error ? (
        <p role="alert" className={styles.error}>
          Login Google belum berhasil. Coba lagi atau hubungi pengelola Rimba
          jika kendala berlanjut.
        </p>
      ) : null}
      <form action={signInWithGoogle}>
        <button className={styles.primary} type="submit">
          Lanjutkan dengan Google <span aria-hidden="true">↗</span>
        </button>
      </form>
      <p>
        Dengan melanjutkan, kamu menggunakan Google untuk memverifikasi akunmu.
        Rimba tidak meminta kata sandi Google.
      </p>
      <Link className={styles.textLink} href="/journal">
        Kembali menjelajah
      </Link>
    </main>
  );
}
